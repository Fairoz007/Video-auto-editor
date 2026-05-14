import os
import sys
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from moviepy import VideoFileClip, ImageClip, CompositeVideoClip, vfx
from tqdm import tqdm

import argparse

# --- CONFIGURATION ---
INPUT_FOLDER = ""
OUTPUT_FOLDER = ""
TOP_TEXT_TEMPLATE = "Part {}"
BOTTOM_TEXT = "Five Smokes"
TARGET_RES = (1080, 1920) # Width, Height
FONT_PATH = r"C:\Windows\Fonts\impact.ttf" # Standard Windows Impact font
if not os.path.exists(FONT_PATH):
    FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf" # Fallback to Arial Bold

# ZOOM SETTINGS
ZOOM_START = 1.0
ZOOM_END = 1.10 # 10% zoom over the clip duration

def check_gpu():
    """Checks if NVIDIA GPU encoding is available."""
    try:
        # Try standard ffmpeg first, then fall back to moviepy's internal one if we can find it
        result = subprocess.run(["ffmpeg", "-encoders"], capture_output=True, text=True)
        return "h264_nvenc" in result.stdout
    except:
        # If standard ffmpeg fails, we just default to CPU to stay safe
        return False

USE_GPU = check_gpu()
print(f"GPU Acceleration (NVENC): {'ENABLED' if USE_GPU else 'DISABLED'}")

def create_text_image(text, width, height, font_size=120, color="#ffd000", stroke_color=(0, 0, 0), stroke_width=8):
    """Creates a transparent PNG with styled text using Pillow."""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype(FONT_PATH, font_size)
    except:
        font = ImageFont.load_default()

    # Calculate text position (centered horizontally, custom vertical)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    # Draw shadow/stroke
    draw.text((x, y), text, font=font, fill=color, 
              stroke_width=stroke_width, stroke_fill=stroke_color)
    
    return img

def apply_zoom(clip):
    """Applies a smooth zoom-in effect over the duration of the clip."""
    def zoom(t):
        return ZOOM_START + (ZOOM_END - ZOOM_START) * (t / clip.duration)
    return clip.resized(zoom)

def process_video(file_path, output_path, part_num):
    print(f"\nProcessing: {os.path.basename(file_path)} -> part{part_num}.mp4")
    
    # Load video
    clip = VideoFileClip(str(file_path))
    duration = clip.duration

    # 1. Initial Resize and Static Center Crop
    # Target height is 1920.
    clip_resized = clip.resized(height=1920)
    
    # Center crop to 1080x1920 (Static)
    x_center = clip_resized.w / 2
    clip_cropped = clip_resized.cropped(x1=x_center - 540, 
                                       y1=0, 
                                       x2=x_center + 540, 
                                       y2=1920)

    # 2. Add Smooth Zoom Effect (to the 1080x1920 clip)
    # This keeps the aspect ratio but zooms in on the vertical frame.
    clip_final = apply_zoom(clip_cropped)
    top_text = TOP_TEXT_TEMPLATE.format(part_num)
    top_img = create_text_image(top_text, 1080, 300, font_size=150)
    bottom_img = create_text_image(BOTTOM_TEXT, 1080, 300, font_size=130)
    
    top_path = f"temp_top_{part_num}.png"
    bottom_path = f"temp_bottom_{part_num}.png"
    top_img.save(top_path)
    bottom_img.save(bottom_path)
    
    top_clip = ImageClip(top_path).with_duration(duration).with_position(("center", 150))
    bottom_clip = ImageClip(bottom_path).with_duration(duration).with_position(("center", 1920 - 450))

    # 5. Composite
    final_video = CompositeVideoClip([clip_final, top_clip, bottom_clip])

    # 6. Export
    write_args = {
        "filename": output_path,
        "fps": 30,
        "audio_codec": "aac",
        "logger": "bar"
    }
    
    if USE_GPU:
        write_args["codec"] = "h264_nvenc"
        write_args["ffmpeg_params"] = ["-rc", "vbr", "-cq", "24", "-preset", "p4"]
    else:
        write_args["codec"] = "libx264"
        write_args["preset"] = "medium"

    final_video.write_videofile(**write_args)
    
    # Cleanup
    clip.close()
    final_video.close()
    if os.path.exists(top_path): os.remove(top_path)
    if os.path.exists(bottom_path): os.remove(bottom_path)

def main():
    parser = argparse.ArgumentParser(description="Autoedit Valorant Shorts")
    parser.add_argument("--input", type=str, required=True, help="Input folder containing the Valorant clips")
    parser.add_argument("--output", type=str, required=False, help="Output folder")
    parser.add_argument("--top_text", type=str, default="Part {}", help="Top text template")
    parser.add_argument("--bottom_text", type=str, default="Five Smokes", help="Bottom text")
    args = parser.parse_args()

    global INPUT_FOLDER, OUTPUT_FOLDER, TOP_TEXT_TEMPLATE, BOTTOM_TEXT
    INPUT_FOLDER = args.input
    OUTPUT_FOLDER = args.output if args.output else os.path.join(INPUT_FOLDER, "Shorts_Output")
    TOP_TEXT_TEMPLATE = args.top_text
    BOTTOM_TEXT = args.bottom_text

    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)

    # Get all mp4 files
    files = sorted([f for f in os.listdir(INPUT_FOLDER) if f.lower().endswith(".mp4")])
    
    if not files:
        print("No mp4 files found in the input folder.")
        return

    print(f"Found {len(files)} files to process.")
    
    for i, filename in enumerate(files, start=1):
        input_path = os.path.join(INPUT_FOLDER, filename)
        output_filename = f"part{i}.mp4"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        
        if os.path.exists(output_path):
            print(f"Skipping {output_filename} (already exists)")
            continue

        try:
            process_video(input_path, output_path, i)
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
