import React from 'react';
import { Activity, HardDrive, Cpu, Clock, FileVideo, Download } from 'lucide-react';

export default function DashboardPanel({ sysStats }: { sysStats: { cpu: number, ram: number, totalRam: number } }) {
  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0d0d12]">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      
      {/* Top Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1f1f26] border border-[#262630] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 uppercase tracking-wider">CPU Usage</span>
            <Cpu className="w-4 h-4 text-brand-400" />
          </div>
          <span className="text-2xl font-semibold text-white">{sysStats.cpu.toFixed(1)}%</span>
          <div className="w-full h-1 mt-3 bg-[#0d0d12] rounded-full overflow-hidden">
            <div className="h-full bg-brand-500" style={{ width: `${sysStats.cpu}%` }}></div>
          </div>
        </div>

        <div className="bg-[#1f1f26] border border-[#262630] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 uppercase tracking-wider">RAM Usage</span>
            <Activity className="w-4 h-4 text-success-500" />
          </div>
          <span className="text-2xl font-semibold text-white">{sysStats.ram.toFixed(1)}GB <span className="text-sm text-white/40">/ {sysStats.totalRam.toFixed(1)}GB</span></span>
          <div className="w-full h-1 mt-3 bg-[#0d0d12] rounded-full overflow-hidden">
            <div className="h-full bg-success-500" style={{ width: `${(sysStats.ram / sysStats.totalRam) * 100}%` }}></div>
          </div>
        </div>

        <div className="bg-[#1f1f26] border border-[#262630] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 uppercase tracking-wider">Storage</span>
            <HardDrive className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-semibold text-white">45% <span className="text-sm text-white/40">Used</span></span>
          <div className="w-full h-1 mt-3 bg-[#0d0d12] rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: '45%' }}></div>
          </div>
        </div>

        <div className="bg-[#1f1f26] border border-[#262630] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 uppercase tracking-wider">Projects Rendered</span>
            <FileVideo className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-semibold text-white">128</span>
          <div className="text-xs text-purple-400 mt-2">+12 this week</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="bg-[#141419] border border-[#262630] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center"><Clock className="w-5 h-5 mr-2 text-brand-500" /> Recent Projects</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#1f1f26] hover:bg-[#262630] cursor-pointer transition-colors border border-transparent hover:border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded bg-brand-900/30 flex items-center justify-center border border-brand-500/20">
                    <FileVideo className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Project_00{i}_Final</h3>
                    <p className="text-xs text-white/40">Edited 2 hours ago</p>
                  </div>
                </div>
                <div className="text-xs font-mono text-white/30">00:04:23</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Exports */}
        <div className="bg-[#141419] border border-[#262630] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center"><Download className="w-5 h-5 mr-2 text-success-500" /> Recent Exports</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#1f1f26] hover:bg-[#262630] cursor-pointer transition-colors border border-transparent hover:border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded bg-success-900/30 flex items-center justify-center border border-success-500/20">
                    <Download className="w-5 h-5 text-success-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">YouTube_Upload_0{i}.mp4</h3>
                    <p className="text-xs text-white/40">1080p • 60fps • 1.2GB</p>
                  </div>
                </div>
                <div className="text-xs text-success-500 bg-success-500/10 px-2 py-1 rounded">Completed</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
