import React, { useState } from 'react';
import { Download, Zap, Settings, Video, Layers, Settings2 } from 'lucide-react';
import clsx from 'clsx';

export default function ExportPanel() {
  const [resolution, setResolution] = useState('1080x1920');
  const [fps, setFps] = useState('60');
  const [format, setFormat] = useState('mp4');
  const [codec, setCodec] = useState('h264_nvenc');

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0d0d12] flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Download className="w-6 h-6 mr-3 text-brand-500" />
          Export Settings
        </h1>

        <div className="bg-[#141419] border border-[#262630] rounded-xl p-6 mb-6">
          <div className="flex items-start space-x-6">
            <div className="w-48 aspect-[9/16] bg-black rounded-lg border border-[#262630] flex items-center justify-center overflow-hidden">
              <Video className="w-8 h-8 text-white/20" />
            </div>
            
            <div className="flex-1 space-y-6">
              <div>
                <label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 block">File Name</label>
                <input type="text" defaultValue="My_Epic_Moments_Final" className="w-full bg-[#1f1f26] border border-[#262630] rounded-lg px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 block">Resolution</label>
                  <select value={resolution} onChange={e => setResolution(e.target.value)} className="w-full bg-[#1f1f26] border border-[#262630] rounded-lg px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none appearance-none cursor-pointer">
                    <option value="1080x1920">1080x1920 (9:16)</option>
                    <option value="1920x1080">1920x1080 (16:9)</option>
                    <option value="2160x3840">2160x3840 (4K 9:16)</option>
                    <option value="3840x2160">3840x2160 (4K 16:9)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 block">Frame Rate</label>
                  <select value={fps} onChange={e => setFps(e.target.value)} className="w-full bg-[#1f1f26] border border-[#262630] rounded-lg px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none appearance-none cursor-pointer">
                    <option value="24">24 FPS</option>
                    <option value="30">30 FPS</option>
                    <option value="60">60 FPS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 block">Format</label>
                  <select value={format} onChange={e => setFormat(e.target.value)} className="w-full bg-[#1f1f26] border border-[#262630] rounded-lg px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none appearance-none cursor-pointer">
                    <option value="mp4">MP4</option>
                    <option value="mov">MOV</option>
                    <option value="mkv">MKV</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 block">Video Codec</label>
                  <select value={codec} onChange={e => setCodec(e.target.value)} className="w-full bg-[#1f1f26] border border-[#262630] rounded-lg px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none appearance-none cursor-pointer">
                    <option value="h264_nvenc">H.264 (NVIDIA GPU)</option>
                    <option value="hevc_nvenc">H.265 (NVIDIA GPU)</option>
                    <option value="libx264">H.264 (Software)</option>
                    <option value="libx265">H.265 (Software)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#141419] border border-[#262630] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center"><Settings2 className="w-4 h-4 mr-2 text-brand-400" /> Advanced Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Hardware Acceleration</p>
                <p className="text-xs text-white/50">Use GPU for faster rendering</p>
              </div>
              <div className="w-10 h-6 bg-brand-500 rounded-full relative cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Export Audio</p>
                <p className="text-xs text-white/50">Include audio tracks in export</p>
              </div>
              <div className="w-10 h-6 bg-brand-500 rounded-full relative cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Export Subtitles</p>
                <p className="text-xs text-white/50">Burn subtitles into video</p>
              </div>
              <div className="w-10 h-6 bg-brand-500 rounded-full relative cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4">
           <button className="px-6 py-3 bg-[#1f1f26] hover:bg-[#262630] text-white rounded-lg text-sm font-medium transition-colors border border-[#262630]">
             Add to Queue
           </button>
           <button className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2">
             <Zap className="w-4 h-4" />
             <span>Export Video</span>
           </button>
        </div>
      </div>
    </div>
  );
}
