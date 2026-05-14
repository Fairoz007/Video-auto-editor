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

@app.post("/process-timeline")
async def process_timeline(data: str = Form(...)):
    payload = json.loads(data)
    job_id = str(uuid.uuid4())
    
    progress_updates[job_id] = {"status": "started", "progress": 0, "metadata_list": [], "active_renders": {}}
    
    async def render_task():
        try:
            update_job_status(job_id, status="processing", message="Initializing FFmpeg timeline...", progress=5)
            
            tracks = payload.get("tracks", [])
            res_str = payload.get("resolution", "1080x1920")
            width, height = map(int, res_str.split('x'))
            fps = payload.get("fps", 60)
            target_duration = payload.get("duration", 10)
            
            video_track = next((t for t in tracks if t["type"] == "video"), None)
            effect_track = next((t for t in tracks if t["type"] == "effect"), None)
            text_track = next((t for t in tracks if t["type"] == "text"), None)
            
            video_clips = sorted(video_track["clips"], key=lambda c: c["start"]) if video_track else []
            effect_clips = effect_track["clips"] if effect_track else []
            text_clips = text_track["clips"] if text_track else []
            
            # Find LUT
            lut_clip = next((c for c in effect_clips if c.get("lutPath")), None)
            lut_path = lut_clip["lutPath"] if lut_clip else None
            
            # Find Transition
            trans_clip = next((c for c in effect_clips if not c.get("lutPath")), None)
            transition = trans_clip["name"] if trans_clip else None
            # Map NLE transition names to FFmpeg xfade names
            trans_map = {"Cross Dissolve": "fade", "Dip to Black": "fadeblack", "Wipe": "wipeleft", "Slide": "slideleft", "Zoom": "zoomin", "Spin": "radial", "Glitch": "pixelize"}
            ff_trans = trans_map.get(transition, "fade") if transition else "fade"
            
            output_filename = f"export_{job_id[:8]}.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            
            inputs = []
            filter_chains = []
            
            v_streams = []
            a_streams = []
            
            has_gpu = check_gpu()
            
            if not video_clips:
                raise Exception("No video clips on timeline")
                
            update_job_status(job_id, status="processing", message="Building filtergraph...", progress=15)
            
            for i, c in enumerate(video_clips):
                inputs.extend([
                    "-ss", str(c["sourceStart"]),
                    "-t", str(c["duration"]),
                    "-i", c["sourceFile"]
                ])
                
                scale_expr = f"scale={width}:{height}:force_original_aspect_ratio=increase"
                crop_expr = f"crop={width}:{height}:(iw-{width})/2:(ih-{height})/2"
                lut_expr = ""
                if lut_path:
                    safe_lut_path = lut_path.replace("\\", "/").replace(":", "\\:")
                    lut_expr = f",lut3d=file='{safe_lut_path}'"
                    
                filter_chains.append(f"[{i}:v]{scale_expr},{crop_expr}{lut_expr},setpts=PTS-STARTPTS,format=yuv420p[v{i}];[{i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS[a{i}]")
                v_streams.append(f"[v{i}]")
                a_streams.append(f"[a{i}]")
                
            update_job_status(job_id, status="processing", message="Applying transitions...", progress=25)
            
            if len(video_clips) > 1 and transition:
                # Xfade chaining
                curr_v = v_streams[0]
                curr_a = a_streams[0]
                fade_dur = 1.0
                
                for i in range(1, len(video_clips)):
                    next_v = v_streams[i]
                    next_a = a_streams[i]
                    
                    # Offset is start of next clip
                    offset = video_clips[i]["start"]
                    
                    filter_chains.append(f"{curr_v}{next_v}xfade=transition={ff_trans}:duration={fade_dur}:offset={offset}[xv{i}];{curr_a}{next_a}acrossfade=d={fade_dur}[xa{i}]")
                    curr_v = f"[xv{i}]"
                    curr_a = f"[xa{i}]"
                
                final_v = curr_v
                final_a = curr_a
            else:
                concat_v = "".join(v_streams)
                concat_a = "".join(a_streams)
                filter_chains.append(f"{concat_v}concat=n={len(video_clips)}:v=1:a=0[conc_v]")
                filter_chains.append(f"{concat_a}concat=n={len(video_clips)}:v=0:a=1[conc_a]")
                final_v = "[conc_v]"
                final_a = "[conc_a]"
                
            update_job_status(job_id, status="processing", message="Applying text...", progress=35)
                
            # Text overlay (Drawtext)
            curr_v_text = final_v
            drawtext_filters = []
            for t_idx, txt in enumerate(text_clips):
                text_content = txt.get("text", "TEXT")
                safe_text = text_content.replace("'", "\\'").replace(":", "\\:")
                start_t = txt["start"]
                end_t = start_t + txt["duration"]
                
                font_file = FONT_PATH.replace("\\", "/")
                
                # Default drawtext values if color/stroke is not provided
                color = payload.get("textColor", "#FFFFFF").replace("#", "0x")
                stroke = payload.get("strokeColor", "#000000").replace("#", "0x")
                shadow = payload.get("textShadowColor", "#000000").replace("#", "0x")
                borderw = payload.get("strokeWidth", 4)
                
                dt = f"drawtext=fontfile='{font_file}':text='{safe_text}':fontcolor={color}:fontsize=120:x=(w-text_w)/2:y=(h-text_h)/2:bordercolor={stroke}:borderw={borderw}:shadowcolor={shadow}:shadowx=5:shadowy=5:enable='between(t,{start_t},{end_t})'"
                drawtext_filters.append(dt)
            
            if drawtext_filters:
                dt_chain = ",".join(drawtext_filters)
                filter_chains.append(f"{curr_v_text},{dt_chain}[outv]")
            else:
                filter_chains.append(f"{curr_v_text}copy[outv]")
                
            filter_chains.append(f"{final_a}copy[outa]")
                
            filter_complex = ";".join(filter_chains)
            
            cmd = [
                "ffmpeg", "-y",
                *inputs,
                "-filter_complex", filter_complex,
                "-map", "[outv]",
                "-map", "[outa]"
            ]
            
            if has_gpu:
                cmd.extend(["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "20", "-b:v", "10M"])
            else:
                cmd.extend(["-c:v", "libx264", "-preset", "fast", "-crf", "20"])
                
            cmd.extend(["-c:a", "aac", "-b:a", "192k", "-t", str(target_duration), output_path])
            
            update_job_status(job_id, status="processing", message="Rendering video...", progress=45)
            
            # Run ffmpeg
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Simple progress simulation since ffmpeg output parsing is complex
            import time
            start_time = time.time()
            render_duration = target_duration * 0.5 # rough estimate
            
            while process.returncode is None:
                elapsed = time.time() - start_time
                prog = min(95, 45 + int((elapsed / render_duration) * 50))
                update_job_status(job_id, progress=prog)
                await asyncio.sleep(1.0)
                if process.returncode is not None:
                    break
                    
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                print(stderr.decode())
                raise Exception(f"FFmpeg failed with code {process.returncode}")
                
            update_job_status(job_id, status="completed", progress=100, message="Export Successful!")
            
        except Exception as e:
            print(f"[ERROR] Process timeline failed: {str(e)}")
            update_job_status(job_id, status="error", message=str(e))
            
    asyncio.create_task(render_task())
    return {"status": "started", "job_id": job_id}

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
