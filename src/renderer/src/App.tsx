import { useState, useEffect, cloneElement, useRef, useCallback } from 'react'
import { 
  Play, Pause, SkipBack, SkipForward, 
  Plus, Settings, 
  Zap, Video, 
  Maximize2, Image as ImageIcon,
  Home, Type, Sparkles, SlidersHorizontal, Music, MessageSquare, Upload,
  Undo, Redo, Scissors, Trash2, Copy, CheckCircle2, ChevronDown, AlignLeft, AlignCenter, AlignRight, List,
  Mic, Crosshair, ChevronRight, Download, Loader2, MousePointer2, X
} from 'lucide-react'
import clsx from 'clsx'
import AutomationDashboard from './components/AutomationDashboard'
import AutoEditDashboard from './components/AutoEditDashboard'
import DashboardPanel from './components/panels/DashboardPanel'
import ExportPanel from './components/panels/ExportPanel'
import UploadPanel from './components/panels/UploadPanel'
import LeftToolPanel from './components/panels/LeftToolPanel'

type TrackType = 'video' | 'audio' | 'text' | 'effect';

type Clip = {
  id: string;
  name: string;
  type: TrackType;
  start: number;
  duration: number;
  sourceStart: number;
  sourceFile?: string;
  color?: string;
  text?: string;
};

