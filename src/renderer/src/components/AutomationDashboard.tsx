import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Play, Youtube, Instagram, MessageSquare, Zap } from 'lucide-react'

export default function AutomationDashboard() {
  const tasks = [
    { id: 1, platform: 'YouTube', type: 'Shorts', status: 'Published', time: '2 mins ago', title: 'Valorant Ace Moments' },
    { id: 2, platform: 'TikTok', type: 'Viral', status: 'Scheduled', time: 'Today, 6:00 PM', title: 'Why Sage is OP' },
    { id: 3, platform: 'Instagram', type: 'Reels', status: 'Processing', time: 'In Progress', title: 'Neon Movement Guide' },
  ]

  const [uploadStatus, setUploadStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async () => {
    setIsUploading(true)
    setUploadStatus('Running upload script...')
    try {
      // @ts-ignore
      const res = await window.api.runUpload()
      if (res.success) {
        setUploadStatus('Upload successful!')
      } else {
        setUploadStatus('Upload failed. Check logs.')
      }
    } catch (e) {
      setUploadStatus('Error triggering upload.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerate = async (script) => {
    setUploadStatus(`Running ${script}...`)
    try {
      // @ts-ignore
      const res = await window.api.runPython(script, [])
      if (res.success) {
        setUploadStatus(`Generated successfully!`)
      } else {
        setUploadStatus(`Generation failed.`)
      }
    } catch (e) {
      setUploadStatus(`Error running ${script}.`)
    }
  }

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white">Social Automation</h2>
          <p className="text-white/40 text-sm">Manage your content distribution pipelines</p>
        </div>
        <div className="flex space-x-3 items-center">
          {uploadStatus && <span className="text-xs text-white/50">{uploadStatus}</span>}
          <button 
            onClick={() => handleGenerate('generate_titles.py')}
            className="px-4 py-2 bg-[#1f1f26] border border-[#262630] rounded-lg text-sm font-medium hover:bg-brand-500 hover:border-brand-500 transition-colors"
          >
            Generate Titles
          </button>
          <button 
            onClick={() => handleGenerate('generate_descriptions.py')}
            className="px-4 py-2 bg-[#1f1f26] border border-[#262630] rounded-lg text-sm font-medium hover:bg-brand-500 hover:border-brand-500 transition-colors"
          >
            Generate Descriptions
          </button>
          <button 
            onClick={handleUpload}
            disabled={isUploading}
            className="px-6 py-2 bg-brand-500 rounded-lg text-sm font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            {isUploading ? 'Running...' : 'Auto Upload to YouTube'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Uploads" value="1,284" icon={<Play className="text-brand-400" />} />
        <StatCard label="Scheduled" value="42" icon={<Clock className="text-orange-400" />} />
        <StatCard label="Completion Rate" value="98.2%" icon={<CheckCircle2 className="text-green-400" />} />
        <StatCard label="Avg. Views/Post" value="12.4K" icon={<Zap className="text-yellow-400" />} />
      </div>

      {/* Active Tasks */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Recent Activity</h3>
        <div className="space-y-2">
          {tasks.map((task) => (
            <motion.div 
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-4 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                  {task.platform === 'YouTube' && <Youtube size={20} className="text-red-500" />}
                  {task.platform === 'TikTok' && <MessageSquare size={20} className="text-cyan-400" />}
                  {task.platform === 'Instagram' && <Instagram size={20} className="text-pink-500" />}
                </div>
                <div>
                  <p className="text-sm font-bold">{task.title}</p>
                  <p className="text-[10px] text-white/40">{task.platform} • {task.type}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-[10px] font-mono text-white/80">{task.time}</p>
                  <p className={`text-[8px] font-bold uppercase tracking-tighter ${
                    task.status === 'Published' ? 'text-green-400' : 
                    task.status === 'Scheduled' ? 'text-orange-400' : 'text-brand-400'
                  }`}>{task.status}</p>
                </div>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Settings size={14} className="text-white/40" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }) {
  return (
    <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

import { Settings } from 'lucide-react'
import { useState } from 'react'
