import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Film, Plus, Folder, Video } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [projectName, setProjectName] = useState('')

  const [recentProjects, setRecentProjects] = useState<{id: string, name: string, date: string, duration: string}[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('opencut_projects')
      if (saved) setRecentProjects(JSON.parse(saved))
    } catch (e) { console.error(e) }
  }, [])

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) return
    
    // Generate a random ID for the new project
    const projectId = crypto.randomUUID()
    
    const newProject = {
      id: projectId,
      name: projectName.trim(),
      date: 'Just now',
      duration: '00:00'
    }
    
    const updated = [newProject, ...recentProjects]
    setRecentProjects(updated)
    localStorage.setItem('opencut_projects', JSON.stringify(updated))
    
    navigate({
      to: '/editor/$projectId',
      params: { projectId }
    })
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-neutral-950 flex items-center px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Film size={18} className="text-white" />
          </div>
          <span className="font-bold tracking-tight text-lg">OpenCut<span className="text-indigo-400">AI</span></span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Projects</h1>
            <p className="text-neutral-400">Manage your video edits and creations.</p>
          </div>
          
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-medium hover:bg-neutral-200 transition-colors"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>

        {isCreating && (
          <div className="mb-12 p-6 rounded-2xl bg-neutral-900 border border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <form onSubmit={handleCreateProject} className="relative z-10 flex gap-4">
              <input 
                autoFocus
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Name your new project..."
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button 
                type="submit"
                disabled={!projectName.trim()}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Create
              </button>
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Folder size={18} className="text-neutral-500" />
            Recent Projects
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProjects.length === 0 ? (
              <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl bg-neutral-900/50">
                <p className="text-neutral-500">No projects yet. Click "New Project" to get started.</p>
              </div>
            ) : (
              recentProjects.map(project => (
                <div 
                  key={project.id}
                  onClick={() => navigate({ to: '/editor/$projectId', params: { projectId: project.id }})}
                  className="group cursor-pointer rounded-2xl bg-neutral-900 border border-white/5 hover:border-white/20 transition-all overflow-hidden flex flex-col"
                >
                  <div className="h-40 bg-black flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/10"></div>
                    <Video size={32} className="text-neutral-700 group-hover:text-indigo-400 transition-colors relative z-10" />
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-xs font-mono px-2 py-1 rounded text-neutral-300">
                      {project.duration}
                    </div>
                  </div>
                  <div className="p-5 border-t border-white/5 bg-neutral-900">
                    <h3 className="font-medium text-white mb-1 group-hover:text-indigo-300 transition-colors">{project.name}</h3>
                    <p className="text-xs text-neutral-500">{project.date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
