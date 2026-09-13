import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { Folder, Home, Plus, Search, LogOut, Edit2, Trash2, Compass, Star } from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useState, useMemo } from 'react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Note } from '@/lib/types'
import { clsx } from 'clsx'
import { SynapzLogo } from '@/components/ui/SynapzLogo'

function SubjectItem({ subject }: { subject: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(subject)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isSelected = location.pathname === '/dashboard' && searchParams.get('subject') === subject
  const queryClient = useQueryClient()
  
  const renameMutation = useMutation({
    mutationFn: (newName: string) => api.renameSubject(subject, newName),
    onMutate: async (newName: string) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData<Note[]>(['notes'])
      if (previousNotes) {
        queryClient.setQueryData<Note[]>(
          ['notes'], 
          previousNotes.map(n => n.subject === subject ? { ...n, subject: newName } : n)
        )
      }
      return { previousNotes }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteSubject(subject),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData<Note[]>(['notes'])
      if (previousNotes) {
        queryClient.setQueryData<Note[]>(
          ['notes'], 
          previousNotes.map(n => n.subject === subject ? { ...n, subject: 'Uncategorized' } : n)
        )
      }
      return { previousNotes }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setShowConfirmDelete(false)
    }
  })

  const handleSave = () => {
    if (value.trim() && value.trim() !== subject) {
      renameMutation.mutate(value.trim())
    } else {
      setValue(subject)
    }
    setIsEditing(false)
  }

  const stopEvent = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/50 border border-primary/20 mx-0">
        <Folder size={16} className="text-muted-foreground shrink-0" />
        <input 
          autoFocus
          className="flex-1 bg-transparent text-sm outline-none w-full min-w-0"
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
    <>
      <Link
        to={`/dashboard?subject=${encodeURIComponent(subject)}`}
        className={clsx(
          "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors group",
          isSelected
            ? "bg-secondary text-secondary-foreground font-semibold"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Folder size={16} className="shrink-0 text-muted-foreground group-hover:text-foreground" />
          <span className="truncate">{subject}</span>
        </div>
        
        {subject !== 'Uncategorized' && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              type="button"
              onClick={(e) => { stopEvent(e); setIsEditing(true); }}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded"
              title="Edit Subject"
            >
              <Edit2 size={13} />
            </button>
            <button 
              type="button"
              onClick={(e) => { stopEvent(e); setShowConfirmDelete(true); }}
              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
              title="Delete Subject"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </Link>

      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Delete Subject"
        message={`Are you sure you want to delete the subject '${subject}'? Notes under this subject will be moved to 'Uncategorized', not deleted.`}
        confirmText="Remove Subject"
        cancelText="Cancel"
        variant="warning"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setShowConfirmDelete(false)}
      />
    </>
  )
}

export function Sidebar() {
  const { sidebarOpen } = useUIStore()
  const { user, setUser, setSession } = useAuthStore()

  const { data: notes } = useQuery({
    queryKey: ['notes'],
    queryFn: api.getNotes,
  })

  // Get unique subjects
  const subjects = Array.from(new Set(notes?.map(n => n.subject).filter(Boolean))) || []

  // Count total bookmarks
  const totalBookmarks = useMemo(() => {
    if (!notes) return 0
    return notes.reduce((acc, n) => acc + (n.bookmarks?.length || 0), 0)
  }, [notes])

  if (!sidebarOpen) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <aside className="w-64 border-r border-border/80 bg-card/95 backdrop-blur-md flex flex-col h-screen select-none">
      {/* Brand Header with 2s Timelapse Animated Logo */}
      <div className="p-4 flex items-center border-b border-border/80">
        <Link to="/dashboard" className="hover:opacity-90 transition-opacity">
          <SynapzLogo size="md" subtitle="AI Knowledge Studio" />
        </Link>
      </div>

      {/* New Note Button */}
      <div className="p-3.5">
        <Link
          to="/new"
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white px-4 py-2.5 rounded-xl transition-all font-bold w-full justify-center shadow-md shadow-indigo-500/20 text-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>New AI Note</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-none">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
            isActive 
              ? "bg-primary/10 text-primary font-bold shadow-xs border border-primary/20" 
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
        >
          <Home size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) => clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group",
            isActive 
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shadow-xs border border-purple-500/20" 
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
        >
          <Compass size={18} className="text-purple-500 group-hover:rotate-45 transition-transform duration-300" />
          <span className="flex-1">Ask Knowledge</span>
          <span className="bg-purple-500/15 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider">AI</span>
        </NavLink>

        <NavLink
          to="/bookmarks"
          className={({ isActive }) => clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
            isActive 
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-xs border border-amber-500/20" 
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
        >
          <Star size={18} className="text-amber-500" />
          <span className="flex-1">Bookmarks</span>
          {totalBookmarks > 0 && (
            <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-bold">
              {totalBookmarks}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/search"
          className={({ isActive }) => clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
            isActive 
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-xs border border-blue-500/20" 
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
        >
          <Search size={18} />
          <span>Search</span>
        </NavLink>
        
        {/* Subjects List */}
        <div className="pt-5 pb-1 px-3 flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Subjects</span>
          <span className="text-xs text-muted-foreground font-semibold px-2 py-0.5 rounded-full bg-secondary/60">{subjects.length}</span>
        </div>
        
        <div className="space-y-0.5">
          {subjects.map(subject => (
            <SubjectItem key={subject} subject={subject} />
          ))}
        </div>
      </nav>

      {/* User Footer Profile */}
      <div className="p-3.5 border-t border-border/80 mt-auto bg-secondary/20">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold truncate text-foreground">{user?.user_metadata?.full_name || 'My Account'}</span>
              <span className="text-[11px] text-muted-foreground truncate">{user?.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-80 group-hover:opacity-100"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