type Track = {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
};

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [assets, setAssets] = useState<any>({ luts: {}, transitions: {}, effects: {} })

  useEffect(() => {
    const fetchAssets = async () => {
      // @ts-ignore
      if (window.api && window.api.scanAssets) {
        try {
          // @ts-ignore
          const res = await window.api.scanAssets();
          setAssets(res);
        } catch (e) { console.error("Failed to load assets", e); }
      }
    };
    fetchAssets();
  }, []);
  
  // Video Player State
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  
  // Settings State
  const [topText, setTopText] = useState("MY EPIC MOMENTS")
  const [fontSize, setFontSize] = useState(120)
  const [textColor, setTextColor] = useState("#ffd000")
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [textShadowColor, setTextShadowColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [fps, setFps] = useState(60)
  const [resolution, setResolution] = useState("1080x1920")
  const [autoCut, setAutoCut] = useState(true)
  const [useGpu, setUseGpu] = useState(true)
  const [scriptMode, setScriptMode] = useState('autoedit')
  const [videoDuration, setVideoDuration] = useState(60)
  const [totalDuration, setTotalDuration] = useState(60)
  
  // Scenes State
  const [scenes, setScenes] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Tasks State
  const [renderTasks, setRenderTasks] = useState<any[]>([])
  
  // System Stats
  const [sysStats, setSysStats] = useState({ cpu: 0, ram: 0, totalRam: 16 })

  // --- NEW TIMELINE STATE ---
  const [tracks, setTracks] = useState<Track[]>([
    { id: 't1', type: 'text', name: 'Text Overlay', clips: [{ id: 'c1', name: 'Title', type: 'text', start: 0, duration: 10, sourceStart: 0, text: 'MY EPIC MOMENTS' }] },
    { id: 'v1', type: 'video', name: 'Video Track', clips: [] },
    { id: 'e1', type: 'effect', name: 'Effects Track', clips: [] },
    { id: 'a1', type: 'audio', name: 'Audio Track', clips: [] },
  ]);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [history, setHistory] = useState<Track[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(historyIndex);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);

  // Export Dialog State
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const pushHistory = useCallback((newTracks: Track[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newTracks);
      if (newHistory.length > 50) newHistory.shift(); // Max 50 states
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
    setTracks(newTracks);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setTracks(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setTracks(history[historyIndex + 1]);
    }
  };

  // Drag logic
  const [draggingClip, setDraggingClip] = useState<{ id: string, trackId: string, startX: number, originalStart: number, type: 'move' | 'trim-start' | 'trim-end' } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingClip) return;
      const trackEl = document.getElementById(`track-${draggingClip.trackId}`);
      if (!trackEl) return;

      const pxPerSec = trackEl.clientWidth / totalDuration;
      const deltaX = e.clientX - draggingClip.startX;
      const deltaSec = deltaX / pxPerSec;

      setTracks(prev => prev.map(track => {
        if (track.id !== draggingClip.trackId) return track;
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== draggingClip.id) return clip;
            
            if (draggingClip.type === 'move') {
              let newStart = Math.max(0, draggingClip.originalStart + deltaSec);
              return { ...clip, start: newStart };
            } else if (draggingClip.type === 'trim-start') {
              let newStart = Math.max(0, draggingClip.originalStart + deltaSec);
              let deltaTrim = newStart - clip.start;
              let newDuration = clip.duration - deltaTrim;
              if (newDuration < 0.5) {
                newDuration = 0.5;
                newStart = clip.start + clip.duration - 0.5;
              }
              return { ...clip, start: newStart, duration: newDuration, sourceStart: clip.sourceStart + deltaTrim };
            } else if (draggingClip.type === 'trim-end') {
              let newDuration = Math.max(0.5, clip.duration + deltaSec);
              return { ...clip, duration: newDuration };
            }
            return clip;
          })
        };
      }));
    };

    const handleMouseUp = () => {
      if (draggingClip) {
        pushHistory(tracks);
        setDraggingClip(null);
      }
    };

    if (draggingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingClip, totalDuration, timelineZoom, tracks, pushHistory]);

  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip, trackId: string, type: 'move' | 'trim-start' | 'trim-end') => {
    e.stopPropagation();
    setSelectedClipId(clip.id);
    setDraggingClip({
      id: clip.id,
      trackId,
      startX: e.clientX,
      originalStart: clip.start,
      type
    });
  };

  const splitClip = () => {
    if (!selectedClipId) return;
    let modified = false;
    const newTracks = tracks.map(track => {
      const clipIndex = track.clips.findIndex(c => c.id === selectedClipId);
      if (clipIndex === -1) return track;
      
      const clip = track.clips[clipIndex];
      if (currentTime > clip.start && currentTime < clip.start + clip.duration) {
        modified = true;
        const clip1 = { ...clip, duration: currentTime - clip.start };
        const clip2 = { 
          ...clip, 
          id: Math.random().toString(36).substr(2, 9),
          start: currentTime, 
          duration: clip.duration - (currentTime - clip.start),
          sourceStart: clip.sourceStart + (currentTime - clip.start)
        };
        const newClips = [...track.clips];
        newClips.splice(clipIndex, 1, clip1, clip2);
        return { ...track, clips: newClips };
      }
      return track;
    });

    if (modified) {
      pushHistory(newTracks);
    }
  };

  const deleteSelectedClip = () => {
    if (!selectedClipId) return;
    const newTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.filter(c => c.id !== selectedClipId)
    }));
    pushHistory(newTracks);
    setSelectedClipId(null);
  };

  const duplicateSelectedClip = () => {
    if (!selectedClipId) return;
    const newTracks = tracks.map(track => {
      const clip = track.clips.find(c => c.id === selectedClipId);
      if (clip) {
        const newClip = {
          ...clip,
          id: Math.random().toString(36).substr(2, 9),
          start: clip.start + clip.duration
        };
        return { ...track, clips: [...track.clips, newClip] };
      }
      return track;
    });
    pushHistory(newTracks);
  };

  const rippleDelete = () => {
    if (!selectedClipId) return;
    const newTracks = tracks.map(track => {
      const clipIndex = track.clips.findIndex(c => c.id === selectedClipId);
      if (clipIndex === -1) return track;
      const clip = track.clips[clipIndex];
      const gap = clip.duration;
      
      const newClips = track.clips.filter(c => c.id !== selectedClipId).map(c => {
        if (c.start >= clip.start) {
          return { ...c, start: Math.max(0, c.start - gap) };
        }
        return c;
      });
      return { ...track, clips: newClips };
    });
    pushHistory(newTracks);
    setSelectedClipId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'c' || e.key === 's') {
        splitClip();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (e.shiftKey) rippleDelete();
        else deleteSelectedClip();
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        duplicateSelectedClip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, currentTime, tracks, isPlaying, togglePlay, historyIndex, history]);


  useEffect(() => {
    if (history.length === 0) {
      pushHistory(tracks);
    }
  }, []);

  // Sync video element with timeline playhead
  useEffect(() => {
    const videoTrack = tracks.find(t => t.type === 'video');
    if (!videoTrack) return;
    
    const activeClip = videoTrack.clips.find(c => currentTime >= c.start && currentTime < c.start + c.duration);
    
    if (activeClip && activeClip.sourceFile && videoRef.current) {
      if (videoRef.current.dataset.clipId !== activeClip.id) {
        videoRef.current.src = `file://${activeClip.sourceFile}`;
        videoRef.current.dataset.clipId = activeClip.id;
      }
      
      const targetTime = activeClip.sourceStart + (currentTime - activeClip.start);
      const drift = Math.abs(videoRef.current.currentTime - targetTime);
      if (!isPlaying && drift > 0.05) {
        videoRef.current.currentTime = targetTime;
      } else if (isPlaying && drift > 0.5) {
        videoRef.current.currentTime = targetTime;
      }
      
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(e => console.error("Play error:", e));
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    } else if (videoRef.current) {
      if (!videoRef.current.paused) videoRef.current.pause();
      if (videoRef.current.src) {
         videoRef.current.removeAttribute('src');
         videoRef.current.load();
         videoRef.current.dataset.clipId = '';
      }
    }
  }, [currentTime, tracks, isPlaying]);

  // Handle Playback loop
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();
    
    const tick = (now: number) => {
      if (isPlaying) {
        const deltaSec = (now - lastTime) / 1000;
        lastTime = now;
        
        setCurrentTime(prev => {
          let next = prev + deltaSec;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
        animationFrame = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animationFrame = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, totalDuration]);


  useEffect(() => {
    // Poll system stats
    const interval = setInterval(async () => {
      try {
        // @ts-ignore
        if (window.api && window.api.osStats) {
          // @ts-ignore
          const stats = await window.api.osStats()
          const usedRam = (stats.totalmem - stats.freemem) / (1024 * 1024 * 1024)
          const totalRam = stats.totalmem / (1024 * 1024 * 1024)
          const cpuUsage = Math.floor(Math.random() * 20) + 5
          setSysStats({ cpu: cpuUsage, ram: usedRam, totalRam })
        }
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

  useEffect(() => {
    if (showExportDialog && renderTasks.length > 0) {
      const latestTask = renderTasks[renderTasks.length - 1];
      if (latestTask.progress > exportProgress) {
        setExportProgress(latestTask.progress);
      }
      if (latestTask.status === 'error' || latestTask.status?.toLowerCase().includes('error')) {
        setExportError(latestTask.details || 'Render failed.');
        setIsProcessing(false);
      }
      if (latestTask.progress >= 100 || latestTask.status === 'Completed') {
        setExportProgress(100);
        setIsProcessing(false);
      }
    }
  }, [renderTasks, showExportDialog, exportProgress]);

  const handleSelectFile = async () => {
    try {
      // @ts-ignore
      if (!window.api) return;
      // @ts-ignore
      const file = await window.api.selectFile()
      if (file) {
        setSelectedFile(file)
        setMediaFiles(prev => prev.includes(file) ? prev : [...prev, file])
        
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
              // We could automatically slice the clip here, but for NLE simplicity, we just keep the clips array
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

  function togglePlay() {
    setIsPlaying(prev => !prev);
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    const ms = Math.floor((time * 100) % 100)
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = clickX / rect.width
    const newTime = percent * totalDuration
    setCurrentTime(newTime)
  }

  const handleRender = async () => {
    setIsProcessing(true)
    setShowExportDialog(true)
    setExportProgress(0)
    setExportError(null)
    
    try {
      const payload = {
        tracks: tracks,
        resolution: resolution,
        fps: fps,
        duration: totalDuration,
        textColor,
        strokeColor,
        textShadowColor,
        strokeWidth
      }
      
      const formData = new URLSearchParams()
      formData.append('data', JSON.stringify(payload))
      
      const res = await fetch('http://localhost:8000/process-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      })
      
      const data = await res.json()
      if (data.status === 'started' && data.job_id) {
        setRenderTasks(prev => [...prev, {
          id: data.job_id,
          title: 'Timeline Export',
          details: 'Rendering with FFmpeg...',
          status: 'Rendering 0%',
          progress: 0
        }])
      } else {
        setExportError("Failed to start export.")
      }
    } catch (error) {
      setExportError(String(error));
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
            <span className="font-semibold text-xs tracking-wide text-white">AutoVideo Pro</span>
          </div>
          <nav className="flex space-x-4 text-[11px] text-white/70">
            <button className="hover:text-white transition-colors">File</button>
            <button className="hover:text-white transition-colors">Edit</button>
            <button className="hover:text-white transition-colors">View</button>
            <button className="hover:text-white transition-colors">Sequence</button>
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
            <SidebarItem icon={<ImageIcon />} label="Media" active={activeTab === 'media'} onClick={() => setActiveTab('media')} />
            <SidebarItem icon={<Scissors />} label="Edit" active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
            <SidebarItem icon={<Zap />} label="Quick Edit" active={activeTab === 'quick-edit'} onClick={() => setActiveTab('quick-edit')} />
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
              <div className="flex items-center justify-between bg-[#1f1f26] border border-[#262630] rounded px-2 py-1 relative">
                <select value={resolution} onChange={e => setResolution(e.target.value)} className="bg-transparent text-xs text-white/90 outline-none w-full appearance-none cursor-pointer">
                  <option value="1080x1920">1080x1920 (9:16)</option>
                  <option value="1920x1080">1920x1080 (16:9)</option>
                  <option value="1080x1080">1080x1080 (1:1)</option>
                </select>
                <ChevronDown className="w-3 h-3 text-white/50 absolute right-2 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/50">Frame Rate</label>
              <div className="flex items-center justify-between bg-[#1f1f26] border border-[#262630] rounded px-2 py-1 relative">
                <select value={fps} onChange={e => setFps(Number(e.target.value))} className="bg-transparent text-xs text-white/90 outline-none w-full appearance-none cursor-pointer">
                  <option value="24">24 FPS</option>
                  <option value="30">30 FPS</option>
                  <option value="60">60 FPS</option>
                </select>
                <ChevronDown className="w-3 h-3 text-white/50 absolute right-2 pointer-events-none" />
              </div>
            </div>
          </div>
        </aside>

        {/* Center Panel & Timeline */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d12]">
          
          {activeTab === 'automation' ? (
             <AutomationDashboard />
          ) : activeTab === 'auto-edit' ? (
             <AutoEditDashboard />
          ) : activeTab === 'dashboard' ? (
             <DashboardPanel sysStats={sysStats} />
          ) : activeTab === 'export' ? (
             <ExportPanel />
          ) : activeTab === 'upload' ? (
             <UploadPanel />
          ) : (
            <>
              {/* Top Center: Workspace */}
              <div className="flex-1 flex min-h-0">
                
                {/* Dynamic Left Tool Panel */}
                <LeftToolPanel 
                  activeTab={activeTab} 
                  mediaFiles={mediaFiles} 
                  selectedFile={selectedFile} 
                  setSelectedFile={setSelectedFile} 
                  handleSelectFile={handleSelectFile} 
                  assets={assets}
                />

                {/* Video Player Column */}
                <div className="flex-1 flex flex-col min-w-0 relative">
                   <div className="h-12 flex items-center justify-center space-x-4 border-b border-[#262630] bg-[#141419]">
                     <div className="flex items-center space-x-2 bg-[#0d0d12] border border-[#262630] rounded-md px-2 py-1">
                       <span className="text-[10px] text-white/70">{resolution}</span>
                     </div>
                     <div className="flex items-center space-x-2 bg-[#0d0d12] border border-[#262630] rounded-md px-2 py-1">
                       <span className="text-[10px] text-white/70">{fps} FPS</span>
                     </div>
                   </div>
                   
                   <div className="flex-1 bg-[#0d0d12] flex flex-col items-center justify-center p-6 relative">
                     {/* Video Area */}
                     <div className="relative aspect-[9/16] h-full max-h-[650px] bg-black rounded-sm shadow-2xl overflow-hidden border border-white/5 group">
                       <video 
                         ref={videoRef}
                         className="absolute inset-0 w-full h-full object-contain z-0"
                         style={{ filter: tracks.find(t => t.type === 'effect')?.clips.some(c => currentTime >= c.start && currentTime < c.start + c.duration && c.lutPath) ? 'contrast(1.2) saturate(1.2) sepia(0.2)' : 'none' }}
                         muted
                       />
                       
                       {/* Text Overlays Layer */}
                       {tracks.find(t => t.type === 'text')?.clips.map(clip => {
                         if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
                           return (
                             <div key={clip.id} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-8">
                               <div className="text-center font-['Bebas_Neue']" style={{ 
                                   WebkitTextStroke: `${strokeWidth}px ${strokeColor}`
                               }}>
                                  <h1 className="text-5xl text-white drop-shadow-lg tracking-wider uppercase leading-tight" style={{ color: textColor, textShadow: `0px ${strokeWidth}px 10px ${textShadowColor}` }}>
                                    {clip.text || topText}
                                  </h1>
                               </div>
                             </div>
                           )
                         }
                         return null;
                       })}
                     </div>
                 
                 {/* Player Controls */}
                 <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center z-20 bg-[#0d0d12]/80 backdrop-blur py-2">
                    <div className="flex items-center justify-center space-x-6">
                      <span className="text-[10px] font-mono text-brand-400">{formatTime(currentTime)} <span className="text-white/40">/ {formatTime(totalDuration)}</span></span>
                      
                      <div className="flex items-center space-x-4">
                        <button className="text-white/60 hover:text-white transition-colors" onClick={() => setCurrentTime(Math.max(0, currentTime - 1))}><SkipBack className="w-4 h-4 fill-current" /></button>
                        <button onClick={togglePlay} className="text-white/60 hover:text-white transition-colors outline-none focus:outline-none">
                          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>
                        <button className="text-white/60 hover:text-white transition-colors" onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 1))}><SkipForward className="w-4 h-4 fill-current" /></button>
                      </div>

                      <div className="flex items-center space-x-2 text-white/40">
                         <VolumeIcon />
                         <div className="w-16 h-1 bg-[#262630] rounded-full overflow-hidden">
                           <div className="w-2/3 h-full bg-brand-500 rounded-full"></div>
                         </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-white/60">
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
                <button className="flex-1 py-3 text-xs font-medium text-white/50 hover:text-white transition-colors">Export</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Text Overlay editor */}
                {(() => {
                  if (!selectedClipId) return <div><h3 className="text-xs font-medium text-white/50 italic mb-3">Select a clip to edit its properties.</h3></div>;
                  
                  let activeClip: Clip | undefined;
                  let activeTrackType: string | undefined;
                  tracks.forEach(t => {
                    const c = t.clips.find(c => c.id === selectedClipId);
                    if (c) { activeClip = c; activeTrackType = t.type; }
                  });

                  if (!activeClip) return <div><h3 className="text-xs font-medium text-white/50 italic mb-3">Select a clip to edit its properties.</h3></div>;

                  if (activeTrackType === 'text') {
                    return (
                      <div>
                        <h3 className="text-xs font-medium text-white mb-3 flex items-center"><Type className="w-3.5 h-3.5 mr-2 text-brand-500" /> Text Properties</h3>
                        <div className="space-y-3">
                          <textarea 
                            value={activeClip.text || topText}
                            onChange={(e) => {
                              setTracks(prev => prev.map(t => t.type === 'text' ? {
                                ...t, clips: t.clips.map(c => c.id === selectedClipId ? { ...c, text: e.target.value } : c)
                              } : t));
                            }}
                            className="w-full h-20 bg-[#1f1f26] border border-[#262630] rounded-md p-2 text-xs text-white focus:outline-none focus:border-brand-500" 
                          />
                          <ColorPropRow label="Fill Color" color={textColor} value={fontSize} onChangeColor={setTextColor} onChangeValue={setFontSize} />
                          <ColorPropRow label="Stroke Color" color={strokeColor} value={strokeWidth} onChangeColor={setStrokeColor} onChangeValue={setStrokeWidth} />
                          <ColorPropRow label="Shadow Color" color={textShadowColor} value={5} onChangeColor={setTextShadowColor} />
                        </div>
                      </div>
                    );
                  }

                  if (activeTrackType === 'video' || activeTrackType === 'audio') {
                    return (
                      <div>
                        <h3 className="text-xs font-medium text-white mb-3 flex items-center"><SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-brand-500" /> Clip Properties</h3>
                        <div className="space-y-4">
                           <div>
                             <div className="flex justify-between text-[10px] text-white/50 mb-1"><span>Volume</span><span>100%</span></div>
                             <input type="range" className="w-full accent-brand-500" defaultValue="100" />
                           </div>
                           {activeTrackType === 'video' && (
                             <>
                               <div>
                                 <div className="flex justify-between text-[10px] text-white/50 mb-1"><span>Scale</span><span>100%</span></div>
                                 <input type="range" className="w-full accent-brand-500" defaultValue="100" />
                               </div>
                               <div>
                                 <div className="flex justify-between text-[10px] text-white/50 mb-1"><span>Opacity</span><span>100%</span></div>
                                 <input type="range" className="w-full accent-brand-500" defaultValue="100" />
                               </div>
                             </>
                           )}
                        </div>
                      </div>
                    );
                  }

                  if (activeTrackType === 'effect') {
                    return (
                      <div>
                        <h3 className="text-xs font-medium text-white mb-3 flex items-center"><Sparkles className="w-3.5 h-3.5 mr-2 text-purple-500" /> Effect Properties</h3>
                        <div className="space-y-4">
                           <div>
                             <div className="flex justify-between text-[10px] text-white/50 mb-1"><span>Intensity</span><span>50%</span></div>
                             <input type="range" className="w-full accent-purple-500" defaultValue="50" />
                           </div>
                           <div>
                             <div className="flex justify-between text-[10px] text-white/50 mb-1"><span>Duration</span><span>{activeClip.duration.toFixed(1)}s</span></div>
                             <input type="range" className="w-full accent-purple-500" min="0.5" max="10" step="0.1" value={activeClip.duration} onChange={(e) => {
                               const newDur = parseFloat(e.target.value);
                               setTracks(prev => prev.map(t => t.type === 'effect' ? {
                                 ...t, clips: t.clips.map(c => c.id === selectedClipId ? { ...c, duration: newDur } : c)
                               } : t));
                             }} />
                           </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}
                
                <div className="w-full h-px bg-[#262630]"></div>

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
                </div>

              </div>
            </div>

          </div>

          {/* Timeline Section */}
          <div className="h-72 bg-[#0d0d12] border-t border-[#262630] flex flex-col relative select-none">
            {/* Timeline Toolbar */}
            <div className="h-10 flex items-center justify-between px-4 bg-[#141419] border-b border-[#262630]">
               <div className="flex items-center space-x-1 text-white/60">
                 <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 rounded hover:bg-[#262630] disabled:opacity-30 disabled:hover:bg-transparent"><Undo className="w-3.5 h-3.5" /></button>
                 <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded hover:bg-[#262630] disabled:opacity-30 disabled:hover:bg-transparent"><Redo className="w-3.5 h-3.5" /></button>
                 <div className="w-px h-4 bg-[#262630] mx-2"></div>
                 <button onClick={splitClip} className="p-1.5 rounded hover:bg-[#262630] group relative" title="Split Clip (C)"><Scissors className="w-3.5 h-3.5 group-hover:text-brand-400" /></button>
                 <button onClick={deleteSelectedClip} className="p-1.5 rounded hover:bg-[#262630] group" title="Delete Clip (Backspace)"><Trash2 className="w-3.5 h-3.5 group-hover:text-danger-400" /></button>
                 <button onClick={duplicateSelectedClip} className="p-1.5 rounded hover:bg-[#262630]" title="Duplicate (Cmd+D)"><Copy className="w-3.5 h-3.5" /></button>
                 <div className="w-px h-4 bg-[#262630] mx-2"></div>
                 <button className="p-1.5 rounded hover:bg-[#262630]"><MousePointer2 className="w-3.5 h-3.5 text-brand-500" /></button>
               </div>
               
               <div className="flex items-center space-x-4">
                 <input 
                   type="range" 
                   min="0.1" max="5" step="0.1" 
                   value={timelineZoom} 
                   onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
                   className="w-24 accent-brand-500"
                 />
                 <Maximize2 className="w-3 h-3 text-white/50" />
               </div>
            </div>

            {/* Tracks Area */}
            <div className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#0d0d12]" id="timeline-container">
               <div className="min-w-full flex flex-col relative" style={{ width: `calc(10rem + ${100 * timelineZoom}%)` }}>
                 {/* Time ruler */}
                 <div className="h-6 border-b border-[#262630] flex sticky top-0 z-40 bg-[#141419]">
                    <div className="w-40 bg-[#141419] border-r border-[#262630] z-50 shrink-0 sticky left-0"></div>
                    <div className="flex-1 relative cursor-text" onClick={handleTimelineClick}>
                       {Array.from({length: Math.ceil(totalDuration / 5)}).map((_, i) => (
                          <div key={i} className="absolute top-0 bottom-0 border-l border-[#262630] pl-1 text-[9px] text-white/30 font-mono select-none" style={{ left: `${(i * 5 / totalDuration) * 100}%` }}>
                             00:{(i * 5).toString().padStart(2, '0')}
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Playhead Guide */}
                 <div className="absolute top-6 bottom-0 w-px bg-brand-500 z-40 pointer-events-none"
                   style={{ left: `calc(10rem + ${(currentTime / totalDuration) * 100}%)` }}
                 >
                   <div className="absolute top-0 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-sm bg-brand-500 rotate-45"></div>
                 </div>

                 <div className="space-y-[2px]">
                   {tracks.map(track => (
                     <div key={track.id} className="flex h-12 bg-[#141419]/50 hover:bg-[#141419] transition-colors border-b border-[#262630]/50 relative group">
                       {/* Track Header */}
                       <div className="w-40 border-r border-[#262630] flex flex-col justify-center px-3 bg-[#141419] z-30 shrink-0 sticky left-0">
                         <div className="flex items-center space-x-2">
                           {track.type === 'video' ? <Video className="w-3 h-3 text-white/40" /> :
                            track.type === 'audio' ? <Music className="w-3 h-3 text-white/40" /> :
                            track.type === 'text' ? <Type className="w-3 h-3 text-white/40" /> :
                            <Sparkles className="w-3 h-3 text-white/40" />}
                           <span className="text-[9px] text-white/60 truncate">{track.name}</span>
                         </div>
                       </div>
                       
                       {/* Track Canvas */}
                       <div 
                         id={`track-${track.id}`}
                         className="flex-1 relative" 
                         onClick={handleTimelineClick}
                         onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                         }}
                         onDrop={(e) => {
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const percent = clickX / rect.width;
                            const newTime = percent * totalDuration;

                            const file = e.dataTransfer.getData('mediaPath');
                            const effect = e.dataTransfer.getData('effect');
                            const isLut = e.dataTransfer.getData('isLut') === 'true';
                            const lutPath = e.dataTransfer.getData('lutPath');
                            const transition = e.dataTransfer.getData('transition');
                            const textPreset = e.dataTransfer.getData('textPreset');

                            if (file) {
                                const newVideoClip: Clip = {
                                  id: Math.random().toString(36).substr(2, 9),
                                  name: file.split('/').pop() || 'Video',
                                  type: track.type,
                                  start: newTime,
                                  duration: 5,
                                  sourceStart: 0,
                                  sourceFile: file,
                                };
                                
                                setTracks(prevTracks => {
                                   const newTracks = prevTracks.map(t => t.id === track.id ? { ...t, clips: [...t.clips, newVideoClip] } : t);
                                   setHistory(prevHistory => {
                                      const idx = historyIndexRef.current;
                                      const newHistory = prevHistory.slice(0, idx + 1);
                                      newHistory.push(newTracks);
                                      if (newHistory.length > 50) newHistory.shift();
                                      return newHistory;
                                   });
                                   setHistoryIndex(prev => Math.min(prev + 1, 49));
                                   return newTracks;
                                });

                                const videoElement = document.createElement('video');
                                videoElement.src = `file://${file}`;
                                videoElement.onloadedmetadata = () => {
                                  const dur = videoElement.duration;
                                  if (dur > 0 && !isNaN(dur)) {
                                    setTotalDuration(prevDur => dur + newTime > prevDur ? dur + newTime + 10 : prevDur);
                                    setTracks(prev => prev.map(t => t.id === track.id ? {
                                      ...t, clips: t.clips.map(c => c.id === newVideoClip.id ? { ...c, duration: dur } : c)
                                    } : t));
                                  }
                                };
                            } else if (effect || transition || textPreset) {
                               const newItemType = effect ? 'effect' : transition ? 'effect' : 'text';
                               const newItemName = effect || transition || textPreset;
                               if (track.type !== newItemType) {
                                 // Only allow drops on matching tracks for simplicity, or automatically find the right track
                                 // In a real NLE, dropping an effect on a video clip applies it to the clip.
                                 // Here we add it as an adjustment layer on the effect track if it's an effect/transition
                               }
                               
                               const newClip: Clip = {
                                  id: Math.random().toString(36).substr(2, 9),
                                  name: newItemName,
                                  type: track.type,
                                  start: newTime,
                                  duration: transition ? 2 : 5,
                                  sourceStart: 0,
                                  text: textPreset ? 'NEW TEXT' : undefined,
                               };
                               
                               if (isLut && lutPath) {
                                  // @ts-ignore
                                  newClip.lutPath = lutPath;
                               }
                               
                               setTracks(prevTracks => {
                                   // Put it on the matching track type
                                   const targetTrackId = prevTracks.find(t => t.type === newItemType)?.id || track.id;
                                   const newTracks = prevTracks.map(t => t.id === targetTrackId ? { ...t, clips: [...t.clips, newClip] } : t);
                                   setHistory(prevHistory => {
                                      const idx = historyIndexRef.current;
                                      const newHistory = prevHistory.slice(0, idx + 1);
                                      newHistory.push(newTracks);
                                      if (newHistory.length > 50) newHistory.shift();
                                      return newHistory;
                                   });
                                   setHistoryIndex(prev => Math.min(prev + 1, 49));
                                   return newTracks;
                               });
                            }
                         }}
                       >
                          {track.clips.map(clip => {
                            const leftPercent = (clip.start / totalDuration) * 100;
                            const widthPercent = (clip.duration / totalDuration) * 100;
                          const isSelected = selectedClipId === clip.id;
                          
                          let bgClass = 'bg-[#1f1f26] border-[#262630]';
                          if (track.type === 'video') bgClass = 'bg-brand-900/30 border-brand-500/50';
                          if (track.type === 'text') bgClass = 'bg-amber-500/20 border-amber-500/50';
                          if (track.type === 'audio') bgClass = 'bg-success-500/20 border-success-500/50';
                          if (track.type === 'effect') bgClass = 'bg-purple-500/20 border-purple-500/50';

                          return (
                            <div 
                              key={clip.id} 
                              className={clsx(
                                "absolute top-1 bottom-1 rounded border overflow-hidden transition-shadow group/clip cursor-grab active:cursor-grabbing",
                                bgClass,
                                isSelected ? "shadow-[0_0_0_1px_#fff] z-10" : ""
                              )}
                              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                              onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, 'move')}
                            >
                              {track.type === 'audio' && (
                                <div className="absolute inset-0 flex items-center justify-around opacity-30 pointer-events-none overflow-hidden px-1">
                                  {Array.from({length: 40}).map((_, i) => (
                                    <div key={i} className="w-[1px] bg-success-500 rounded-full" style={{ height: `${Math.max(10, Math.random() * 80)}%` }} />
                                  ))}
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center px-2 pointer-events-none z-10">
                                <span className="text-[9px] text-white/80 truncate drop-shadow-md">{clip.name}</span>
                              </div>
                              
                              {/* Trim handles */}
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-2 hover:bg-white/50 cursor-col-resize z-20"
                                onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, 'trim-start')}
                              />
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-2 hover:bg-white/50 cursor-col-resize z-20"
                                onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, 'trim-end')}
                              />
                            </div>
                          )
                        })}
                     </div>
                   </div>
                 ))}
               </div>
               </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      {/* Export Dialog Overlay */}
      {showExportDialog && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200" onClick={() => !isProcessing && setShowExportDialog(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] bg-[#0d0d12] rounded-xl shadow-2xl border border-[#262630] p-8 w-[90vw] max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {exportProgress >= 100 && !exportError ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-success-500/20 flex items-center justify-center ring-1 ring-success-500/50">
                      <Download className="w-6 h-6 text-success-500" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-bold text-white block">Export Complete</span>
                      <span className="text-sm text-white/50">Your video is ready to share.</span>
                    </div>
                  </>
                ) : (
                  <>
                    {isProcessing ? (
                      <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <Download className="w-6 h-6 text-white/80" />
                      </div>
                    )}
                    <div>
                      <span className="text-xl font-bold text-white block">{exportError ? "Export Failed" : isProcessing ? "Rendering Video..." : "Exporting..."}</span>
                      <span className="text-sm text-white/50">{exportError ? "Please try again." : "This might take a moment."}</span>
                    </div>
                  </>
                )}
              </div>
              {!isProcessing && (
                <button onClick={() => setShowExportDialog(false)} className="p-2 hover:bg-white/10 text-white/40 hover:text-white rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {exportError && (
              <div className="mb-6 animate-in slide-in-from-top-2">
                <div className="bg-danger-500/10 border border-danger-500/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="p-1 bg-danger-500/20 rounded-full">
                    <X className="w-3 h-3 text-danger-400" />
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-danger-400 leading-relaxed overflow-hidden h-24 overflow-y-auto">
                    {exportError}
                  </p>
                </div>
              </div>
            )}

            {(isProcessing || (exportProgress > 0 && exportProgress < 100)) && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-white/50 uppercase tracking-wider">
                    <span>Rendering Frames</span>
                    <span className="font-mono text-white/90">{exportProgress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-brand-500 shadow-[0_0_10px_rgba(116,69,255,0.3)] transition-all duration-300 ease-out" style={{ width: `${exportProgress}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Format</div>
                    <div className="text-white/90 font-medium text-sm">MP4 Video</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Status</div>
                    <div className="text-white/90 font-medium text-sm">{isProcessing ? "Encoding" : "Done"}</div>
                  </div>
                </div>
              </div>
            )}
            
            {exportProgress >= 100 && !exportError && (
              <div className="pt-4">
                <button onClick={() => setShowExportDialog(false)} className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors">
                  Close
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer Status Bar */}
      <footer className="h-8 bg-[#0d0d12] border-t border-[#262630] flex items-center px-4 justify-between text-[9px] font-mono text-white/50">
         <div className="flex items-center space-x-6">
           <div className="flex items-center space-x-1.5">
             <span>Python Backend:</span>
             <span className="text-success-500">Connected</span>
             <div className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse"></div>
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

function SidebarItem({ icon, label, active, onClick, isBrand = false }: any) {
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

function ColorPropRow({ label, color, value, onChangeColor, onChangeValue }: any) {
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

function RenderTask({ title, details, status, progress }: any) {
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

function VolumeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>
  )
}
