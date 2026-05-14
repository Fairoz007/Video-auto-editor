# 🎬 Video-Auto-Editor

![Video Auto Editor Banner](file:///Users/itdirector/.gemini/antigravity/brain/7c0df46c-e70e-4874-81c0-3871be95aaf7/artifacts/banner.png)

[![Python](https://img.shields.io/badge/Python-3.8+-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Accelerated-0078D4?style=for-the-badge&logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)

A high-performance, automated video editing and social media distribution pipeline. Transform raw clips into polished shorts, movies, and social-ready content with a single command.

---

## 🚀 Key Features

*   **⚡ Ultra-Fast Rendering**: Leverages NVIDIA GPU Acceleration (`h264_nvenc`) and multi-threaded CPU processing for lightning-fast exports.
*   **✂️ Intelligent Auto-Editing**: Automatically cuts, crops, and concatenates clips to hit target durations (perfect for TikTok/Shorts).
*   **✍️ Dynamic Overlays**: Styled text overlays with customizable fonts, colors, and strokes.
*   **🤖 Automated Distribution**: Integrated Playwright-based uploader for seamless social media publishing.
*   **🧠 AI Metadata**: Built-in scripts to generate engaging titles and descriptions.
*   **🌐 Modern Backend**: FastAPI-powered backend for programmatic control and integration.

---

## 🛠️ Tech Stack

- **Core Logic**: Python 3.x
- **Video Processing**: MoviePy, FFmpeg (via imageio-ffmpeg)
- **Automation**: Playwright (Node.js)
- **API Framework**: FastAPI
- **Image Processing**: Pillow (PIL)

---

## 📦 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Fairoz007/Video-auto-editor.git
cd Video-auto-editor
```

### 2. Python Setup
```bash
pip install -r requirements.txt
```
*(Note: Create a requirements.txt if it doesn't exist, including `moviepy`, `imageio-ffmpeg`, `Pillow`, `fastapi`, `uvicorn`)*

### 3. Node.js Setup
```bash
npm install
npx playwright install chromium
```

---

## 🎮 Usage

### 🎥 Auto-Editing Clips
Put your raw clips in the `clip/` folder and run:
```bash
python autoedit.py --seconds 60 --resolution 1080x1920 --title "MY EPIC MOMENTS"
```

### 📤 Automated Upload
Configure your credentials in `config.json` and run:
```bash
bash upload.sh
```

### 🖥️ Start the Backend
```bash
python run_app.py
```

---

## ⚙️ Configuration

- **`titles.txt`**: Add your custom titles (one per line) for randomized overlays.
- **`config.json`**: Setup your upload parameters and social media credentials.
- **`clip/`**: Your source footage directory.
- **`OUTPUTY/`**: Where the magic happens (exported videos).

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

---

## ⚖️ License

Distributed under the ISC License. See `LICENSE` for more information.

---
<p align="center">Made with ❤️ by Fairoz</p>