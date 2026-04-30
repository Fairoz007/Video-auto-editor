import os
import glob
import argparse
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont
import json
from moviepy import VideoFileClip
import imageio_ffmpeg

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

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    draw.text((x, y), text, font=font, fill=color, 
              stroke_width=stroke_width, stroke_fill=stroke_color)
    
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

def render_output(clips_info, width, height, title_img_path, output_folder, output_idx, target_duration):
    print(f"\n--- Rendering Output {output_idx} using GPU ---")
    output_path = os.path.join(output_folder, f"VALORANT SHORTS - {output_idx}.mp4")
    
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
        # Convert audio to standard sample rate to avoid concat mismatches
        filter_chains.append(f"[{i}:v]{scale_expr},{crop_expr},setpts=PTS-STARTPTS,format=yuv420p[v{i}];[{i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS[a{i}]")
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
    print(f"--- Finished Rendering Output {output_idx} ---\n")

def main():
    parser = argparse.ArgumentParser(description="Autoedit Videos")
    parser.add_argument("--title", type=str, required=True, help="Title overlay text")
    parser.add_argument("--seconds", type=float, required=True, help="Duration of final videos")
    parser.add_argument("--resolution", type=str, required=True, help="Resolution e.g. 1080x1920")
    args = parser.parse_args()

    width, height = map(int, args.resolution.lower().split('x'))
    target_duration = args.seconds
    title_text = args.title

    input_folder = "clip"
    output_folder = "OUTPUTY"

    os.makedirs(input_folder, exist_ok=True)
    os.makedirs(output_folder, exist_ok=True)

    video_files = []
    for ext in ["*.mp4", "*.mov", "*.avi", "*.mkv"]:
        video_files.extend(glob.glob(os.path.join(input_folder, ext)))
        video_files.extend(glob.glob(os.path.join(input_folder, ext.upper())))
    
    # Remove duplicates caused by case-insensitive filesystems (e.g. Windows)
    unique_files = {}
    for f in video_files:
        unique_files[os.path.normcase(f)] = f
    video_files = sorted(list(unique_files.values()))

    if not video_files:
        print(f"No videos found in {input_folder}/ directory.")
        return
        
    print(f"Found {len(video_files)} video files.")

    # Create Title Image file
    title_img_path = os.path.join(output_folder, "temp_title.png")
    create_text_image(title_text, width, int(height * 0.15), font_size=int(width * 0.08), output_path=title_img_path)
    
    output_idx = 1
    file_idx = 0
    clip_offset = 0.0
    
    while file_idx < len(video_files):
        current_clips = []
        current_duration = 0.0
        
        while current_duration < target_duration and file_idx < len(video_files):
            vid_path = video_files[file_idx]
            clip_duration = get_video_duration(vid_path)
            
            if clip_duration <= 0:
                file_idx += 1
                clip_offset = 0.0
                continue
                
            remaining_in_clip = clip_duration - clip_offset
            needed = target_duration - current_duration
            
            if remaining_in_clip >= needed:
                current_clips.append({"path": vid_path, "start": clip_offset, "end": clip_offset + needed})
                current_duration += needed
                clip_offset += needed
                
                if abs(clip_duration - clip_offset) < 0.1:
                    file_idx += 1
                    clip_offset = 0.0
            else:
                current_clips.append({"path": vid_path, "start": clip_offset, "end": clip_duration})
                current_duration += remaining_in_clip
                file_idx += 1
                clip_offset = 0.0
                
        if current_duration >= target_duration - 0.1: # Allow floating point tolerance
            render_output(current_clips, width, height, title_img_path, output_folder, output_idx, target_duration)
            output_idx += 1
        else:
            print(f"Not enough footage remaining for another {target_duration}s video. Skipping remaining {current_duration:.2f}s.")
            
    # Cleanup temp title
    if os.path.exists(title_img_path):
        os.remove(title_img_path)

if __name__ == "__main__":
    main()
