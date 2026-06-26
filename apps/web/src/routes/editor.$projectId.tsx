import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'

// Types for File Assets
export type AssetNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  file?: File;
  children?: AssetNode[];
  isOpen?: boolean; // UI state for directory
};


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

  const [assets, setAssets] = useState<AssetNode[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('Media');
  const [fonts, setFonts] = useState<string[]>([]);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [projectName, setProjectName] = useState<string>("My Awesome Edit");

  useEffect(() => {
    // Dynamic import to avoid SSR issues or pre-compilation errors
    Promise.all([
      import('opencut-wasm')
    ]).then(async ([module]) => {
      const init = module.default;
      const { WasmProject } = module;
      
      // Initialize the WebAssembly module
      await init();
      
      // Load project name from local storage if exists
      let pName = "Project " + projectId.substring(0, 8);
      try {
        const saved = localStorage.getItem('opencut_projects');
        if (saved) {
          const projects = JSON.parse(saved);
          const found = projects.find((p: any) => p.id === projectId);
          if (found) {
            pName = found.name;
          }
        }
      } catch (e) {
        console.error(e);
      }
      setProjectName(pName);

      const proj = new WasmProject(pName);
      proj.add_track("Video Track 1");
      proj.add_track("Audio Track 1");
      setWasmProj(proj);
      setProjectState(proj.get_state());

      try {
        // Fix: Use WasmProject.get_fonts()
        const loadedFonts = WasmProject.get_fonts();
        if (loadedFonts && Array.isArray(loadedFonts)) {
           setFonts(loadedFonts);
        }
      } catch (err) {
        console.error("Failed to load fonts from WASM:", err);
      }
    }).catch(err => {
      console.error(err);
      setErrorMsg(err.toString() + " | " + err.message);
    });
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'Audio' && audioTracks.length === 0) {
      fetch('https://www.theaudiodb.com/api/v1/json/2/searchtrack.php?s=coldplay')
        .then(res => res.json())
        .then(data => {
          if (data && data.track) {
            setAudioTracks(data.track);
          }
        })
        .catch(console.error);
    }
  }, [activeTab]);

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


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const traverseFileTree = async (item: any, path: string = ''): Promise<AssetNode | null> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          resolve({
            name: file.name,
            path: path + file.name,
            type: 'file',
            file: file
          });
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const childrenNodes: AssetNode[] = [];

        const readAllEntries = () => {
          dirReader.readEntries(async (entries: any[]) => {
            if (entries.length === 0) {
              // Sort folders first, then alphabetically
              childrenNodes.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'directory' ? -1 : 1;
              });

              resolve({
                name: item.name,
                path: path + item.name,
                type: 'directory',
                children: childrenNodes,
                isOpen: true
              });
              return;
            }

            for (let i = 0; i < entries.length; i++) {
              const childNode = await traverseFileTree(entries[i], path + item.name + '/');
              if (childNode) {
                childrenNodes.push(childNode);
              }
            }

            readAllEntries(); // Read next batch
          });
        };
        readAllEntries();
      } else {
        resolve(null);
      }
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items = e.dataTransfer.items;
    if (!items) return;

    const incomingNodes: AssetNode[] = [];
    // Collect promises to wait for all file tree traversals simultaneously
    const promises: Promise<AssetNode | null>[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        promises.push(traverseFileTree(item));
      }
    }

    const results = await Promise.all(promises);
    for (const node of results) {
      if (node) {
        incomingNodes.push(node);
      }
    }

    const mergedAssets = mergeNodes(assets, incomingNodes);
    setAssets(mergedAssets);
  };


  const mergeNodes = (existing: AssetNode[], incoming: AssetNode[]): AssetNode[] => {
    const result = [...existing];

    incoming.forEach(node => {
      const existingNodeIndex = result.findIndex(n => n.name === node.name && n.type === node.type);

      if (existingNodeIndex >= 0) {
        if (node.type === 'directory') {
          // Merge children recursively
          result[existingNodeIndex] = {
            ...result[existingNodeIndex],
            children: mergeNodes(result[existingNodeIndex].children || [], node.children || [])
          };
        } else {
          // Overwrite file or keep existing? Let's overwrite for now
          result[existingNodeIndex] = node;
        }
      } else {
        result.push(node);
      }
    });

    result.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });

    return result;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const buildTree = (files: File[]) => {
      const root: AssetNode[] = [];

      files.forEach(file => {
        // use webkitRelativePath for folder structure, else fallback to name
        const path = file.webkitRelativePath || file.name;
        const parts = path.split('/').filter(Boolean); // handle potential leading/trailing slashes

        let currentLevel = root;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          currentPath += (currentPath ? '/' : '') + part;

          const isFile = i === parts.length - 1;

          // Find if we already mapped this part
          let existingNode = currentLevel.find(n => n.name === part && n.type === (isFile ? 'file' : 'directory'));

          if (!existingNode) {
            existingNode = {
              name: part,
              path: currentPath,
              type: isFile ? 'file' : 'directory',
              ...(isFile ? { file } : { children: [], isOpen: true })
            };
            currentLevel.push(existingNode);
          }

          if (!isFile) {
            if (!existingNode.children) existingNode.children = [];
            currentLevel = existingNode.children;
          }
        }
      });

      return root;
    };

    const addedAssets = buildTree(Array.from(files));
    const mergedAssets = mergeNodes(assets, addedAssets);

    setAssets(mergedAssets);

    // Reset inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };


  const toggleFolder = (path: string, nodes: AssetNode[]): AssetNode[] => {
    return nodes.map(node => {
      if (node.path === path) {
        return { ...node, isOpen: !node.isOpen };
      }
      if (node.children) {
        return { ...node, children: toggleFolder(path, node.children) };
      }
      return node;
    });
  };

  const renderAssetNode = (node: AssetNode, depth: number = 0) => {
    if (node.type === 'directory') {
      return (
        <div key={node.path} className="w-full">
          <div
            className="flex items-center py-1 px-2 hover:bg-white/5 rounded-md cursor-pointer transition-colors"
            style={{ paddingLeft: `${(depth * 12) + 8}px` }}
            onClick={() => setAssets(toggleFolder(node.path, assets))}
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`mr-2 text-neutral-400 transition-transform ${node.isOpen ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 text-blue-400">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span className="text-xs text-neutral-300 truncate">{node.name}</span>
          </div>
          {node.isOpen && node.children && (
            <div className="flex flex-col w-full">
              {node.children.map(child => renderAssetNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        className="flex items-center py-1 px-2 hover:bg-white/5 rounded-md cursor-pointer transition-colors group"
        style={{ paddingLeft: `${(depth * 12) + 24}px` }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 text-neutral-500 group-hover:text-purple-400">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span className="text-xs text-neutral-300 truncate">{node.name}</span>
      </div>
    );
  };

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
          <span className="text-sm text-neutral-400 border border-white/10 px-3 py-1 rounded-full cursor-pointer hover:bg-white/5 transition-colors">{projectName}</span>
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
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-md transition-colors ${activeTab === tab.label ? 'text-white bg-[#252525]' : 'text-[#888] hover:text-white hover:bg-[#252525]'}`}
              >
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
            <div className="flex-1 p-4 overflow-y-auto" onDragOver={handleDragOver} onDrop={handleDrop}>
            {activeTab === 'Media' && (
              <>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Project Assets</h3>
                <div className="flex flex-col gap-0.5">
                  {assets.length === 0 ? (
                    <div className="text-xs text-neutral-600 text-center py-4">No media imported yet.</div>
                  ) : (
                    assets.map(node => renderAssetNode(node))
                  )}
                </div>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileInput}
                />
                <input
                  type="file"
                  multiple
                  // @ts-ignore
                  webkitdirectory="true"
                  directory="true"
                  ref={folderInputRef}
                  className="hidden"
                  onChange={handleFileInput}
                />
                <div className="flex gap-2 w-full mt-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 rounded-md border border-dashed border-white/20 text-neutral-400 text-xs hover:border-purple-500/50 hover:text-purple-400 transition-colors"
                  >
                    + Import Files
                  </button>
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="flex-1 py-2 rounded-md border border-dashed border-white/20 text-neutral-400 text-xs hover:border-purple-500/50 hover:text-purple-400 transition-colors"
                  >
                    + Import Folder
                  </button>
                </div>
              </>
            )}

            {activeTab === 'Audio' && (
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Audio Library</h3>
                <div className="flex flex-col gap-2">
                  {audioTracks.length === 0 ? (
                    <div className="text-xs text-neutral-600 text-center py-4">Loading tracks...</div>
                  ) : (
                    audioTracks.slice(0, 10).map((track: any) => (
                       <div key={track.idTrack} className="flex flex-col p-2 bg-[#252525] rounded-md hover:bg-[#333] cursor-pointer">
                          <span className="text-xs text-white truncate">{track.strTrack}</span>
                          <span className="text-[10px] text-neutral-400">{track.strArtist}</span>
                       </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'Text' && (
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">System Fonts</h3>
                <div className="flex flex-col gap-2">
                  <button className="w-full bg-[#252525] hover:bg-[#333] text-white text-xs py-2 rounded-md mb-2">
                    + Add Default Text
                  </button>
                  {fonts.length === 0 ? (
                    <div className="text-xs text-neutral-600 text-center py-4">Loading fonts...</div>
                  ) : (
                    fonts.slice(0, 20).map((font, idx) => (
                      <div key={idx} className="px-3 py-2 bg-[#1A1A1A] border border-[#252525] rounded-md text-xs text-neutral-300 truncate cursor-pointer hover:bg-[#2A2A2A]">
                        {font}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'Stickers' && (
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Trending Stickers</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <div key={i} className="aspect-square bg-[#252525] rounded-md flex items-center justify-center text-2xl hover:bg-[#333] cursor-pointer">
                      {['😊', '🚀', '🔥', '✨', '🎉', '💡', '❤️', '👍', '⭐'][i - 1]}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-neutral-500 text-center mt-4">Powered by stipop.io</div>
              </div>
            )}

            {!['Media', 'Audio', 'Text', 'Stickers'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <span className="text-[#888] text-sm">{activeTab} features coming soon</span>
              </div>
            )}
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
                    className="absolute top-2 bottom-2 bg-[#2E3C56] border border-[#4B6899] rounded flex items-center px-2 cursor-pointer hover:bg-[#384A6A] transition-colors group/clip"
                    style={{ 
                      left: `${(clip.start_time / 60) * 100}%`, 
                      width: `${(clip.duration / 60) * 100}%` 
                    }}
                  >
                    <span className="text-[10px] text-white truncate flex-1">{clip.name}</span>
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
                <span className="text-[#888]">Loading engine...</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
