import { motion } from 'framer-motion'
import { Activity, Cpu, HardDrive, Zap } from 'lucide-react'

export default function RenderMonitor() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Activity className="text-brand-400 w-5 h-5" />
        <h2 className="text-lg font-bold">System Performance</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-4 rounded-xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-medium">CPU Usage</span>
            </div>
            <span className="text-xs font-mono text-brand-400">42%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-brand-500"
              initial={{ width: 0 }}
              animate={{ width: '42%' }}
            />
          </div>
          <p className="text-[10px] text-white/40">16 Threads Active • 4.2GHz</p>
        </div>

        <div className="glass p-4 rounded-xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium">GPU Acceleration</span>
            </div>
            <span className="text-xs font-mono text-yellow-400">NVENC Active</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-yellow-500"
              initial={{ width: 0 }}
              animate={{ width: '68%' }}
            />
          </div>
          <p className="text-[10px] text-white/40">RTX 4090 • 85% Load • 62°C</p>
        </div>

        <div className="glass p-4 rounded-xl border border-white/5 col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium">Disk I/O (NVMe)</span>
            </div>
            <span className="text-xs font-mono text-cyan-400">1.2 GB/s</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: '25%' }}
            />
          </div>
        </div>
      </div>

      <div className="glass p-4 rounded-xl border border-white/5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Active Render Queue</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold">Export_Valorant_Part_01.mp4</p>
              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="w-[75%] h-full bg-brand-500"></div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-brand-400">75% • 12s left</span>
          </div>
          <div className="flex items-center justify-between opacity-40">
            <div className="space-y-1">
              <p className="text-[10px] font-bold">Export_Valorant_Part_02.mp4</p>
              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="w-0 h-full bg-brand-500"></div>
              </div>
            </div>
            <span className="text-[10px] font-mono">Waiting...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
