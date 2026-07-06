import { Menu, Moon, Sun } from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { useNavigate } from '@tanstack/react-router'

export function Topbar() {
  const { toggleSidebar, theme, toggleTheme } = useUIStore()
  const navigate = useNavigate()

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-4">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu size={20} />
        </button>
        
        <div className="max-w-md w-full relative">
          <input 
            type="text" 
            placeholder="Search notes, tags, or content..." 
            className="w-full bg-secondary/50 border border-transparent focus:border-ring focus:bg-background rounded-full px-4 py-1.5 text-sm outline-none transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate({ to: '/search', search: { q: e.currentTarget.value } })
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={toggleTheme}
          className="relative w-9 h-9 flex items-center justify-center hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
          title="Toggle Theme"
        >
          <Sun 
            size={20} 
            className={`absolute transition-all duration-500 ${theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} 
          />
          <Moon 
            size={20} 
            className={`absolute transition-all duration-500 ${theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} 
          />
        </button>
      </div>
    </header>
  )
}
