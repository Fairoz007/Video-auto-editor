import React, { useState } from 'react';
import { UploadCloud, Youtube, Instagram, Share2, Plus, Clock, PlayCircle } from 'lucide-react';

export default function UploadPanel() {
  const [platform, setPlatform] = useState('youtube');
  
  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0d0d12] flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center">
          <UploadCloud className="w-6 h-6 mr-3 text-brand-500" />
          Auto Upload System
        </h1>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div onClick={() => setPlatform('youtube')} className={`p-6 rounded-xl border cursor-pointer transition-all ${platform === 'youtube' ? 'bg-red-500/10 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-[#141419] border-[#262630] hover:border-white/20'}`}>
            <Youtube className={`w-8 h-8 mb-3 ${platform === 'youtube' ? 'text-red-500' : 'text-white/40'}`} />
            <h3 className="text-white font-medium">YouTube</h3>
            <p className="text-xs text-white/50 mt-1">Shorts & Long-form</p>
          </div>
          
          <div onClick={() => setPlatform('tiktok')} className={`p-6 rounded-xl border cursor-pointer transition-all ${platform === 'tiktok' ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-[#141419] border-[#262630] hover:border-white/20'}`}>
            <PlayCircle className={`w-8 h-8 mb-3 ${platform === 'tiktok' ? 'text-cyan-500' : 'text-white/40'}`} />
            <h3 className="text-white font-medium">TikTok</h3>
            <p className="text-xs text-white/50 mt-1">Direct upload via browser</p>
          </div>
          
          <div onClick={() => setPlatform('instagram')} className={`p-6 rounded-xl border cursor-pointer transition-all ${platform === 'instagram' ? 'bg-pink-500/10 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'bg-[#141419] border-[#262630] hover:border-white/20'}`}>
            <Instagram className={`w-8 h-8 mb-3 ${platform === 'instagram' ? 'text-pink-500' : 'text-white/40'}`} />
            <h3 className="text-white font-medium">Instagram Reels</h3>
            <p className="text-xs text-white/50 mt-1">Automated publishing</p>
          </div>
        </div>

        <div className="bg-[#141419] border border-[#262630] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Upload Details</h2>
          
          <div className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 block">Video Title</label>
              <input type="text" placeholder="Enter an engaging title..." className="w-full bg-[#1f1f26] border border-[#262630] rounded-lg px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none" />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 block">Description</label>
              <textarea rows={4} placeholder="Write your video description here..." className="w-full bg-[#1f1f26] border border-[#262630] rounded-lg px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none resize-none" />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 block">Tags (comma separated)</label>
              <input type="text" placeholder="gaming, epic moments, highlight" className="w-full bg-[#1f1f26] border border-[#262630] rounded-lg px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none" />
            </div>

            <div className="flex items-center space-x-6">
               <label className="flex items-center space-x-3 cursor-pointer">
                 <input type="radio" name="visibility" value="public" defaultChecked className="w-4 h-4 accent-brand-500" />
                 <span className="text-sm text-white">Public</span>
               </label>
               <label className="flex items-center space-x-3 cursor-pointer">
                 <input type="radio" name="visibility" value="unlisted" className="w-4 h-4 accent-brand-500" />
                 <span className="text-sm text-white">Unlisted</span>
               </label>
               <label className="flex items-center space-x-3 cursor-pointer">
                 <input type="radio" name="visibility" value="private" className="w-4 h-4 accent-brand-500" />
                 <span className="text-sm text-white">Private</span>
               </label>
            </div>

            <div className="pt-4 border-t border-[#262630] flex items-center justify-between">
               <button className="flex items-center space-x-2 text-sm text-white/60 hover:text-white transition-colors">
                 <Clock className="w-4 h-4" />
                 <span>Schedule Upload</span>
               </button>
               
               <button className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2">
                 <Share2 className="w-4 h-4" />
                 <span>Publish Now</span>
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
