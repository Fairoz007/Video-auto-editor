import { useState } from 'react'
import { Film, Scissors, Play, Settings, FolderOpen, FileVideo } from 'lucide-react'

export default function AutoEditDashboard() {
  const [activeEngine, setActiveEngine] = useState<'movie' | 'shorts'>('movie')
  
  // Movie args
  const [movieTitle, setMovieTitle] = useState('Movie Name')
  const [movieSeconds, setMovieSeconds] = useState('60')
  const [movieResolution, setMovieResolution] = useState('1080x1920')
  const [movieInput, setMovieInput] = useState('Movies')
  const [moviePart, setMoviePart] = useState('0')
  const [movieBass, setMovieBass] = useState(false)
  const [movieResume, setMovieResume] = useState(false)
  
  // Shorts args
  const [shortsInput, setShortsInput] = useState('')
  const [shortsTopText, setShortsTopText] = useState('Part {}')
  const [shortsBottomText, setShortsBottomText] = useState('Five Smokes')

  const [status, setStatus] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  const handleSelectFolder = async (setter: (val: string) => void) => {
    try {
      // @ts-ignore
      const folder = await window.api.selectFolder()
      if (folder) setter(folder)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelectFile = async (setter: (val: string) => void) => {
    try {
      // @ts-ignore
      const file = await window.api.selectFile()
      if (file) setter(file)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRunMovie = async () => {
    setIsRunning(true)
    setStatus('Running Movie Auto Editor...')
    try {
      const args = [
        '--title', movieTitle,
        '--seconds', movieSeconds,
        '--resolution', movieResolution,
        '--input', movieInput,
        '--part', moviePart
      ]
      if (movieBass) args.push('--bass')
      if (movieResume) args.push('--resume')
      
      // @ts-ignore
      const res = await window.api.runPython('movie_editor.py', args)
      if (res.success) {
        setStatus('Movie auto edit completed successfully!')
      } else {
        setStatus('Failed. Check logs.')
      }
    } catch (e) {
      setStatus('Error running script.')
    } finally {
      setIsRunning(false)
    }
  }

  const handleRunShorts = async () => {
    setIsRunning(true)
    setStatus('Running Valorant Shorts Editor...')
    try {
      const args = [
        '--input', shortsInput,
        '--top_text', shortsTopText,
        '--bottom_text', shortsBottomText
      ]
      // @ts-ignore
      const res = await window.api.runPython('shorts_editor.py', args)
      if (res.success) {
        setStatus('Shorts auto edit completed successfully!')
      } else {
        setStatus('Failed. Check logs.')
      }
    } catch (e) {
      setStatus('Error running script.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white">Auto Edit Engine</h2>
          <p className="text-white/40 text-sm">Automate your video processing pipelines</p>
        </div>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-[#262630] pb-4">
        <button 
          onClick={() => setActiveEngine('movie')}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeEngine === 'movie' ? 'bg-brand-500 text-white' : 'bg-[#1f1f26] text-white/50 hover:text-white border border-[#262630]'}`}
        >
          <Film className="w-4 h-4 mr-2" /> Movie Auto Edit
        </button>
        <button 
          onClick={() => setActiveEngine('shorts')}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeEngine === 'shorts' ? 'bg-brand-500 text-white' : 'bg-[#1f1f26] text-white/50 hover:text-white border border-[#262630]'}`}
        >
          <Scissors className="w-4 h-4 mr-2" /> Valorant Shorts Editor
        </button>
      </div>

      {activeEngine === 'movie' && (
        <div className="space-y-6 max-w-xl">
          <div className="space-y-4 glass-card p-6 rounded-xl border border-white/5 bg-[#141419]">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Input Folder/File</label>
              <div className="flex space-x-2">
                <input type="text" value={movieInput} onChange={e => setMovieInput(e.target.value)} className="flex-1 bg-[#0d0d12] border border-[#262630] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none" />
                <button onClick={() => handleSelectFolder(setMovieInput)} className="px-3 bg-[#1f1f26] border border-[#262630] rounded-lg hover:bg-[#2a2a35] transition-colors" title="Select Folder">
                  <FolderOpen className="w-4 h-4 text-white/70" />
                </button>
                <button onClick={() => handleSelectFile(setMovieInput)} className="px-3 bg-[#1f1f26] border border-[#262630] rounded-lg hover:bg-[#2a2a35] transition-colors" title="Select File">
                  <FileVideo className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Base Title Text</label>
              <input type="text" value={movieTitle} onChange={e => setMovieTitle(e.target.value)} className="w-full bg-[#0d0d12] border border-[#262630] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Target Seconds</label>
                <input type="text" value={movieSeconds} onChange={e => setMovieSeconds(e.target.value)} className="w-full bg-[#0d0d12] border border-[#262630] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Resolution</label>
                <input type="text" value={movieResolution} onChange={e => setMovieResolution(e.target.value)} className="w-full bg-[#0d0d12] border border-[#262630] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Start Part</label>
                <input type="text" value={moviePart} onChange={e => setMoviePart(e.target.value)} className="w-full bg-[#0d0d12] border border-[#262630] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex items-center space-x-6 pt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={movieBass} onChange={e => setMovieBass(e.target.checked)} className="accent-brand-500" />
                <span className="text-xs text-white/70">Bass Boosted (Copyright bypass)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={movieResume} onChange={e => setMovieResume(e.target.checked)} className="accent-brand-500" />
                <span className="text-xs text-white/70">Resume Previous</span>
              </label>
            </div>
            
            <div className="pt-4 flex items-center justify-between border-t border-[#262630] mt-6">
              <span className="text-xs text-brand-400 font-medium">{status}</span>
              <button onClick={handleRunMovie} disabled={isRunning} className="px-6 py-2 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center shadow-lg shadow-brand-500/20">
                {isRunning ? <Settings className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Start Processing
              </button>
            </div>
          </div>
        </div>
      )}

      {activeEngine === 'shorts' && (
        <div className="space-y-6 max-w-xl">
          <div className="space-y-4 glass-card p-6 rounded-xl border border-white/5 bg-[#141419]">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Input Folder (Valorant Clips)</label>
              <div className="flex space-x-2">
                <input type="text" value={shortsInput} onChange={e => setShortsInput(e.target.value)} className="flex-1 bg-[#0d0d12] border border-[#262630] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none" placeholder="C:\Videos\Valorant" />
                <button onClick={() => handleSelectFolder(setShortsInput)} className="px-3 bg-[#1f1f26] border border-[#262630] rounded-lg hover:bg-[#2a2a35] transition-colors">
                  <FolderOpen className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Top Text Template (use {} for part number)</label>
              <input type="text" value={shortsTopText} onChange={e => setShortsTopText(e.target.value)} className="w-full bg-[#0d0d12] border border-[#262630] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Bottom Text</label>
              <input type="text" value={shortsBottomText} onChange={e => setShortsBottomText(e.target.value)} className="w-full bg-[#0d0d12] border border-[#262630] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none" />
            </div>
            
            <div className="pt-4 flex items-center justify-between border-t border-[#262630] mt-6">
              <span className="text-xs text-brand-400 font-medium">{status}</span>
              <button onClick={handleRunShorts} disabled={isRunning || !shortsInput} className="px-6 py-2 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center shadow-lg shadow-brand-500/20">
                {isRunning ? <Settings className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Start Processing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
