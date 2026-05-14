import { useState, useEffect, cloneElement, useRef } from 'react'
import { 
  Play, Pause, SkipBack, SkipForward, 
  Plus, Settings, 
  Zap, Video, 
  Maximize2, Image,
  Home, Type, Sparkles, SlidersHorizontal, Music, MessageSquare, Upload,
  Undo, Redo, Scissors, Trash2, Copy, CheckCircle2, ChevronDown, AlignLeft, AlignCenter, AlignRight, List,
  Mic, Crosshair, ChevronRight, Download, Loader2
} from 'lucide-react'
import clsx from 'clsx'
import AutomationDashboard from './components/AutomationDashboard'

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Video Player State
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  
  // Settings State
  const [topText, setTopText] = useState("MY EPIC MOMENTS")
  const [fontSize, setFontSize] = useState(120)
  const [textColor, setTextColor] = useState("#ffd000")
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [fps, setFps] = useState(60)
  const [autoCut, setAutoCut] = useState(true)
  const [useGpu, setUseGpu] = useState(true)
  const [scriptMode, setScriptMode] = useState('autoedit')
  const [videoDuration, setVideoDuration] = useState(60)
  
  // Scenes State
  const [scenes, setScenes] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [totalDuration, setTotalDuration] = useState(60)
  
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


  const handleSelectFile = async () => {
    try {
      // @ts-ignore
      const file = await window.api.selectFile()
      if (file) {
        setSelectedFile(file)
        if (videoRef.current) {
          videoRef.current.src = `file://${file}`
          videoRef.current.load()
        }
        if (autoCut) {
          setIsAnalyzing(true)
          try {
            const formData = new URLSearchParams()
            formData.append('file_path', file)
            const res = await fetch('http://localhost:8000/detect-scenes', {
              method: 'POST',
              body: formData
            })
            const data = await res.json()
            if (data.scenes && data.scenes.length > 0) {
              setScenes(data.scenes)
              setTotalDuration(data.scenes[data.scenes.length - 1].end || 60)
            }
          } catch (e) {
            console.error('Scene detection failed', e)
          } finally {
            setIsAnalyzing(false)
          }
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    const ms = Math.floor((time * 100) % 100)
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && totalDuration > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percent = clickX / rect.width
      const newTime = percent * totalDuration
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleRender = async () => {
    setIsProcessing(true)
    try {
      let script = 'autoedit.py'
      if (scriptMode === 'movie') script = 'movie_editor.py'
      if (scriptMode === 'shorts') script = 'shorts_editor.py'
      const args = [
        '--title', topText,
        '--seconds', videoDuration.toString(),
        '--resolution', '1080x1920'
      ]
      
      if (selectedFile) {
        args.push('--input', selectedFile)
      }

      // @ts-ignore
      const res = await window.api.runPython(script, args)
      
      if (res.success) {
        setRenderTasks(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          title: script,
          details: `Completed successfully`,
          status: "Completed",
          progress: 100
        }])
      } else {
        console.error('Script failed:', res.output)
      }
    } catch (error) {
      console.error('Render failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }


  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d0d12] text-foreground font-sans overflow-hidden select-none">
      {/* Top Title Bar */}
      <header className="h-10 flex items-center justify-between px-4 bg-[#0d0d12] border-b border-[#262630] window-drag">
        <div className="flex items-center space-x-6 window-no-drag">
          <div className="flex items-center space-x-2 text-brand-400">
            <Video className="w-4 h-4 fill-brand-500" />
            <span className="font-semibold text-xs tracking-wide text-white">Video Auto Editor</span>
          </div>
          <nav className="flex space-x-4 text-[11px] text-white/70">
            <button className="hover:text-white transition-colors">File</button>
            <button className="hover:text-white transition-colors">Edit</button>
            <button className="hover:text-white transition-colors">View</button>
            <button className="hover:text-white transition-colors">Tools</button>
            <button className="hover:text-white transition-colors">Help</button>
          </nav>
        </div>
        <div className="flex items-center space-x-4 window-no-drag">
           <button 
             onClick={handleRender} 
             disabled={isProcessing}
             className={clsx(
               "px-3 py-1 text-[10px] font-bold rounded uppercase tracking-wider flex items-center space-x-1.5 transition-colors",
               !isProcessing && !isAnalyzing ? "bg-brand-500 text-white hover:bg-brand-600" : "bg-[#1f1f26] text-white/30 cursor-not-allowed"
             )}
           >
             {(isProcessing || isAnalyzing) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
             <span>{isAnalyzing ? 'Analyzing...' : 'Quick Export'}</span>
           </button>
           <div className="w-px h-4 bg-[#262630]"></div>
           <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-white/20 hover:bg-white/40 cursor-pointer"></div>
              <div className="w-3 h-3 rounded-full bg-white/20 hover:bg-white/40 cursor-pointer"></div>
              <div className="w-3 h-3 rounded-full bg-danger-500 hover:bg-danger-400 cursor-pointer"></div>
           </div>
        </div>
      </header>

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-56 bg-[#141419] border-r border-[#262630] flex flex-col pt-4">
          <nav className="flex-1 flex flex-col px-3 space-y-1 overflow-y-auto">
            <SidebarItem icon={<Home />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isBrand />
            <SidebarItem icon={<Image />} label="Media" active={activeTab === 'media'} onClick={() => setActiveTab('media')} />
            <SidebarItem icon={<Scissors />} label="Edit" active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
            <SidebarItem icon={<Type />} label="Text / Overlays" active={activeTab === 'text'} onClick={() => setActiveTab('text')} />
            <SidebarItem icon={<Sparkles />} label="Effects" active={activeTab === 'effects'} onClick={() => setActiveTab('effects')} />
            <SidebarItem icon={<SlidersHorizontal />} label="Transitions" active={activeTab === 'transitions'} onClick={() => setActiveTab('transitions')} />
            <SidebarItem icon={<Music />} label="Audio" active={activeTab === 'audio'} onClick={() => setActiveTab('audio')} />
            <SidebarItem icon={<MessageSquare />} label="Subtitles" active={activeTab === 'subtitles'} onClick={() => setActiveTab('subtitles')} />
            <SidebarItem icon={<Download />} label="Export" active={activeTab === 'export'} onClick={() => setActiveTab('export')} />
            <SidebarItem icon={<Upload />} label="Upload" active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
            <SidebarItem icon={<Zap />} label="Automation" active={activeTab === 'automation'} onClick={() => setActiveTab('automation')} />
            <SidebarItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </nav>



          {/* Bottom Left: Project Details */}
          <div className="p-4 border-t border-[#262630] space-y-3 bg-[#0d0d12]">
            <div className="space-y-1">
              <label className="text-[10px] text-white/50">Project</label>
              <div className="flex items-center justify-between bg-[#1f1f26] border border-[#262630] rounded px-3 py-1.5 cursor-pointer">
                <span className="text-xs text-white/90">My Epic Moments</span>
                <ChevronDown className="w-3 h-3 text-white/50" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/50">Resolution</label>
              <div className="flex items-center justify-between bg-[#1f1f26] border border-[#262630] rounded px-3 py-1.5 cursor-pointer">
                <span className="text-xs text-white/90">1080x1920 (9:16)</span>
                <ChevronDown className="w-3 h-3 text-white/50" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/50">Frame Rate</label>
              <div className="flex items-center justify-between bg-[#1f1f26] border border-[#262630] rounded px-3 py-1.5 cursor-pointer">
                <span className="text-xs text-white/90">60 FPS</span>
                <ChevronDown className="w-3 h-3 text-white/50" />
              </div>
            </div>
            <button className="w-full mt-2 bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs py-2.5 rounded-lg transition-colors">
              New Project
            </button>
          </div>
        </aside>

        {/* Center Panel & Timeline */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d12]">
          
          {activeTab === 'automation' ? (
             <AutomationDashboard />
          ) : (
            <>
              {/* Top Center: Workspace */}
              <div className="flex-1 flex min-h-0">
                
                {/* Project Media Column */}
                <div className="w-[300px] border-r border-[#262630] bg-[#141419] flex flex-col">
                  <div className="p-4 flex items-center justify-between border-b border-[#262630]">
                    <h2 className="text-sm font-semibold text-white">Project Media</h2>
                    <div className="flex items-center space-x-2">
                      <button onClick={handleSelectFile} className="flex items-center space-x-1 px-2 py-1 bg-[#262630] hover:bg-[#32323e] rounded text-xs transition-colors">
                        <Download className="w-3 h-3 text-brand-400" />
                        <span>Import</span>
                      </button>
                      <button className="p-1 hover:bg-[#262630] rounded"><List className="w-4 h-4 text-white/60" /></button>
                    </div>
                  </div>

                  <div className="flex px-4 py-2 space-x-4 border-b border-[#262630]">
                    <button className="text-xs font-medium text-brand-400 border-b-2 border-brand-400 pb-1">All</button>
                    <button className="text-xs font-medium text-white/50 hover:text-white transition-colors pb-1">Videos</button>
                    <button className="text-xs font-medium text-white/50 hover:text-white transition-colors pb-1">Audio</button>
                    <button className="text-xs font-medium text-white/50 hover:text-white transition-colors pb-1">Images</button>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {/* Dropzone */}
                    <div onClick={handleSelectFile} className="border-2 border-dashed border-[#262630] hover:border-brand-500/50 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#1f1f26]/50 group">
                      <Upload className="w-6 h-6 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-xs text-white/80">Drag & Drop Files Here</p>
                      <p className="text-[10px] text-white/40 mt-1">or click to import</p>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {selectedFile && (
                        <div className="group relative rounded-lg overflow-hidden bg-[#1f1f26] border border-brand-500 cursor-pointer transition-colors col-span-2">
                           <div className="aspect-video bg-[#0d0d12] relative">
                             <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 to-[#0d0d12]"></div>
                             <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Play className="w-6 h-6 text-white fill-white" />
                             </div>
                             <div className="absolute top-1 right-1 w-3 h-3 bg-brand-500 rounded flex items-center justify-center"><CheckCircle2 className="w-2 h-2 text-white" /></div>
                           </div>
                           <div className="p-2">
                             <p className="text-[10px] text-white/90 truncate">{selectedFile.split('/').pop()}</p>
                           </div>
                        </div>
                      )}
                      {[1,2,3,4,5].map((i) => (
                         <div key={i} className="group relative rounded-lg overflow-hidden bg-[#1f1f26] border border-[#262630] hover:border-brand-500 cursor-pointer transition-colors">
                           <div className="aspect-video bg-[#0d0d12] relative">
                             {/* Fake thumbnail img */}
                             <div className="absolute inset-0 bg-gradient-to-br from-brand-900/10 to-[#0d0d12]"></div>
                             <div className="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[9px] font-mono">00:15</div>
                           </div>
                           <div className="p-1.5 text-center">
                             <p className="text-[10px] text-white/80 truncate">clip_0{i}.mp4</p>
                           </div>
                         </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Video Player Column */}
                <div className="flex-1 flex flex-col min-w-0 relative">
                   <div className="h-12 flex items-center justify-center space-x-4 border-b border-[#262630] bg-[#141419]">
                     <div className="flex items-center space-x-2 bg-[#0d0d12] border border-[#262630] rounded-md px-2 py-1">
                       <span className="text-[10px] text-white/70">1080x1920 (9:16)</span>
                       <ChevronDown className="w-3 h-3 text-white/40" />
                     </div>
                     <div className="flex items-center space-x-2 bg-[#0d0d12] border border-[#262630] rounded-md px-2 py-1">
                       <span className="text-[10px] text-white/70">60 FPS</span>
                       <ChevronDown className="w-3 h-3 text-white/40" />
                     </div>
                     <div className="flex-1"></div>
                     <div className="flex items-center space-x-2 mr-4">
                       <span className="text-[10px] text-white/50">Preview Quality</span>
                       <div className="flex items-center space-x-2 bg-[#0d0d12] border border-[#262630] rounded-md px-2 py-1">
                         <span className="text-[10px] text-white/90">High</span>
                         <ChevronDown className="w-3 h-3 text-white/40" />
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex-1 bg-[#0d0d12] flex flex-col items-center justify-center p-6 relative">
                     {/* Video Area */}
                     <div className="relative aspect-[9/16] h-full max-h-[650px] bg-black rounded-sm shadow-2xl overflow-hidden border border-white/5 group">
                       {selectedFile && (
                         <video 
                           ref={videoRef}
                           className="absolute inset-0 w-full h-full object-contain z-0"
                           onTimeUpdate={handleTimeUpdate}
                           onEnded={() => setIsPlaying(false)}
                           onLoadedMetadata={() => {
                             if (videoRef.current) setTotalDuration(videoRef.current.duration)
                           }}
                         />
                       )}
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <div className="text-center font-['Bebas_Neue']" style={{ 
                              WebkitTextStroke: `${strokeWidth}px ${strokeColor}`
                           }}>
                             <h1 className="text-5xl text-white drop-shadow-lg tracking-wider" style={{ textShadow: `0px ${strokeWidth}px 10px rgba(0,0,0,0.8)` }}>
                               {topText.split(' ').slice(0, 2).join(' ')}
                             </h1>
                             <h1 className="text-6xl drop-shadow-lg tracking-wider -mt-2" style={{ color: textColor, textShadow: `0px ${strokeWidth}px 10px rgba(0,0,0,0.8)` }}>
                               {topText.split(' ').slice(2).join(' ')}
                             </h1>
                             <div className="w-32 h-1 bg-white/80 mx-auto mt-4 rounded-full rotate-[-2deg]"></div>
                          </div>
                       </div>
                     </div>
                 
                 {/* Player Controls */}
                 <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center z-20 bg-[#0d0d12]/80 backdrop-blur py-2">
                    <div className="flex items-center justify-center space-x-6">
                      <span className="text-[10px] font-mono text-brand-400">{formatTime(currentTime)} <span className="text-white/40">/ {formatTime(totalDuration)}</span></span>
                      
                      <div className="flex items-center space-x-4">
                        <button className="text-white/60 hover:text-white transition-colors"><SkipBack className="w-4 h-4 fill-current" /></button>
                        <button onClick={togglePlay} className="text-white/60 hover:text-white transition-colors">
                          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>
                        <button className="text-white/60 hover:text-white transition-colors"><SkipForward className="w-4 h-4 fill-current" /></button>
                      </div>

                      <div className="flex items-center space-x-2 text-white/40">
                         <VolumeIcon />
                         <div className="w-16 h-1 bg-[#262630] rounded-full overflow-hidden">
                           <div className="w-2/3 h-full bg-brand-500 rounded-full"></div>
                         </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-white/60">
                        <button className="hover:text-white"><Crosshair className="w-4 h-4" /></button>
                        <button className="hover:text-white"><Maximize2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* Right Sidebar - Properties */}
            <div className="w-[320px] bg-[#141419] border-l border-[#262630] flex flex-col">
              <div className="flex border-b border-[#262630]">
                <button className="flex-1 py-3 text-xs font-semibold text-white border-b-2 border-brand-500">Edit</button>
                <button className="flex-1 py-3 text-xs font-medium text-white/50 hover:text-white transition-colors">Auto Edit</button>
                <button className="flex-1 py-3 text-xs font-medium text-white/50 hover:text-white transition-colors">Export</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Project Settings */}
                <div>
                  <h3 className="text-xs font-medium text-white mb-3">Project Settings</h3>
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-[10px] text-white/50">Script Mode</span>
                       <select value={scriptMode} onChange={(e) => setScriptMode(e.target.value)} className="bg-[#1f1f26] border border-[#262630] rounded text-xs text-white/90 px-2 py-1 outline-none">
                         <option value="autoedit">Auto Edit Shorts</option>
                         <option value="movie">Movie Editor</option>
                         <option value="shorts">Legacy Shorts Editor</option>
                       </select>
                     </div>
                     <PropRow label="Resolution" value="1080x1920 (9:16)" />
                     <div className="flex items-center justify-between">
                       <span className="text-[10px] text-white/50">Frame Rate</span>
                       <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="bg-[#1f1f26] border border-[#262630] rounded text-xs text-white/90 px-2 py-1 outline-none">
                         <option value={30}>30 FPS</option>
                         <option value={60}>60 FPS</option>
                       </select>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-[10px] text-white/50">Duration (sec)</span>
                       <input type="number" value={videoDuration} onChange={(e) => setVideoDuration(Number(e.target.value))} className="bg-[#1f1f26] border border-[#262630] rounded text-xs text-white/90 px-2 py-1 outline-none w-16 text-right" />
                     </div>
                     <div className="pt-2 space-y-2">
                       <ToggleRow label="Auto Cut (Smart)" active={autoCut} onClick={() => setAutoCut(!autoCut)} />
                       <ToggleRow label="GPU Acceleration (NVENC)" active={useGpu} onClick={() => setUseGpu(!useGpu)} />
                     </div>
                  </div>
                </div>

                <div className="w-full h-px bg-[#262630]"></div>

                {/* Text Overlay */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-white">Text Overlay</h3>
                    <div className="flex items-center space-x-2">
                       <Plus className="w-3.5 h-3.5 text-white/60 cursor-pointer hover:text-white" />
                       <Toggle active />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input type="text" value={topText} onChange={(e) => setTopText(e.target.value)} className="w-full bg-[#1f1f26] border border-[#262630] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 flex items-center justify-between bg-[#1f1f26] border border-[#262630] rounded-md px-3 py-1.5 cursor-pointer">
                        <span className="text-xs text-white/90">Bebas Neue</span>
                        <ChevronDown className="w-3 h-3 text-white/50" />
                      </div>
                      <div className="w-20 flex items-center justify-between bg-[#1f1f26] border border-[#262630] rounded-md px-3 py-1.5 cursor-pointer">
                        <input type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full bg-transparent text-xs text-white/90 outline-none" />
                      </div>
                      <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 rounded-md bg-transparent border border-[#262630] cursor-pointer" />
                    </div>

                    <div className="flex items-center space-x-1">
                      <ToolBtn icon={<AlignLeft />} />
                      <ToolBtn icon={<AlignCenter />} active />
                      <ToolBtn icon={<AlignRight />} />
                      <div className="w-px h-4 bg-[#262630] mx-1"></div>
                      <ToolBtn icon={<Type />} />
                    </div>

                    <div className="space-y-2 pt-2">
                      <ColorPropRow label="Stroke Color" color={strokeColor} value={strokeWidth} onChangeColor={setStrokeColor} onChangeValue={setStrokeWidth} />
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-[#262630]"></div>

                <Accordion title="Effects & Filters" />
                <Accordion title="Transitions" />
                <Accordion title="Crop & Resize" />

                {/* Render Queue */}
                <div className="pt-4">
                  <h3 className="text-xs font-medium text-white mb-3">Render Queue</h3>
                  <div className="space-y-2">
                     {renderTasks.length === 0 ? (
                       <p className="text-xs text-white/40 italic">No active renders</p>
                     ) : (
                       renderTasks.map(task => (
                         <RenderTask key={task.id} title={task.title} details={task.details} status={task.status} progress={task.progress} />
                       ))
                     )}
                  </div>
                  <button onClick={() => setRenderTasks(prev => prev.filter(t => t.progress < 100))} className="w-full mt-3 py-2 border border-[#262630] rounded-md text-[10px] text-white/60 hover:text-white hover:bg-[#1f1f26] transition-colors flex items-center justify-center space-x-1">
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Completed</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Timeline Section */}
          <div className="h-72 bg-[#0d0d12] border-t border-[#262630] flex flex-col">
            {/* Timeline Toolbar */}
            <div className="h-10 flex items-center justify-between px-4 bg-[#141419] border-b border-[#262630]">
               <div className="flex items-center space-x-1 text-white/60">
                 <ToolBtn icon={<Undo />} />
                 <ToolBtn icon={<Redo />} />
                 <div className="w-px h-4 bg-[#262630] mx-2"></div>
                 <ToolBtn icon={<Scissors />} />
                 <ToolBtn icon={<Trash2 />} />
                 <ToolBtn icon={<Copy />} />
                 <div className="w-px h-4 bg-[#262630] mx-2"></div>
                 <ToolBtn icon={<Crosshair />} />
                 <ToolBtn icon={<Maximize2 />} />
                 <ToolBtn icon={<Mic />} />
                 <ToolBtn icon={<Crosshair />} />
               </div>
               
               <div className="flex items-center space-x-4 flex-1 justify-center px-8 relative">
                 <div className="w-full max-w-2xl flex items-end justify-between px-4 pb-1 h-full text-[9px] text-white/30 font-mono">
                    <span>00:00</span>
                    <span>00:10</span>
                    <span>00:20</span>
                    <span>00:30</span>
                    <span>00:40</span>
                    <span>00:50</span>
                    <span>01:00</span>
                 </div>
               </div>
            </div>

            {/* Tracks Area */}
            <div className="flex-1 overflow-y-auto relative bg-[#0d0d12]">
               {/* Playhead Guide */}
               <div className="absolute top-0 bottom-0 w-px bg-brand-500 z-50 pointer-events-none transition-all duration-100 ease-linear"
                 style={{ left: `calc(5% + ${totalDuration > 0 ? (currentTime / totalDuration) * 75 : 0}%)` }}
               >
                 <div className="absolute -top-2 -translate-x-1/2 w-3 h-3 rounded-sm bg-brand-500 rotate-45"></div>
               </div>

               <div className="space-y-[2px] pt-2">
                 <TrackRow label="Text Overlay" icon={<Type />}>
                   <div className="absolute left-[10%] w-[15%] h-8 bg-brand-500/30 border border-brand-500 rounded flex items-center px-2 z-10">
                     <span className="text-[9px] text-brand-100 truncate">{topText}</span>
                   </div>
                 </TrackRow>
                 
                 <TrackRow label="Video Track" icon={<Video />}>
                   <div className="absolute left-[5%] right-[20%] h-12 flex relative cursor-pointer" onClick={handleTimelineClick}>
                      {scenes.length > 0 ? (
                        scenes.map((scene, i) => {
                          const widthPercent = (scene.duration / totalDuration) * 100
                          return (
                            <div key={i} style={{ width: `${widthPercent}%` }} className={clsx(
                              "h-full rounded border overflow-hidden relative group cursor-pointer transition-all",
                              "border-[#262630] hover:border-brand-500 hover:shadow-[0_0_0_1px_#7445ff]"
                            )}>
                               <div className="absolute inset-0 bg-gradient-to-br from-[#1f1f26] to-[#0d0d12]"></div>
                               {/* Resize handles */}
                               <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/0 group-hover:bg-white/50 cursor-col-resize z-10"></div>
                               <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/0 group-hover:bg-white/50 cursor-col-resize z-10"></div>
                            </div>
                          )
                        })
                      ) : (
                        [1,2,3,4,5,6].map(i => (
                          <div key={i} className={clsx(
                            "h-full flex-1 rounded border overflow-hidden relative",
                            i === 2 ? "border-brand-500 shadow-[0_0_0_1px_#7445ff]" : "border-[#262630]"
                          )}>
                             <div className="absolute inset-0 bg-gradient-to-br from-[#1f1f26] to-[#0d0d12]"></div>
                          </div>
                        ))
                      )}
                   </div>
                 </TrackRow>

                 <TrackRow label="Effects Track" icon={<Sparkles />}>
                    <div className="absolute left-[5%] w-[8%] h-7 bg-[#0ea5e9]/20 border border-[#0ea5e9]/50 rounded flex items-center px-2">
                      <span className="text-[9px] text-[#0ea5e9] truncate">Zoom In</span>
                    </div>
                    <div className="absolute left-[14%] w-[6%] h-7 bg-[#0ea5e9]/20 border border-[#0ea5e9]/50 rounded flex items-center px-2">
                      <span className="text-[9px] text-[#0ea5e9] truncate">Fade</span>
                    </div>
                    <div className="absolute left-[21%] w-[10%] h-7 bg-danger-500/20 border border-danger-500/50 rounded flex items-center px-2">
                      <span className="text-[9px] text-danger-400 truncate">Shake</span>
                    </div>
                    <div className="absolute left-[32%] w-[12%] h-7 bg-[#0ea5e9]/20 border border-[#0ea5e9]/50 rounded flex items-center px-2">
                      <span className="text-[9px] text-[#0ea5e9] truncate">Light Leak</span>
                    </div>
                 </TrackRow>

                 <TrackRow label="Audio Track" icon={<Music />}>
                   <div className="absolute left-[5%] right-[10%] h-10 bg-success-500/10 border border-success-500/30 rounded flex items-center overflow-hidden">
                      <div className="w-full h-full opacity-60 flex items-center space-x-0.5 px-1">
                         {/* Fake Waveform */}
                         {Array.from({length: 100}).map((_, i) => (
                           <div key={i} className="flex-1 bg-success-500 rounded-full" style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
                         ))}
                      </div>
                      <span className="absolute left-2 text-[9px] text-success-400 font-mono z-10 drop-shadow-md">epic_music.mp3</span>
                   </div>
                 </TrackRow>
               </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-[#0d0d12] border-t border-[#262630] flex items-center px-4 justify-between text-[9px] font-mono text-white/50">
         <div className="flex items-center space-x-6">
           <div className="flex items-center space-x-1.5">
             <span>Backend:</span>
             <span className="text-success-500">Connected</span>
             <div className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse"></div>
           </div>
           <div className="flex items-center space-x-1.5">
             <span>FFmpeg:</span>
             <span className="text-white/80">Ready</span>
             <div className="w-1.5 h-1.5 rounded-full bg-success-500"></div>
           </div>
         </div>
         <div className="flex items-center space-x-8">
           <span>CPU: <span className="text-white/90">{sysStats.cpu.toFixed(1)}%</span></span>
           <span>RAM: <span className="text-white/90">{sysStats.ram.toFixed(1)} GB / {sysStats.totalRam.toFixed(1)} GB</span></span>
         </div>
      </footer>
    </div>
  )
}

function SidebarItem({ icon, label, active, onClick, isBrand = false }) {
  return (
    <div 
      onClick={onClick}
      className={clsx(
        "flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group",
        active 
          ? isBrand ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : "bg-[#1f1f26] text-white" 
          : "text-white/50 hover:bg-[#1f1f26] hover:text-white"
      )}
    >
      {cloneElement(icon, { className: clsx("w-4 h-4", active ? "text-white" : "text-white/50 group-hover:text-white") })}
      <span className="text-[11px] font-medium tracking-wide">{label}</span>
    </div>
  )
}

function PropRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/50">{label}</span>
      <div className="flex items-center space-x-2 text-xs text-white/90">
        <span>{value}</span>
        <ChevronDown className="w-3 h-3 text-white/40" />
      </div>
    </div>
  )
}

function ToggleRow({ label, active, onClick }) {
  return (
    <div className="flex items-center justify-between" onClick={onClick}>
      <span className="text-[10px] text-white/60">{label}</span>
      <Toggle active={active} />
    </div>
  )
}

function Toggle({ active }) {
  return (
    <div className={clsx("w-6 h-3.5 rounded-full relative cursor-pointer transition-colors", active ? "bg-brand-500" : "bg-[#262630]")}>
      <div className={clsx("absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all", active ? "right-0.5" : "left-0.5")}></div>
    </div>
  )
}

function ColorPropRow({ label, color, value, onChangeColor, onChangeValue }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/50">{label}</span>
      <div className="flex items-center space-x-2">
        <div className="w-12 h-6 bg-[#1f1f26] border border-[#262630] rounded flex items-center justify-center relative overflow-hidden">
           <input type="color" value={color} onChange={(e) => onChangeColor && onChangeColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
           <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: color }}></div>
        </div>
        <div className="w-12 h-6 bg-[#1f1f26] border border-[#262630] rounded flex items-center justify-center text-[10px] text-white overflow-hidden">
          <input type="number" value={value} onChange={(e) => onChangeValue && onChangeValue(Number(e.target.value))} className="w-full bg-transparent text-center outline-none" />
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ icon, active = false }) {
  return (
    <button className={clsx("p-1.5 rounded transition-colors", active ? "bg-[#262630] text-white" : "hover:bg-[#262630] text-white/60 hover:text-white")}>
      {cloneElement(icon, { className: "w-3.5 h-3.5" })}
    </button>
  )
}

function Accordion({ title }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#262630] cursor-pointer hover:bg-[#1f1f26]/50 transition-colors">
      <span className="text-xs font-medium text-white">{title}</span>
      <ChevronRight className="w-3.5 h-3.5 text-white/50" />
    </div>
  )
}

function RenderTask({ title, details, status, progress }) {
  const isComplete = progress === 100
  return (
    <div className="bg-[#1f1f26] border border-[#262630] rounded-lg p-2.5 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          <div className="w-8 h-8 bg-black rounded flex-shrink-0"></div>
          <div>
            <h4 className="text-[10px] font-medium text-white">{title}</h4>
            <p className="text-[8px] text-white/40">{details}</p>
          </div>
        </div>
        {isComplete ? (
          <CheckCircle2 className="w-3 h-3 text-success-500" />
        ) : (
          <span className="text-[8px] text-brand-400">{status}</span>
        )}
      </div>
      {!isComplete && (
        <div className="w-full h-0.5 bg-[#0d0d12] rounded-full overflow-hidden">
          <div className="h-full bg-brand-500" style={{ width: `${progress}%` }}></div>
        </div>
      )}
      {isComplete && (
        <p className="text-[8px] text-success-500 text-right">{status}</p>
      )}
    </div>
  )
}

function TrackRow({ label, icon, children }) {
  return (
    <div className="flex h-12 bg-[#141419]/50 hover:bg-[#141419] transition-colors border-b border-[#262630]/50 relative group">
       <div className="w-40 border-r border-[#262630] flex items-center px-3 space-x-2 bg-[#141419] z-20">
         {cloneElement(icon, { className: "w-3 h-3 text-white/40" })}
         <span className="text-[9px] text-white/60 truncate">{label}</span>
       </div>
       <div className="flex-1 relative">
         {/* Grid lines */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>
         {children}
       </div>
    </div>
  )
}

function VolumeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>
  )
}
