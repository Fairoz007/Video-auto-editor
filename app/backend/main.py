import os
import subprocess
import asyncio
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from moviepy import VideoFileClip, ImageClip, CompositeVideoClip
from PIL import Image, ImageDraw, ImageFont
import random
import json
import uuid
import tkinter as tk
from tkinter import filedialog
from proglog import ProgressBarLogger
import numpy as np

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ASSETS FOR GENERATION ---
AGENTS = ["Jett","Phoenix","Sage","Reyna","Sova","Cypher","Killjoy","Omen","Brimstone","Viper","Raze","Skye","Yoru","Astra","Fade","Harbor","Gekko","Deadlock","Clove","Iso","Neon","Chamber","Breach","KAY/O"]
MAPS = ["Ascent","Bind","Haven","Split","Lotus","Sunset","Pearl","Fracture","Icebox","Abyss"]
MOODS = ["clutch","aggressive","tactical","clean","chaotic","smart","calculated","sharp","explosive","disciplined"]
ACTIONS = ["entry push","site hold","retake plan","eco round surprise","operator angle","utility combo","lurker path","mid control","flank timing","post-plant setup"]
ADJS = ["legendary","precise","fearless","unstoppable","slick","creative","elite","rapid","dominant","brilliant"]



def generate_metadata_line(index=None):
    if index is None:
        index = random.randint(1, 10000)
    a = AGENTS[index % len(AGENTS)]
    m = MAPS[index % len(MAPS)]
    mood = MOODS[index % len(MOODS)]
    act = ACTIONS[index % len(ACTIONS)]
    adj = ADJS[index % len(ADJS)]
    
    title = f"Valorant {adj.upper()} {a} Moment on {m}"
    description = f"Valorant {adj} moment on {m}: {a} delivers a {mood} {act} with crisp aim, smart movement, and team-winning impact."
    return {
        "title": title,
        "description": description,
        "agent": a,
        "map": m,
        "mood": mood
    }

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

FONT_PATH = r"C:\Windows\Fonts\impact.ttf"
if not os.path.exists(FONT_PATH):
    FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf"

import threading

# Global progress storage and lock for thread safety
progress_updates = {}
state_lock = threading.Lock()

def update_job_status(job_id, **kwargs):
    with state_lock:
        if job_id not in progress_updates:
            progress_updates[job_id] = {
                "status": "unknown", 
                "progress": 0, 
                "metadata_list": [], 
                "active_renders": {},
                "message": ""
            }
        for key, value in kwargs.items():
            if key == "metadata_list" and isinstance(value, list):
                progress_updates[job_id]["metadata_list"].extend(value)
            else:
                progress_updates[job_id][key] = value
    print(f"[LOG] Job {job_id} updated: {list(kwargs.keys())}")


class VideoConfig(BaseModel):
    width: int
    height: int
    topText: str
    bottomText: str
    fontSize: int
    textColor: str
    strokeColor: str
    strokeWidth: int
    zoomStart: float
    zoomEnd: float
    fps: int
    useGpu: bool
    splitLength: float

def check_gpu():
    """Checks if NVIDIA GPU encoding is available."""
    try:
        result = subprocess.run(["ffmpeg", "-encoders"], capture_output=True, text=True)
        return "h264_nvenc" in result.stdout
    except:
        return False

def create_text_image(text, width, height, font_size=120, color="#ffd000", stroke_color="black", stroke_width=8):
    """Creates a transparent PNG with styled text using Pillow."""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype(FONT_PATH, font_size)
    except:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    draw.text((x, y), text, font=font, fill=color, 
              stroke_width=stroke_width, stroke_fill=stroke_color)
    
    return img

class MoviePyLogger(ProgressBarLogger):
    def __init__(self, job_id, segment_idx, report_job_id=None):
        super().__init__()
        self.job_id = job_id
        self.segment_idx = segment_idx
        self.target_id = report_job_id or job_id
        self.render_key = f"{job_id}_part{segment_idx}" if report_job_id else str(segment_idx)

    def callback(self, **changes):
        bars = self.state.get('bars')
        if bars and 't' in bars:
            t_bar = bars['t']
            if t_bar['total'] > 0:
                percentage = int((t_bar['index'] / t_bar['total']) * 100)
                # Thread-safe update from MoviePy thread
                with state_lock:
                    if self.target_id in progress_updates:
                        progress_updates[self.target_id].setdefault("active_renders", {})
                        progress_updates[self.target_id]["active_renders"][self.render_key] = percentage

