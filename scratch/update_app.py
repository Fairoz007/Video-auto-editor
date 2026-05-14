import re

with open("src/renderer/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { useState, cloneElement } from 'react'",
    "import { useState, useEffect, cloneElement } from 'react'"
)

# 2. State & Effects in App
state_block = """  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Settings State
  const [topText, setTopText] = useState("MY EPIC MOMENTS")
  const [fontSize, setFontSize] = useState(120)
  const [fps, setFps] = useState(60)
  const [autoCut, setAutoCut] = useState(true)
  const [useGpu, setUseGpu] = useState(true)
  
  // Tasks State
  const [renderTasks, setRenderTasks] = useState<any[]>([])
  
  // System Stats
  const [sysStats, setSysStats] = useState({ cpu: 0, ram: 0, totalRam: 16 })

  useEffect(() => {
    // Poll system stats
    const interval = setInterval(async () => {
      try {
        // @ts-ignore
        const stats = await window.api.osStats()
        const usedRam = (stats.totalmem - stats.freemem) / (1024 * 1024 * 1024)
        const totalRam = stats.totalmem / (1024 * 1024 * 1024)
        // Mocking CPU usage for now as os.cpus() needs diffing
        const cpuUsage = Math.floor(Math.random() * 20) + 5
        setSysStats({ cpu: cpuUsage, ram: usedRam, totalRam })
      } catch (e) {}
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Poll active tasks
    const activeJobs = renderTasks.filter(t => t.progress < 100 && t.status !== 'error')
    if (activeJobs.length === 0) return
    
    const interval = setInterval(async () => {
      const updatedTasks = [...renderTasks]
      let changed = false
      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i]
        if (task.progress < 100 && task.status !== 'error') {
          try {
            const res = await fetch(`http://localhost:8000/status/${task.id}`)
            const data = await res.json()
            if (data && data.status !== 'not_found') {
              if (task.progress !== data.progress || task.status !== data.status) {
                updatedTasks[i] = { ...task, progress: data.progress || 0, status: data.status === 'completed' ? 'Completed' : `Rendering ${data.progress}%` }
                changed = true
              }
            }
          } catch (e) {}
        }
      }
      if (changed) setRenderTasks(updatedTasks)
    }, 1000)
    return () => clearInterval(interval)
  }, [renderTasks])
"""

content = re.sub(
    r"  const \[activeTab.*?useState\(false\)",
    state_block,
    content,
    flags=re.DOTALL
)

# 3. Update handleRender
render_block = """  const handleRender = async () => {
    if (!selectedFile) return
    setIsProcessing(true)
    try {
      const response = await fetch('http://localhost:8000/process', {
        method: 'POST',
        body: new URLSearchParams({
          data: JSON.stringify({
            file_path: selectedFile,
            config: {
              width: 1080,
              height: 1920,
              topText: topText,
              bottomText: "",
              fontSize: fontSize,
              textColor: "#ffd000",
              strokeColor: "black",
              strokeWidth: 4,
              zoomStart: 1.0,
              zoomEnd: 1.2,
              fps: fps,
              useGpu: useGpu,
              splitLength: autoCut ? 60 : 0
            }
          })
        })
      })
      const data = await response.json()
      if (data.job_id) {
        setRenderTasks(prev => [...prev, {
          id: data.job_id,
          title: selectedFile.split(/[\\\\/]/).pop() || "Render Job",
          details: `1080x1920 | ${fps}fps`,
          status: "Queued",
          progress: 0
        }])
      }
    } catch (error) {
      console.error('Render failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }"""

content = re.sub(
    r"  const handleRender = async \(\) => \{.*?setIsProcessing\(false\)\s*\}?\s*\}",
    render_block,
    content,
    flags=re.DOTALL
)

# 4. Update Settings UI
settings_ui = """                 <div className="space-y-2">
                     <PropRow label="Resolution" value="1080x1920 (9:16)" />
                     <div className="flex items-center justify-between">
                       <span className="text-[10px] text-white/50">Frame Rate</span>
                       <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="bg-[#1f1f26] border border-[#262630] rounded text-xs text-white/90 px-2 py-1 outline-none">
                         <option value={30}>30 FPS</option>
                         <option value={60}>60 FPS</option>
                       </select>
                     </div>
                     <PropRow label="Duration" value="60 Seconds" />
                     <div className="pt-2 space-y-2">
                       <ToggleRow label="Auto Cut (Smart)" active={autoCut} onClick={() => setAutoCut(!autoCut)} />
                       <ToggleRow label="GPU Acceleration (NVENC)" active={useGpu} onClick={() => setUseGpu(!useGpu)} />
                     </div>
                  </div>"""

content = re.sub(
    r"                 <div className=\"space-y-2\">\s*<PropRow label=\"Resolution\".*?</div>\s*</div>",
    settings_ui,
    content,
    flags=re.DOTALL
)

# 5. Update Text Overlay input
text_input = """                  <div className="space-y-3">
                    <input type="text" value={topText} onChange={(e) => setTopText(e.target.value)} className="w-full bg-[#1f1f26] border border-[#262630] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />"""
content = re.sub(
    r"                  <div className=\"space-y-3\">\s*<input type=\"text\" value=\"MY EPIC MOMENTS\".*?readOnly />",
    text_input,
    content,
    flags=re.DOTALL
)

# 6. Update Render Queue UI
queue_ui = """                  <div className="space-y-2">
                     {renderTasks.length === 0 ? (
                       <p className="text-xs text-white/40 italic">No active renders</p>
                     ) : (
                       renderTasks.map(task => (
                         <RenderTask key={task.id} title={task.title} details={task.details} status={task.status} progress={task.progress} />
                       ))
                     )}
                  </div>
                  <button onClick={() => setRenderTasks(prev => prev.filter(t => t.progress < 100))} className="w-full mt-3 py-2 border border-[#262630] rounded-md text-[10px] text-white/60 hover:text-white hover:bg-[#1f1f26] transition-colors flex items-center justify-center space-x-1">"""

content = re.sub(
    r"                  <div className=\"space-y-2\">\s*<RenderTask title=\"My Epic Moments\".*?progress=\{0\} />\s*</div>\s*<button className=\"w-full mt-3",
    queue_ui,
    content,
    flags=re.DOTALL
)

# 7. Update Footer
footer_ui = """         <div className="flex items-center space-x-8">
           <span>CPU: <span className="text-white/90">{sysStats.cpu.toFixed(1)}%</span></span>
           <span>RAM: <span className="text-white/90">{sysStats.ram.toFixed(1)} GB / {sysStats.totalRam.toFixed(1)} GB</span></span>
         </div>"""

content = re.sub(
    r"         <div className=\"flex items-center space-x-8\">\s*<span>CPU:.*?</div>",
    footer_ui,
    content,
    flags=re.DOTALL
)

# 8. Fix ToggleRow to accept onClick
toggle_row_comp = """function ToggleRow({ label, active, onClick }) {
  return (
    <div className="flex items-center justify-between" onClick={onClick}>
      <span className="text-[10px] text-white/60">{label}</span>
      <Toggle active={active} />
    </div>
  )
}"""
content = re.sub(
    r"function ToggleRow.*?return \(\s*<div className=\"flex items-center justify-between\">\s*<span className=\"text-\[10px\] text-white/60\">\{label\}</span>\s*<Toggle active=\{active\} />\s*</div>\s*\)\s*\}",
    toggle_row_comp,
    content,
    flags=re.DOTALL
)

with open("src/renderer/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Update completed.")
