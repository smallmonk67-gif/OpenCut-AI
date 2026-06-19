import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

// Note: opencut-wasm loading will be available after WASM compilation.
// We'll import it dynamically or assume it's loaded to prevent breakages if not compiled yet.

export const Route = createFileRoute('/editor/$projectId')({ component: Home })

function Home() {
  const { projectId } = useParams({ from: '/editor/$projectId' })
  const [wasmProj, setWasmProj] = useState<any>(null)
  const [projectState, setProjectState] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    // Dynamic import to avoid SSR issues or pre-compilation errors
    Promise.all([
      import('opencut-wasm'),
      import('opencut-wasm/opencut_wasm_bg.wasm?url')
    ]).then(async ([module, wasmUrlModule]) => {
      const init = module.default;
      const { WasmProject } = module;
      const wasmUrl = wasmUrlModule.default;
      
      // Initialize the WebAssembly module with the explicit URL
      await init(wasmUrl);
      
      const proj = new WasmProject("Project " + projectId.substring(0, 8));
      proj.add_track("Video Track 1");
      proj.add_track("Audio Track 1");
      setWasmProj(proj);
      setProjectState(proj.get_state());
    }).catch(err => {
      console.error(err);
      setErrorMsg(err.toString() + " | " + err.message);
    });
  }, [projectId]);

  // Basic timeline playback
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (isPlaying) {
        const delta = (time - lastTime) / 1000;
        setCurrentTime((prev) => prev + delta);
      }
      lastTime = time;
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  const handleAddClip = (trackId: string) => {
    if (!wasmProj) return;
    // Add a default clip of 5 seconds
    wasmProj.add_clip(trackId, "New Clip", currentTime, 5.0);
    setProjectState(wasmProj.get_state());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-[#141414] text-[#E4E4E4] overflow-hidden font-sans selection:bg-blue-500/30 text-sm">
      {/* Header */}
      <header className="h-12 border-b border-[#252525] bg-[#1a1a1a] flex items-center justify-between px-4 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors mr-2 flex items-center gap-1 text-xs font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              Projects
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/20">O</div>
              <h1 className="font-semibold text-neutral-200 tracking-wide">OpenCut</h1>
            </div>
          </div>
          <div className="h-4 w-px bg-white/10 mx-2"></div>
          {/* Main Menu */}
          <nav className="flex items-center gap-1">
            <button className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">File</button>
            <button className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">Edit</button>
            <button className="px-3 py-1.5 text-sm text-white bg-white/10 rounded-md transition-colors font-medium">Project</button>
            <button className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">View</button>
            <button className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">Help</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400 border border-white/10 px-3 py-1 rounded-full cursor-pointer hover:bg-white/5 transition-colors">My Awesome Edit</span>
          <button className="px-4 py-1.5 text-sm font-medium rounded-md text-neutral-300 hover:bg-white/10 transition-colors">Import</button>
          <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/20">Export</button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden bg-[#000000]">
        {/* Left Sidebar */}
        <aside className="w-[400px] border-r border-[#252525] bg-[#181818] flex z-10">
          {/* Vertical Tabs */}
          <div className="w-[72px] border-r border-[#252525] flex flex-col items-center py-2 gap-2 bg-[#141414]">
            {[
              { icon: 'M', label: 'Media' },
              { icon: 'A', label: 'Audio' },
              { icon: 'T', label: 'Text' },
              { icon: 'S', label: 'Stickers' },
              { icon: 'E', label: 'Effects' },
              { icon: 'T', label: 'Transitions' },
              { icon: 'F', label: 'Filters' },
              { icon: 'A', label: 'Adjustment' },
            ].map((tab, i) => (
              <button key={tab.label} className={`flex flex-col items-center justify-center w-14 h-14 rounded-md transition-colors ${i === 0 ? 'text-white bg-[#252525]' : 'text-[#888] hover:text-white hover:bg-[#252525]'}`}>
                <span className="text-lg mb-1 font-bold">{tab.icon}</span>
                <span className="text-[10px]">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Active Panel Area */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-[#252525]">
              <div className="flex gap-4">
                <button className="text-white font-medium text-sm pb-2 border-b-2 border-blue-500">Local</button>
                <button className="text-[#888] hover:text-white font-medium text-sm pb-2">Library</button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <button className="w-full bg-[#2A2A2A] hover:bg-[#333] border border-[#3A3A3A] text-white text-sm py-2 rounded mb-4 transition-colors">
                Import
              </button>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-video bg-[#222] rounded border border-[#333] hover:border-[#666] transition-colors cursor-pointer group relative overflow-hidden flex items-center justify-center">
                    <span className="text-[#555] text-xs">Video {i}</span>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="absolute bottom-1 left-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">Clip {i}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Center Canvas / Player */}
        <main className="flex-1 flex flex-col bg-[#000000] relative">
          {/* Player area */}
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-[#111]">
            <div className="w-full max-w-4xl aspect-video bg-black rounded shadow-2xl overflow-hidden relative z-10 flex items-center justify-center border border-[#252525]">
               {/* Synthesized placeholder for video player */}
               <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-black"></div>
               <p className="text-[#555] text-sm font-mono z-10">Player</p>
            </div>
          </div>

          {/* Player Controls */}
          <div className="h-12 border-t border-[#252525] bg-[#181818] flex items-center justify-between px-4 z-20">
            <div className="text-xs font-mono text-[#888] w-32">
              <span className="text-white">{formatTime(currentTime)}</span> / 00:01:00:00
            </div>

            <div className="flex items-center gap-4">
              <button className="text-[#888] hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L4 12L11 19V5Z"/><path d="M20 5L13 12L20 19V5Z"/></svg>
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-8 h-8 rounded-full bg-[#252525] hover:bg-[#333] text-white flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                )}
              </button>
              <button className="text-[#888] hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 5L20 12L13 19V5Z"/><path d="M4 5L11 12L4 19V5Z"/></svg>
              </button>
            </div>

            <div className="w-32 flex justify-end gap-3">
              <button className="text-[#888] hover:text-white text-xs">Original</button>
              <button className="text-[#888] hover:text-white">⛶</button>
            </div>
          </div>
        </main>

        {/* Right Inspector */}
        <aside className="w-[340px] border-l border-[#252525] bg-[#181818] flex flex-col z-10">
          <div className="px-4 border-b border-[#252525] flex gap-4">
            {['Video', 'Audio', 'Speed', 'Animation', 'Adjustment'].map((tab, i) => (
              <button key={tab} className={`py-3 text-xs font-medium ${i === 0 ? 'text-white border-b-2 border-blue-500' : 'text-[#888] hover:text-white'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Basic</h3>
                <button className="text-[#888] text-xs hover:text-white">Reset</button>
              </div>
              <div className="space-y-4 pl-2">
                <div>
                  <h4 className="text-xs text-[#888] mb-2">Position & Size</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded flex items-center justify-between px-2 py-1.5">
                      <span className="text-xs text-[#888]">X</span>
                      <input type="text" className="bg-transparent text-right w-16 outline-none text-xs text-white" defaultValue="0.0" />
                    </div>
                    <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded flex items-center justify-between px-2 py-1.5">
                      <span className="text-xs text-[#888]">Y</span>
                      <input type="text" className="bg-transparent text-right w-16 outline-none text-xs text-white" defaultValue="0.0" />
                    </div>
                    <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded flex items-center justify-between px-2 py-1.5 col-span-2">
                      <span className="text-xs text-[#888]">Scale</span>
                      <div className="flex items-center gap-2 flex-1 ml-2">
                        <input type="range" className="flex-1 h-1 bg-[#444] rounded-full appearance-none cursor-pointer" />
                        <input type="text" className="bg-transparent text-right w-12 outline-none text-xs text-white" defaultValue="100%" />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-[#888] mb-2">Blend</h4>
                  <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded px-3 py-1.5 flex items-center justify-between">
                    <span className="text-xs text-white">Normal</span>
                    <span className="text-[#888] text-xs">▼</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-[#888] w-12">Opacity</span>
                    <input type="range" className="flex-1 h-1 bg-[#444] rounded-full appearance-none cursor-pointer" />
                    <span className="text-xs text-white w-8 text-right">100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Timeline */}
      <div className="h-[40%] border-t border-[#252525] bg-[#181818] flex flex-col z-20">
        {/* Timeline Toolbar */}
        <div className="h-10 border-b border-[#252525] bg-[#1A1A1A] flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white rounded hover:bg-[#2A2A2A]"><span title="Undo">↩</span></button>
            <button className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white rounded hover:bg-[#2A2A2A]"><span title="Redo">↪</span></button>
            <div className="w-px h-4 bg-[#333] mx-1"></div>
            <button className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white rounded hover:bg-[#2A2A2A]"><span title="Split">✂</span></button>
            <button className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-white rounded hover:bg-[#2A2A2A]"><span title="Delete">🗑</span></button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[#888] text-xs">Zoom</span>
              <input type="range" className="w-24 h-1 bg-[#444] rounded-full appearance-none cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="h-6 border-b border-[#252525] flex bg-[#141414]">
          {/* Track Headers Area */}
          <div className="w-[180px] border-r border-[#252525] flex items-center px-4">
          </div>
          {/* Ruler */}
          <div className="flex-1 relative overflow-hidden">
            {/* Playhead indicator top */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-white z-10"
              style={{ left: `${(currentTime / 60) * 100}%` }}
            >
              <div className="absolute top-0 -left-1.5 w-3 h-2 bg-white rounded-sm"></div>
            </div>
            {/* Ruler ticks */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMTAwJSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSI4IiB4PSIwIiB5PSIxNiIgZmlsbD0iIzQ0NCIvPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjQiIHg9IjEwIiB5PSIyMCIgZmlsbD0iIzMzMyIvPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjQiIHg9IjIwIiB5PSIyMCIgZmlsbD0iIzMzMyIvPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjQiIHg9IjMwIiB5PSIyMCIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==')] opacity-50"></div>
          </div>
        </div>

        {/* Tracks */}
        <div className="flex-1 overflow-y-auto flex flex-col bg-[#111]">
          {projectState?.tracks.map((track: any) => (
            <div key={track.id} className="min-h-[60px] border-b border-[#252525] flex group">
              <div className="w-[180px] border-r border-[#252525] bg-[#181818] p-2 flex flex-col justify-center">
                <span className="text-xs text-[#E4E4E4] mb-1">{track.name}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAddClip(track.id)}
                    className="text-[#888] hover:text-white text-[10px]"
                    title="Add Clip"
                  >
                    + Add
                  </button>
                  <button className="text-[#888] hover:text-white text-[10px]" title="Mute">🔈</button>
                  <button className="text-[#888] hover:text-white text-[10px]" title="Hide">👁</button>
                </div>
              </div>
              <div className="flex-1 relative overflow-hidden">
                 {/* Playhead line continuing through tracks */}
                <div 
                  className="absolute top-0 bottom-0 w-px bg-white/50 pointer-events-none z-10"
                  style={{ left: `${(currentTime / 60) * 100}%` }}
                ></div>
                
                {/* Render actual Clips from WASM state */}
                {track.clips?.map((clip: any) => (
                  <div 
                    key={clip.id}
                    className="absolute top-2 bottom-2 bg-[#2E3C56] border border-[#4B6899] rounded flex items-center px-2 cursor-pointer hover:bg-[#384A6A] transition-colors"
                    style={{ 
                      left: `${(clip.start_time / 60) * 100}%`, 
                      width: `${(clip.duration / 60) * 100}%` 
                    }}
                  >
                    <span className="text-[10px] text-white truncate">{clip.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!projectState && (
            <div className="flex-1 flex flex-col items-center justify-center text-sm">
              {errorMsg ? (
                <>
                  <span className="text-red-400 mb-2">Error loading WebAssembly Engine:</span>
                  <span className="text-red-300 font-mono text-xs max-w-lg text-center break-words">{errorMsg}</span>
                </>
              ) : (
                <span className="text-[#888]">Loading engine...</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