async def process_video_task(job_id: str, input_path: str, config: VideoConfig, report_job_id: Optional[str] = None):
    target_id = report_job_id or job_id
    print(f"[LOG] Starting task {job_id}, reporting to {target_id}")
    try:
        # Initialize target_id fully before any segments start
        update_job_status(target_id, status="processing", message="Initializing pipeline...")
        update_job_status(job_id, status="loading", progress=5)
        
        # Load video
        clip = VideoFileClip(input_path)
        total_duration = clip.duration
        
        # Determine segments
        segment_length = config.splitLength if config.splitLength and config.splitLength > 0 else total_duration
        num_segments = int(total_duration // segment_length) + (1 if total_duration % segment_length > 5 else 0)
        if num_segments == 0: num_segments = 1

        semaphore = asyncio.Semaphore(2) # Process 2 segments at once for speed
        finished_count = 0

        async def process_segment(i):
            nonlocal finished_count
            start_t = i * segment_length
            end_t = min((i + 1) * segment_length, total_duration)
            
            if end_t - start_t < 2: 
                finished_count += 1
                return

            # Use a fresh clip handle for each segment to ensure thread safety
            seg_clip = VideoFileClip(input_path).subclipped(start_t, end_t)
            
            # 1. Resize and Crop
            clip_resized = seg_clip.resized(height=config.height)
            x_center = clip_resized.w / 2
            half_w = config.width / 2
            clip_cropped = clip_resized.cropped(x1=x_center - half_w, y1=0, x2=x_center + half_w, y2=config.height)

            # 2. Zoom Effect
            def apply_zoom(t):
                return config.zoomStart + (config.zoomEnd - config.zoomStart) * (t / seg_clip.duration)
            clip_zoomed = clip_cropped.resized(apply_zoom)

            # 3. Text Overlays (Memory-based, no disk I/O)
            display_top_text = config.topText.format(i + 1) if "{}" in config.topText else config.topText
            top_img = create_text_image(display_top_text, config.width, 300, config.fontSize, config.textColor, config.strokeColor, config.strokeWidth)
            bottom_img = create_text_image(config.bottomText, config.width, 300, int(config.fontSize * 0.8), config.textColor, config.strokeColor, config.strokeWidth)
            
            import numpy as np
            top_clip = ImageClip(np.array(top_img)).with_duration(seg_clip.duration).with_position(("center", 150))
            bottom_clip = ImageClip(np.array(bottom_img)).with_duration(seg_clip.duration).with_position(("center", config.height - 450))

            # 4. Composite
            final_video = CompositeVideoClip([clip_zoomed, top_clip, bottom_clip])

            # 5. Metadata
            meta = generate_metadata_line()
            tags = f"#valorant #shorts #{meta['agent'].lower().replace('/', '')} #{meta['map'].lower()} #{meta['mood'].lower()}"
            full_description = f"{meta['description']}\n\n{tags}"

            # 6. Export
            safe_title = "".join([c if c.isalnum() else "_" for c in meta['title']])
            output_filename = f"{safe_title}_part{i+1}.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            
            use_gpu = config.useGpu and check_gpu()
            write_args = {
                "filename": output_path,
                "fps": config.fps,
                "audio_codec": "aac",
                "threads": 4, # Lower per-task threads since we run tasks in parallel
                "logger": None
            }
            
            ffmpeg_meta = ["-metadata", f"description={full_description}"]

            if use_gpu:
                write_args["codec"] = "h264_nvenc"
                write_args["ffmpeg_params"] = ["-rc", "vbr", "-cq", "30", "-preset", "p1", "-tune", "ll"] + ffmpeg_meta
            else:
                write_args["codec"] = "libx264"
                write_args["preset"] = "ultrafast"
                write_args["ffmpeg_params"] = ffmpeg_meta

            # Real-time progress logger (report to target_id)
            segment_logger = MoviePyLogger(job_id, i + 1, report_job_id=report_job_id)
            write_args["logger"] = segment_logger

            async with semaphore:
                if "active_renders" not in progress_updates[target_id]:
                    progress_updates[target_id]["active_renders"] = {}
                # Use a unique key for active renders to avoid collisions in folder mode
                render_key = f"{job_id}_part{i+1}"
                progress_updates[target_id]["active_renders"][render_key] = 0
                
                print(f"[LOG] {job_id} rendering part {i+1}...")
                await asyncio.to_thread(final_video.write_videofile, **write_args)

            # Remove from active renders after completion
            if target_id in progress_updates and "active_renders" in progress_updates[target_id]:
                progress_updates[target_id]["active_renders"].pop(render_key, None)
                print(f"[LOG] {job_id} part {i+1} finished rendering")

            # Cleanup
            final_video.close()
            seg_clip.close()
            
            # Save metadata list for UI (report to target_id)
            if target_id in progress_updates:
                if "metadata_list" not in progress_updates[target_id]:
                    progress_updates[target_id]["metadata_list"] = []
                progress_updates[target_id]["metadata_list"].append(meta)
                print(f"[LOG] Added metadata to {target_id}. List size: {len(progress_updates[target_id]['metadata_list'])}")

            # Save sidecar txt
            meta_path = os.path.join(OUTPUT_DIR, f"{safe_title}_part{i+1}.txt")
            with open(meta_path, "w", encoding="utf-8") as f:
                f.write(f"TITLE: {meta['title']}\n")
                f.write(f"DESCRIPTION: {meta['description']}\n")
                f.write(f"HASHTAGS: {tags}\n")

            finished_count += 1
            progress_updates[job_id]["progress"] = int((finished_count / num_segments) * 90) + 5

        # Run all segments in parallel (limited by semaphore)
        tasks = [process_segment(i) for i in range(num_segments)]
        await asyncio.gather(*tasks)

        # Final Cleanup
        clip.close()
        
        update_job_status(job_id, status="completed", progress=100, message=f"Finished all {num_segments} parts FAST!")
        print(f"[LOG] Task {job_id} finished successfully")

    except Exception as e:
        print(f"[ERROR] Task {job_id} failed: {str(e)}")
        update_job_status(job_id, status="error", message=str(e))

@app.get("/select-folder")
async def select_folder():
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    folder_path = filedialog.askdirectory()
    root.destroy()
    return {"folder_path": folder_path}

@app.post("/process-folder")
async def process_folder(folder_path: str = Form(...), data: str = Form(...)):
    if not os.path.isdir(folder_path):
        return {"status": "error", "message": "Invalid folder path"}
    
    payload = json.loads(data)
    config = VideoConfig(**payload["config"])
    
    videos = [f for f in os.listdir(folder_path) if f.lower().endswith(".mp4")]
    
    job_id = f"folder_{uuid.uuid4().hex[:8]}"
    progress_updates[job_id] = {
        "status": "started", 
        "progress": 0, 
        "message": f"Found {len(videos)} videos",
        "metadata_list": [],
        "active_renders": {}
    }

    async def folder_task():
        for i, video in enumerate(videos):
            video_path = os.path.join(folder_path, video)
            sub_job_id = f"{job_id}_{i}"
            
            # Now passing job_id as report_job_id so all sub-tasks report to the main folder job
            await process_video_task(sub_job_id, video_path, config, report_job_id=job_id)
            
            progress_updates[job_id]["progress"] = int(((i + 1) / len(videos)) * 100)
            progress_updates[job_id]["message"] = f"Processed {i+1}/{len(videos)} videos"
        progress_updates[job_id]["status"] = "completed"

    await folder_task()
    return {"status": "completed", "job_id": job_id}

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(await file.read())
    return {"job_id": job_id, "file_path": file_path}

@app.post("/process")
async def start_process(data: str = Form(...)):
    payload = json.loads(data)
    config = VideoConfig(**payload["config"])
    job_id = payload.get("job_id", str(uuid.uuid4()))
    file_path = payload["file_path"]
    
    if job_id not in progress_updates:
        progress_updates[job_id] = {"status": "started", "progress": 0, "metadata_list": [], "active_renders": {}}
    
    report_job_id = payload.get("config", {}).get("report_job_id")
    await process_video_task(job_id, file_path, config, report_job_id)
    return {"status": "completed", "job_id": job_id}

@app.get("/status/{job_id}")
async def get_status(job_id: str):
    data = progress_updates.get(job_id, {"status": "not_found"})
    if data["status"] != "not_found":
        print(f"[LOG] Status check {job_id}: {data.get('status')} | Progress: {data.get('progress')}% | Metadata Count: {len(data.get('metadata_list', []))}")
    return data

from scenedetect import detect, AdaptiveDetector, split_video_ffmpeg
import whisper

# Initialize Whisper model (load on demand or at startup)
model = None

def get_whisper_model():
    global model
    if model is None:
        print("[LOG] Loading Whisper model...")
        model = whisper.load_model("base")
    return model

@app.post("/detect-scenes")
async def detect_scenes(file_path: str = Form(...)):
    print(f"[LOG] Detecting scenes for: {file_path}")
    try:
        scene_list = detect(file_path, AdaptiveDetector())
        scenes = []
        for i, scene in enumerate(scene_list):
            scenes.append({
                "index": i,
                "start": scene[0].get_seconds(),
                "end": scene[1].get_seconds(),
                "duration": scene[1].get_seconds() - scene[0].get_seconds()
            })
        return {"status": "success", "scenes": scenes}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/transcribe")
async def transcribe_video(file_path: str = Form(...)):
    print(f"[LOG] Transcribing: {file_path}")
    try:
        w_model = get_whisper_model()
        result = w_model.transcribe(file_path)
        return {"status": "success", "text": result["text"], "segments": result["segments"]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    # Change port if needed or use environment variable
    uvicorn.run(app, host="0.0.0.0", port=8000)
