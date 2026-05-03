import os
import subprocess
import asyncio
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

FONT_PATH = r"C:\Windows\Fonts\impact.ttf"
if not os.path.exists(FONT_PATH):
    FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf"

import threading

# Global progress storage and lock for thread safety
progress_updates = {}
state_lock = threading.Lock()
job_tasks = {}
cancelled_jobs = set()

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


def is_job_cancelled(job_id: str) -> bool:
    with state_lock:
        return job_id in cancelled_jobs


def register_job(job_id: str, message: str = "Queued"):
    update_job_status(
        job_id,
        status="queued",
        progress=0,
        metadata_list=[],
        active_renders={},
        message=message,
        created_at=datetime.utcnow().isoformat() + "Z",
        updated_at=datetime.utcnow().isoformat() + "Z",
    )


def touch_job(job_id: str):
    update_job_status(job_id, updated_at=datetime.utcnow().isoformat() + "Z")


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


class PresetConfig(BaseModel):
    name: str
    config: VideoConfig


class PresetsImportPayload(BaseModel):
    presets: dict

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
        if is_job_cancelled(target_id):
            update_job_status(target_id, status="cancelled", message="Job cancelled before start")
            return
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
            if is_job_cancelled(target_id):
                return
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
                if is_job_cancelled(target_id):
                    final_video.close()
                    seg_clip.close()
                    return
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

        if is_job_cancelled(target_id):
            update_job_status(target_id, status="cancelled", message="Job cancelled by user")
        else:
            update_job_status(job_id, status="completed", progress=100, message=f"Finished all {num_segments} parts FAST!")
        print(f"[LOG] Task {job_id} finished successfully")

    except Exception as e:
        print(f"[ERROR] Task {job_id} failed: {str(e)}")
        update_job_status(job_id, status="error", message=str(e))
    finally:
        touch_job(target_id)

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


@app.post("/upload-batch")
async def upload_batch(files: list[UploadFile] = File(...)):
    uploaded = []
    for file in files:
        job_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(await file.read())
        uploaded.append({"job_id": job_id, "file_path": file_path, "filename": file.filename})
    return {"count": len(uploaded), "items": uploaded}

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


@app.post("/process-async")
async def start_process_async(data: str = Form(...)):
    payload = json.loads(data)
    config = VideoConfig(**payload["config"])
    job_id = payload.get("job_id", str(uuid.uuid4()))
    file_path = payload["file_path"]

    register_job(job_id, message="Queued for background processing")
    with state_lock:
        cancelled_jobs.discard(job_id)

    task = asyncio.create_task(process_video_task(job_id, file_path, config))
    with state_lock:
        job_tasks[job_id] = task

    return {"status": "queued", "job_id": job_id}


@app.post("/process-batch-async")
async def process_batch_async(data: str = Form(...)):
    payload = json.loads(data)
    config = VideoConfig(**payload["config"])
    items = payload.get("items", [])
    if not items:
        raise HTTPException(status_code=400, detail="No uploaded items provided")

    batch_job_id = f"batch_{uuid.uuid4().hex[:8]}"
    register_job(batch_job_id, message=f"Batch queued: {len(items)} videos")

    async def runner():
        try:
            update_job_status(batch_job_id, status="processing", message="Batch processing started")
            for index, item in enumerate(items, start=1):
                if is_job_cancelled(batch_job_id):
                    update_job_status(batch_job_id, status="cancelled", message="Batch cancelled")
                    return
                sub_job_id = item.get("job_id", f"{batch_job_id}_{index}")
                await process_video_task(sub_job_id, item["file_path"], config, report_job_id=batch_job_id)
                update_job_status(
                    batch_job_id,
                    progress=int((index / len(items)) * 100),
                    message=f"Completed {index}/{len(items)} videos",
                )
            if not is_job_cancelled(batch_job_id):
                update_job_status(batch_job_id, status="completed", progress=100, message="Batch completed")
        except Exception as e:
            update_job_status(batch_job_id, status="error", message=str(e))
        finally:
            touch_job(batch_job_id)

    task = asyncio.create_task(runner())
    with state_lock:
        job_tasks[batch_job_id] = task
    return {"status": "queued", "job_id": batch_job_id}

