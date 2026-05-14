import React from 'react';
import { Download, Upload, Image as ImageIcon, Type, Sparkles, SlidersHorizontal, Music, MessageSquare, Plus, Check, Scissors, Zap } from 'lucide-react';
import clsx from 'clsx';

export default function LeftToolPanel({ activeTab, mediaFiles, selectedFile, setSelectedFile, handleSelectFile, assets }: any) {
  
  if (activeTab === 'media') {
    return (
      <div className="w-[300px] border-r border-[#262630] bg-[#141419] flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-[#262630]">
          <h2 className="text-sm font-semibold text-white">Project Media</h2>
          <div className="flex items-center space-x-2">
            <button onClick={handleSelectFile} className="flex items-center space-x-1 px-2 py-1 bg-[#262630] hover:bg-[#32323e] rounded text-xs transition-colors">
              <Download className="w-3 h-3 text-brand-400" />
              <span>Import</span>
            </button>
          </div>
        </div>

        <div className="flex px-4 py-2 space-x-4 border-b border-[#262630]">
          <button className="text-xs font-medium text-brand-400 border-b-2 border-brand-400 pb-1">All</button>
          <button className="text-xs font-medium text-white/50 hover:text-white transition-colors pb-1">Videos</button>
          <button className="text-xs font-medium text-white/50 hover:text-white transition-colors pb-1">Audio</button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div onClick={handleSelectFile} className="border-2 border-dashed border-[#262630] hover:border-brand-500/50 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#1f1f26]/50 group">
            <Upload className="w-6 h-6 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs text-white/80">Drag & Drop Files Here</p>
            <p className="text-[10px] text-white/40 mt-1">or click to import</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {mediaFiles.map((file: string) => (
              <div 
                key={file}
                draggable
                onDragStart={(e) => {
                   e.dataTransfer.setData('mediaPath', file);
                   e.dataTransfer.effectAllowed = 'copy';
                }}
                className={clsx("group relative rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing transition-colors col-span-2", selectedFile === file ? "border-brand-500" : "border-[#262630] hover:border-brand-500")}
                onClick={() => setSelectedFile(file)}
              >
                 <video src={`file://${file}`} className="w-full aspect-video object-cover bg-black" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                   <span className="text-[10px] font-semibold text-white px-2 py-1 bg-brand-500 rounded">Drag to Timeline</span>
                 </div>
                 <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                   <p className="text-[10px] text-white/90 truncate">{file.split('/').pop()}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'text') {
    const textPresets = ['Basic Title', 'Cinematic Fade', 'Glitch Reveal', 'Lower Third', 'Neon Glow'];
    return (
      <div className="w-[300px] border-r border-[#262630] bg-[#141419] flex flex-col">
        <div className="p-4 border-b border-[#262630]">
          <h2 className="text-sm font-semibold text-white flex items-center"><Type className="w-4 h-4 mr-2 text-amber-500" /> Text Presets</h2>
        </div>
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 gap-3">
          {textPresets.map(preset => (
            <div 
              key={preset} 
              draggable
              onDragStart={(e) => {
                 e.dataTransfer.setData('textPreset', preset);
                 e.dataTransfer.effectAllowed = 'copy';
              }}
              className="bg-[#1f1f26] border border-[#262630] rounded-lg p-4 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:border-amber-500 group transition-colors"
            >
              <Type className="w-8 h-8 text-white/20 group-hover:text-amber-500 mb-2 transition-colors" />
              <span className="text-xs text-white/80 text-center">{preset}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'effects') {
    const loadedLuts: {name: string, category: string, isLut: boolean, path: string}[] = [];
    if (assets?.luts) {
       Object.keys(assets.luts).forEach(category => {
          const lutsCat = assets.luts[category];
          if (lutsCat?._files) {
             lutsCat._files.forEach((f: string) => {
               if (f.endsWith('.cube')) loadedLuts.push({ name: f.replace('.cube', ''), category, isLut: true, path: `assets/luts/${category}/${f}` });
             });
          }
       });
    }
    const standardEffects = ['Gaussian Blur', 'Cinematic LUT', 'VHS Glitch', 'Lens Flare', 'Color Grade', 'Vignette', 'Sharpen'].map(e => ({ name: e, category: 'Standard', isLut: false, path: '' }));
    const allEffects = [...standardEffects, ...loadedLuts];

    return (
      <div className="w-[300px] border-r border-[#262630] bg-[#141419] flex flex-col">
        <div className="p-4 border-b border-[#262630]">
          <h2 className="text-sm font-semibold text-white flex items-center"><Sparkles className="w-4 h-4 mr-2 text-purple-500" /> Effects & LUTs</h2>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {allEffects.map(effect => (
            <div 
              key={effect.name} 
              draggable
              onDragStart={(e) => {
                 e.dataTransfer.setData('effect', effect.name);
                 if (effect.isLut) {
                   e.dataTransfer.setData('isLut', 'true');
                   e.dataTransfer.setData('lutPath', effect.path);
                 }
                 e.dataTransfer.effectAllowed = 'copy';
              }}
              className="bg-[#1f1f26] border border-[#262630] rounded-lg p-3 flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-purple-500 transition-colors"
            >
              <div>
                <span className="text-sm text-white/90 block">{effect.name}</span>
                <span className="text-[9px] text-white/40 block mt-0.5">{effect.category} {effect.isLut && 'LUT'}</span>
              </div>
              <Plus className="w-4 h-4 text-white/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'transitions') {
    const loadedTransitions: {name: string, category: string}[] = [];
    if (assets?.transitions) {
       Object.keys(assets.transitions).forEach(category => {
          const trCat = assets.transitions[category];
          if (trCat?._files) {
             trCat._files.forEach((f: string) => {
               loadedTransitions.push({ name: f, category });
             });
          }
       });
    }
    const standardTransitions = ['Cross Dissolve', 'Dip to Black', 'Wipe', 'Slide', 'Zoom', 'Spin', 'Glitch'].map(t => ({ name: t, category: 'Standard' }));
    const allTransitions = [...standardTransitions, ...loadedTransitions];

    return (
      <div className="w-[300px] border-r border-[#262630] bg-[#141419] flex flex-col">
        <div className="p-4 border-b border-[#262630]">
          <h2 className="text-sm font-semibold text-white flex items-center"><SlidersHorizontal className="w-4 h-4 mr-2 text-cyan-500" /> Transitions</h2>
        </div>
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 gap-3">
          {allTransitions.map(t => (
            <div 
              key={t.name} 
              draggable
              onDragStart={(e) => {
                 e.dataTransfer.setData('transition', t.name);
                 e.dataTransfer.effectAllowed = 'copy';
              }}
              className="bg-[#1f1f26] border border-[#262630] rounded-lg aspect-square flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:border-cyan-500 transition-colors text-center p-2 relative group"
            >
              <div className="w-8 h-8 rounded bg-cyan-500/10 mb-2 flex items-center justify-center">
                 <SlidersHorizontal className="w-4 h-4 text-cyan-500/50 group-hover:text-cyan-500" />
              </div>
              <span className="text-[10px] text-white/80 line-clamp-2 leading-tight">{t.name}</span>
              <span className="absolute bottom-1 text-[8px] text-white/30">{t.category}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'audio') {
    const audioTypes = ['Background Music', 'Sound Effects', 'Voiceover'];
    return (
      <div className="w-[300px] border-r border-[#262630] bg-[#141419] flex flex-col">
        <div className="p-4 border-b border-[#262630]">
          <h2 className="text-sm font-semibold text-white flex items-center"><Music className="w-4 h-4 mr-2 text-success-500" /> Audio Library</h2>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-6">
          {audioTypes.map(type => (
            <div key={type}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{type}</h3>
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-[#1f1f26] border border-[#262630] rounded p-2 flex items-center justify-between cursor-pointer hover:bg-[#262630]">
                    <span className="text-xs text-white/80">{type} {i}</span>
                    <span className="text-[10px] text-white/40">02:30</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'subtitles') {
    return (
      <div className="w-[300px] border-r border-[#262630] bg-[#141419] flex flex-col">
        <div className="p-4 border-b border-[#262630]">
          <h2 className="text-sm font-semibold text-white flex items-center"><MessageSquare className="w-4 h-4 mr-2 text-brand-500" /> Auto Captions</h2>
        </div>
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-brand-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Generate Subtitles</h3>
            <p className="text-xs text-white/50 mt-1">Automatically transcribe audio to text using AI.</p>
          </div>
          <button className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded text-xs font-medium w-full transition-colors">
            Start Transcription
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === 'quick-edit') {
    return (
      <div className="w-[300px] border-r border-[#262630] bg-[#141419] flex flex-col">
        <div className="p-4 border-b border-[#262630]">
          <h2 className="text-sm font-semibold text-white flex items-center"><Zap className="w-4 h-4 mr-2 text-brand-500" /> Quick Edit Tools</h2>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="bg-[#1f1f26] border border-[#262630] rounded-lg p-4 cursor-pointer hover:border-brand-500 transition-colors">
            <h3 className="text-xs font-medium text-white mb-1">Remove Silence</h3>
            <p className="text-[10px] text-white/50">Automatically cut dead air from selected clips.</p>
          </div>
          <div className="bg-[#1f1f26] border border-[#262630] rounded-lg p-4 cursor-pointer hover:border-brand-500 transition-colors">
            <h3 className="text-xs font-medium text-white mb-1">Beat Sync</h3>
            <p className="text-[10px] text-white/50">Cut video clips to match the audio beat.</p>
          </div>
          <div className="bg-[#1f1f26] border border-[#262630] rounded-lg p-4 cursor-pointer hover:border-brand-500 transition-colors">
            <h3 className="text-xs font-medium text-white mb-1">Auto Reel/Shorts</h3>
            <p className="text-[10px] text-white/50">Crop to 9:16, add auto-subtitles, and zoom effects.</p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to media if not recognized
  return <div className="w-[300px] border-r border-[#262630] bg-[#141419] flex flex-col items-center justify-center p-6 text-center">
      <Scissors className="w-12 h-12 text-white/10 mb-4" />
      <p className="text-sm text-white/50">Select tools from sidebar</p>
  </div>;
}
