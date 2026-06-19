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
      import('opencut-wasm')
    ]).then(async ([module]) => {
      const init = module.default;
      const { WasmProject } = module;
      
      // Initialize the WebAssembly module
      await init();
      
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

  const handleDeleteClip = (clipId: string) => {
    if (!wasmProj) return;
    wasmProj.delete_clip(clipId);
    setProjectState(wasmProj.get_state());
  };

  const handleUpdateClip = (clipId: string, startTime: number, duration: number) => {
    if (!wasmProj) return;
    wasmProj.update_clip(clipId, startTime, duration);
    setProjectState(wasmProj.get_state());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white overflow-hidden font-sans selection:bg-purple-500/30">
      {/* Header */}
      <header className="h-14 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 z-20">
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
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-72 border-r border-white/10 bg-neutral-900/50 flex flex-col z-10 backdrop-blur-sm">
          <div className="flex p-2 gap-1 border-b border-white/5">
            {['Media', 'Text', 'Effects', 'Scripting'].map((tab, i) => (
              <button key={tab} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${i === 0 ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Project Assets</h3>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-video bg-neutral-800 rounded-md border border-white/5 hover:border-purple-500/50 transition-colors cursor-pointer group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="absolute bottom-1 left-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">Clip {i}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 rounded-md border border-dashed border-white/20 text-neutral-400 text-sm hover:border-purple-500/50 hover:text-purple-400 transition-colors">
              + Import Media
            </button>
          </div>
        </aside>

        {/* Center Canvas / Player */}
        <main className="flex-1 flex flex-col bg-black relative">
          {/* Player area */}
          <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
             {/* Decorative background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            
            <div className="w-full max-w-4xl aspect-video bg-neutral-950 rounded-xl border border-white/10 shadow-2xl overflow-hidden relative z-10 ring-1 ring-white/5 flex items-center justify-center">
               {/* Synthesized placeholder for video player */}
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-black"></div>
               <p className="text-neutral-500 text-sm font-mono z-10">Canvas Player</p>
            </div>
          </div>

          {/* Player Controls */}
          <div className="h-16 border-t border-white/10 bg-neutral-950/80 backdrop-blur-md flex items-center px-6 gap-4">
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                )}
              </button>
              <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
              </button>
            </div>
            <div className="text-sm font-mono text-neutral-400">
              {formatTime(currentTime)} / 00:01:00:00
            </div>
          </div>
        </main>

        {/* Right Inspector */}
        <aside className="w-72 border-l border-white/10 bg-neutral-900/50 flex flex-col z-10 backdrop-blur-sm">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-sm font-medium text-white">Properties</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Transform</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-neutral-950 border border-white/5 rounded-md px-3 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">X</span>
                  <span className="text-sm text-neutral-200">0.0</span>
                </div>
                <div className="bg-neutral-950 border border-white/5 rounded-md px-3 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Y</span>
                  <span className="text-sm text-neutral-200">0.0</span>
                </div>
                <div className="bg-neutral-950 border border-white/5 rounded-md px-3 py-1.5 flex items-center justify-between col-span-2">
                  <span className="text-xs text-neutral-500">Scale</span>
                  <span className="text-sm text-neutral-200">100%</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Timeline */}
      <div className="h-72 border-t border-white/10 bg-neutral-950 flex flex-col z-20">
        <div className="h-8 border-b border-white/5 flex">
          {/* Track Headers Area */}
          <div className="w-72 border-r border-white/5 bg-neutral-900/30 flex items-center px-4">
            <span className="text-xs font-medium text-neutral-400">Tracks</span>
          </div>
          {/* Ruler */}
          <div className="flex-1 bg-neutral-900/20 relative overflow-hidden">
            {/* Playhead indicator top */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
              style={{ left: `${(currentTime / 60) * 100}%` }}
            >
              <div className="absolute top-0 -left-1.5 w-3 h-3 bg-red-500 rounded-sm"></div>
            </div>
            {/* Ruler ticks */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMTAwJSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxNCIgeD0iMCIgeT0iMTgiIGZpbGw9IiM1MjUyNTIiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSI4IiB4PSIxMCIgeT0iMjQiIGZpbGw9IiMzZjNmNGYiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSI4IiB4PSIyMCIgeT0iMjQiIGZpbGw9IiMzZjNmNGYiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSI4IiB4PSIzMCIgeT0iMjQiIGZpbGw9IiMzZjNmNGYiLz48L3N2Zz4=')] opacity-50"></div>
          </div>
        </div>

        {/* Tracks */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {projectState?.tracks.map((track: any) => (
            <div key={track.id} className="h-20 border-b border-white/5 flex group">
              <div className="w-72 border-r border-white/5 bg-neutral-900/30 p-2 flex items-center justify-between group-hover:bg-neutral-900/50 transition-colors">
                <span className="text-xs font-medium text-neutral-300">{track.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleAddClip(track.id)}
                    className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-indigo-400 text-xs"
                    title="Add Clip"
                  >
                    +
                  </button>
                  <button className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 text-xs">M</button>
                  <button className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 text-xs">S</button>
                </div>
              </div>
              <div className="flex-1 relative bg-neutral-950/50 overflow-hidden">
                 {/* Playhead line continuing through tracks */}
                <div 
                  className="absolute top-0 bottom-0 w-px bg-red-500/50 pointer-events-none z-10"
                  style={{ left: `${(currentTime / 60) * 100}%` }}
                ></div>
                
                {/* Render actual Clips from WASM state */}
                {track.clips?.map((clip: any) => (
                  <div 
                    key={clip.id}
                    className="absolute top-2 bottom-2 bg-indigo-500/20 border border-indigo-500/50 rounded-md flex items-center px-2 cursor-pointer hover:bg-indigo-500/30 transition-colors group/clip"
                    style={{ 
                      left: `${(clip.start_time / 60) * 100}%`, 
                      width: `${(clip.duration / 60) * 100}%` 
                    }}
                  >
                    <span className="text-[10px] text-indigo-200 truncate flex-1">{clip.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover/clip:opacity-100 transition-opacity ml-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateClip(clip.id, clip.start_time + 1.0, clip.duration);
                        }}
                        className="w-4 h-4 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-[8px]"
                        title="Move Right (+1s)"
                      >
                        →
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClip(clip.id);
                        }}
                        className="w-4 h-4 rounded bg-red-500/50 hover:bg-red-500/80 flex items-center justify-center text-white text-[8px]"
                        title="Delete Clip"
                      >
                        ×
                      </button>
                    </div>
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
                <span className="text-neutral-600">Loading engine...</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
