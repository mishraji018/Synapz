import { Link } from '@tanstack/react-router'
import { Folder, Home, Plus, Search, User, LogOut, Edit2, Trash2 } from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

function SubjectItem({ subject }: { subject: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(subject)
  const queryClient = useQueryClient()
  
  const renameMutation = useMutation({
    mutationFn: (newName: string) => api.renameSubject(subject, newName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteSubject(subject),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
  })

  const handleSave = () => {
    if (value.trim() && value.trim() !== subject) {
      renameMutation.mutate(value.trim())
    } else {
      setValue(subject)
    }
    setIsEditing(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`Delete '${subject}'? Notes with this subject will be moved to 'Uncategorized', not deleted.`)) {
      deleteMutation.mutate()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/50 border border-primary/20 mx-0">
        <Folder size={18} className="text-muted-foreground shrink-0" />
        <input 
          autoFocus
          className="flex-1 bg-transparent text-base outline-none w-full min-w-0"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') { setValue(subject); setIsEditing(false) }
          }}
          onBlur={handleSave}
        />
      </div>
    )
  }

  return (
    <Link
      to="/dashboard"
      search={{ subject }}
      activeProps={{ className: "bg-secondary text-secondary-foreground font-medium" }}
      inactiveProps={{ className: "text-muted-foreground hover:bg-secondary/50 hover:text-foreground" }}
      className="flex items-center justify-between px-3 py-2 rounded-md transition-colors group"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <Folder size={18} className="shrink-0" />
        <span className="truncate">{subject}</span>
      </div>
      
      {subject !== 'Uncategorized' && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded"
            title="Edit Subject"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={handleDelete}
            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
            title="Delete Subject"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </Link>
  )
}

export function Sidebar() {
  const { sidebarOpen } = useUIStore()
  const { user } = useAuthStore()

  const { data: notes } = useQuery({
    queryKey: ['notes'],
    queryFn: api.getNotes,
  })

  // Get unique subjects
  const subjects = Array.from(new Set(notes?.map(n => n.subject).filter(Boolean))) || []

  if (!sidebarOpen) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen">
      <div className="p-4 flex items-center gap-2 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
          AI
        </div>
        <span className="font-semibold text-lg">Summarizer</span>
      </div>

      <div className="p-4">
        <Link
          to="/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium w-full justify-center"
        >
          <Plus size={18} />
          <span>New Note</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <Link
          to="/dashboard"
          activeProps={{ className: "bg-secondary text-secondary-foreground font-medium" }}
          inactiveProps={{ className: "text-muted-foreground hover:bg-secondary/50 hover:text-foreground" }}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
        >
          <Home size={18} />
          <span>Dashboard</span>
        </Link>
        <Link
          to="/search"
          activeProps={{ className: "bg-secondary text-secondary-foreground font-medium" }}
          inactiveProps={{ className: "text-muted-foreground hover:bg-secondary/50 hover:text-foreground" }}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
        >
          <Search size={18} />
          <span>Search</span>
        </Link>
        
        <div className="pt-4 pb-1 px-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subjects</span>
        </div>
        
        {subjects.map(subject => (
          <SubjectItem key={subject} subject={subject} />
        ))}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <User size={16} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.user_metadata?.full_name || 'User'}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