@app.get("/status/{job_id}")
async def get_status(job_id: str):
    data = progress_updates.get(job_id, {"status": "not_found"})
    if data["status"] != "not_found":
        print(f"[LOG] Status check {job_id}: {data.get('status')} | Progress: {data.get('progress')}% | Metadata Count: {len(data.get('metadata_list', []))}")
    return data


def _read_presets():
    presets_path = os.path.join(BASE_DIR, "presets.json")
    if not os.path.exists(presets_path):
        return {}
    with open(presets_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_presets(data):
    presets_path = os.path.join(BASE_DIR, "presets.json")
    with open(presets_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "gpu_available": check_gpu(),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/outputs")
async def list_outputs():
    files = []
    for name in os.listdir(OUTPUT_DIR):
        path = os.path.join(OUTPUT_DIR, name)
        if os.path.isfile(path):
            stat = os.stat(path)
            files.append(
                {
                    "name": name,
                    "size_bytes": stat.st_size,
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "download_url": f"/outputs/{name}",
                }
            )
    files.sort(key=lambda f: f["modified_at"], reverse=True)
    return {"count": len(files), "files": files}


@app.get("/outputs/{filename}")
async def download_output(filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Output file not found")
    return FileResponse(path, filename=filename)


@app.delete("/outputs/{filename}")
async def delete_output(filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Output file not found")
    os.remove(path)
    return {"status": "deleted", "filename": filename}


@app.get("/presets")
async def list_presets():
    return _read_presets()


@app.post("/presets")
async def save_preset(payload: PresetConfig):
    presets = _read_presets()
    presets[payload.name] = payload.config.model_dump()
    _write_presets(presets)
    return {"status": "saved", "name": payload.name}


@app.delete("/presets/{name}")
async def delete_preset(name: str):
    presets = _read_presets()
    if name not in presets:
        raise HTTPException(status_code=404, detail="Preset not found")
    del presets[name]
    _write_presets(presets)
    return {"status": "deleted", "name": name}


@app.get("/presets/export")
async def export_presets():
    return {"presets": _read_presets()}


@app.post("/presets/import")
async def import_presets(payload: PresetsImportPayload):
    if not isinstance(payload.presets, dict):
        raise HTTPException(status_code=400, detail="Invalid presets payload")
    existing = _read_presets()
    existing.update(payload.presets)
    _write_presets(existing)
    return {"status": "imported", "count": len(payload.presets)}


@app.get("/jobs")
async def list_jobs():
    with state_lock:
        items = [{"job_id": job_id, **payload} for job_id, payload in progress_updates.items()]
    items.sort(key=lambda j: j.get("progress", 0), reverse=True)
    return {"count": len(items), "jobs": items}


@app.delete("/jobs/{job_id}")
async def clear_job(job_id: str):
    with state_lock:
        if job_id not in progress_updates:
            raise HTTPException(status_code=404, detail="Job not found")
        del progress_updates[job_id]
    return {"status": "deleted", "job_id": job_id}


@app.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    with state_lock:
        cancelled_jobs.add(job_id)
        if job_id in progress_updates:
            progress_updates[job_id]["status"] = "cancelled"
            progress_updates[job_id]["message"] = "Cancellation requested"
            progress_updates[job_id]["updated_at"] = datetime.utcnow().isoformat() + "Z"
        task = job_tasks.get(job_id)

    if task and not task.done():
        task.cancel()
    return {"status": "cancelling", "job_id": job_id}


@app.get("/analytics")
async def analytics():
    with state_lock:
        jobs = list(progress_updates.values())
    status_count = {}
    for job in jobs:
        s = job.get("status", "unknown")
        status_count[s] = status_count.get(s, 0) + 1

    videos = [f for f in os.listdir(OUTPUT_DIR) if f.lower().endswith(".mp4")]
    total_size = 0
    for name in videos:
        total_size += os.path.getsize(os.path.join(OUTPUT_DIR, name))

    return {
        "jobs_total": len(jobs),
        "jobs_by_status": status_count,
        "output_videos": len(videos),
        "output_size_mb": round(total_size / (1024 * 1024), 2),
    }


if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "UI not found. Add app/backend/static/index.html"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
