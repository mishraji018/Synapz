import { Menu, Moon, Sun, Search, Sparkles } from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { useNavigate } from 'react-router-dom'

export function Topbar() {
  const { toggleSidebar, theme, toggleTheme } = useUIStore()
  const navigate = useNavigate()

  return (
    <header className="h-16 border-b border-border/80 bg-card/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        
        <div className="max-w-md w-full relative hidden sm:block">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input 
            type="text" 
            placeholder="Search notes, concepts, tags, or mindmaps..." 
            className="w-full bg-secondary/50 border border-border/60 focus:border-primary/50 focus:bg-background rounded-full pl-9 pr-12 py-1.5 text-xs outline-none transition-all shadow-2xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = e.currentTarget.value.trim()
                if (val) {
                  navigate(`/search?q=${encodeURIComponent(val)}`)
                } else {
                  navigate('/search')
                }
              }
            }}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-secondary px-1.5 py-0.5 rounded border border-border text-muted-foreground pointer-events-none">
            ↵ Enter
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Ask AI quick pill */}
        <button
          onClick={() => navigate('/chat')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-500/20 transition-all hover:scale-105"
        >
          <Sparkles size={13} className="text-purple-500" />
          <span>Ask AI</span>
        </button>

        {/* Theme switcher */}
        <button 
          onClick={toggleTheme}
          className="relative w-9 h-9 flex items-center justify-center hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground border border-border/60 transition-all hover:scale-105 shadow-2xs"
          title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
        >
          <Sun 
            size={18} 
            className={`absolute text-amber-500 transition-all duration-500 ${theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} 
          />
          <Moon 
            size={18} 
            className={`absolute text-indigo-400 transition-all duration-500 ${theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} 
          />
        </button>
      </div>
    </header>
  )
}

