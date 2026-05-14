import os
import glob
import argparse
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont
import json
from moviepy import VideoFileClip
import imageio_ffmpeg
import random

PROGRESS_FILE = os.path.join("OUTPUTY", "editing_progress.json")

def save_progress(vid_path, clip_offset, part_number, output_idx):
    """Saves the current progress to a JSON file."""
    data = {
        "vid_path": vid_path,
        "clip_offset": clip_offset,
        "part_number": part_number,
        "output_idx": output_idx
    }
    try:
        with open(PROGRESS_FILE, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Warning: Could not save progress: {e}")

def load_progress():
    """Loads the progress from the JSON file if it exists."""
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load progress file: {e}")
    return None

def get_ffmpeg_path():
    return imageio_ffmpeg.get_ffmpeg_exe()

def get_video_duration(file_path):
    """Gets the duration of a video file using MoviePy to avoid missing ffprobe errors."""
    try:
        clip = VideoFileClip(file_path)
        dur = clip.duration
        clip.close()
        return dur
    except Exception as e:
        print(f"Error reading duration for {file_path}: {e}")
        return 0.0

def create_text_image(text, width, height, font_size=80, color="#ffd000", stroke_color="black", stroke_width=4, output_path="title.png"):
    """Creates a transparent PNG with styled text using Pillow."""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    font_path = r"C:\Windows\Fonts\impact.ttf"
    if not os.path.exists(font_path):
        font_path = r"C:\Windows\Fonts\arialbd.ttf"
        
    try:
        font = ImageFont.truetype(font_path, font_size)
    except:
        font = ImageFont.load_default()

    words = text.split()
    if len(words) > 3:
        display_text = " ".join(words[:len(words)//2]) + "\n" + " ".join(words[len(words)//2:])
    else:
        display_text = text

    bbox = draw.textbbox((0, 0), display_text, font=font, align="center")
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    draw.text((x, y), display_text, font=font, fill=color, 
              stroke_width=stroke_width, stroke_fill=stroke_color, align="center")
    
    img.save(output_path)
    return output_path

def check_gpu():
    """Checks if NVIDIA GPU encoding is available."""
    try:
        ffmpeg_exe = get_ffmpeg_path()
        result = subprocess.run([ffmpeg_exe, "-encoders"], capture_output=True, text=True)
        return "h264_nvenc" in result.stdout
    except:
        return False

def render_output(clips_info, width, height, title_text, title_img_path, output_folder, output_idx, target_duration, bass_boost=False):
    print(f"\n--- Rendering Output {output_idx} using GPU ---")
    safe_title = "".join(c for c in title_text if c not in r'<>:"/\|?*').strip()
    output_path = os.path.join(output_folder, f"{safe_title}.mp4")
    
    inputs = []
    filter_chains = []
    concat_v = ""
    concat_a = ""
    
    for i, c in enumerate(clips_info):
        # Adding inputs with hardware acceleration. Using massive thread count and memory limits to utilize RAM/GPU
        inputs.extend([
            "-hwaccel", "cuda", 
            "-ss", str(c["start"]), 
            "-t", str(c["end"] - c["start"]), 
            "-i", c["path"]
        ])
        
        # Scale to cover target area and crop to exact dimensions, resetting timestamps
        scale_expr = f"scale={width}:{height}:force_original_aspect_ratio=increase"
        crop_expr = f"crop={width}:{height}:(iw-{width})/2:(ih-{height})/2"
        # Convert audio to standard sample rate to avoid concat mismatches and apply bass boost if requested
        audio_filters = "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS"
        if bass_boost:
            # Boost low frequencies (60Hz) by 10dB and normalize volume slightly to prevent clipping
            audio_filters += ",equalizer=f=60:width_type=h:w=50:g=10,volume=0.9"
            
        filter_chains.append(f"[{i}:v]{scale_expr},{crop_expr},setpts=PTS-STARTPTS,format=yuv420p[v{i}];[{i}:a]{audio_filters}[a{i}]")
        concat_v += f"[v{i}][a{i}]"
        
    # Add the title overlay image
    inputs.extend(["-i", title_img_path])
    title_idx = len(clips_info)
    
    # Concatenate all videos and audio
    filter_chains.append(f"{concat_v}concat=n={len(clips_info)}:v=1:a=1[conc_v][outa]")
    
    # Overlay the title
    filter_chains.append(f"[conc_v][{title_idx}:v]overlay=(W-w)/2:{int(height*0.05)}[outv]")
    
    filter_complex = ";".join(filter_chains)
    
    has_gpu = check_gpu()
    
    cmd = [
        get_ffmpeg_path(), "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-map", "[outa]",
    ]
    
    # Maximize RAM and GPU usage for ultra-fast rendering
    if has_gpu:
        cmd.extend([
            "-c:v", "h264_nvenc", 
            "-preset", "p6",      # p6 is slower but extremely high quality. p7 is max.
            "-tune", "hq", 
            "-cq", "14",          # Extremely high quality
            "-bufsize", "30000k", # Large buffer for heavy RAM/GPU usage
            "-maxrate", "50000k"
        ])
    else:
        cmd.extend([
            "-c:v", "libx264", 
            "-preset", "ultrafast", 
            "-crf", "14",
            "-threads", "32"      # Blast it with CPU threads
        ])
        
    cmd.extend([
        "-c:a", "aac", "-b:a", "320k",
        "-t", str(target_duration), # Enforce exact cut
        output_path
    ])
    
    print("Executing FFMPEG command...")
    subprocess.run(cmd)
    print(f"--- Finished Rendering {safe_title} ---\n")

def parse_time_to_seconds(time_str):
    if ':' in time_str:
        parts = time_str.split(':')
        parts = [float(p) for p in parts]
        if len(parts) == 2: # MM:SS
            return parts[0] * 60 + parts[1]
        elif len(parts) == 3: # HH:MM:SS
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return float(time_str)

def main():
    parser = argparse.ArgumentParser(description="Autoedit Movies into Parts")
    parser.add_argument("--title", type=str, required=False, default="Movie Name", help="Base title overlay text")
    parser.add_argument("--seconds", type=float, required=True, help="Duration of final videos (e.g. 60)")
    parser.add_argument("--resolution", type=str, required=True, help="Resolution e.g. 1080x1920")
    parser.add_argument("--start", type=str, required=False, default="0", help="Start timestamp to begin cutting from (e.g. '10:00', '1:30:00', or '600')")
    parser.add_argument("--resume", action="store_true", help="Resume from the last stopped edit")
    parser.add_argument("--bass", action="store_true", help="Enable bass boost to help avoid copyright issues")
    parser.add_argument("--part", type=int, required=False, default=0, help="Part number to start from (e.g. if you say 140, it starts from 141)")
    parser.add_argument("--input", type=str, required=False, default="Movies", help="Input folder or file")
    args = parser.parse_args()

    width, height = map(int, args.resolution.lower().split('x'))
    target_duration = args.seconds
    base_title_text = args.title
    start_seconds = parse_time_to_seconds(args.start)

    input_path = args.input
    output_folder = "OUTPUTY"

    os.makedirs(output_folder, exist_ok=True)

    video_files = []
    if os.path.isfile(input_path):
        video_files.append(input_path)
    else:
        os.makedirs(input_path, exist_ok=True)
        for ext in ["*.mp4", "*.mov", "*.avi", "*.mkv"]:
            video_files.extend(glob.glob(os.path.join(input_path, ext)))
            video_files.extend(glob.glob(os.path.join(input_path, ext.upper())))
    
    # Remove duplicates caused by case-insensitive filesystems
    unique_files = {}
    for f in video_files:
        unique_files[os.path.normcase(f)] = f
    video_files = sorted(list(unique_files.values()))

    if not video_files:
        print(f"No videos found in {input_path}/ directory. Please add full movie files there.")
        return
        
    print(f"Found {len(video_files)} movie files.")

    output_idx = 1
    resume_data = None
    if args.resume:
        resume_data = load_progress()
        if resume_data:
            print(f"--- Resuming from Part {resume_data['part_number']} of {os.path.basename(resume_data['vid_path'])} ---")
            output_idx = resume_data['output_idx']

    found_resume_vid = False if resume_data else True
    global_part_counter = 0
    
    for vid_path in video_files:
        # Skip videos until we reach the one we were processing
        if not found_resume_vid:
            if os.path.normcase(vid_path) == os.path.normcase(resume_data['vid_path']):
                found_resume_vid = True
            else:
                continue

        print(f"Processing Movie: {vid_path}")
        clip_duration = get_video_duration(vid_path)
        if clip_duration <= 0:
            print("Could not read duration, skipping...")
            continue
            
        clip_offset = start_seconds
        part_number = 1
        
        # Optimization: Skip whole video if all its parts are already covered by --part
        potential_parts = int((clip_duration - clip_offset) // target_duration)
        if not resume_data and args.part > 0 and (global_part_counter + potential_parts) <= args.part:
            global_part_counter += potential_parts
            output_idx += potential_parts
            print(f"Skipping {os.path.basename(vid_path)} (parts {global_part_counter - potential_parts + 1} to {global_part_counter} already skipped)")
            continue

        movie_base_name = os.path.splitext(os.path.basename(vid_path))[0]
        
        while clip_offset + target_duration <= clip_duration:
            global_part_counter += 1
            
            # Skip parts until we reach the specific offset from resume data
            if resume_data and os.path.normcase(vid_path) == os.path.normcase(resume_data['vid_path']):
                if clip_offset < resume_data['clip_offset'] - 0.1: # Small epsilon for float comparison
                    clip_offset += target_duration
                    part_number += 1
                    continue
            
            # Manual skip by part number (only if not resuming)
            if not resume_data and args.part > 0 and global_part_counter <= args.part:
                clip_offset += target_duration
                part_number += 1
                output_idx += 1
                continue
            
            current_clips = [{"path": vid_path, "start": clip_offset, "end": clip_offset + target_duration}]
            
            # The text that actually appears inside the video
            overlay_text = f"Part {part_number}"
            
            # The name of the file output
            file_title = f"{base_title_text} Part {part_number}"
            
            title_img_path = os.path.join(output_folder, f"temp_title_{output_idx}.png")
            # Create text image with the overlay text (just "Part X"), with a slightly larger font since it's short
            create_text_image(overlay_text, width, int(height * 0.25), font_size=int(width * 0.12), output_path=title_img_path)
            
            render_output(current_clips, width, height, file_title, title_img_path, output_folder, output_idx, target_duration, bass_boost=args.bass)
            
            if os.path.exists(title_img_path):
                os.remove(title_img_path)
            
            # Save progress after each successful render
            save_progress(vid_path, clip_offset + target_duration, part_number + 1, output_idx + 1)

            output_idx += 1
            part_number += 1
            clip_offset += target_duration

        print(f"Finished cutting {movie_base_name} into {part_number - 1} parts.")
    
    # Clean up progress file when everything is finished
    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)

if __name__ == "__main__":
    main()
