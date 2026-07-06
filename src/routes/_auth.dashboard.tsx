import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { FileText, LayoutGrid, List, File, PlaySquare, Link as LinkIcon, Calendar, Folder, Edit2, Check, Plus, MoreVertical, Trash2, FolderOutput, X } from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Note } from '@/lib/types'

const tagColors = [
  'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
  'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300',
  'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
]

function getTagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return tagColors[Math.abs(hash) % tagColors.length]
}

type DashboardSearch = {
  subject?: string
}

export const Route = createFileRoute('/_auth/dashboard')({
  component: Dashboard,
  validateSearch: (search: Record<string, unknown>): DashboardSearch => {
    return {
      subject: search.subject as string | undefined,
    }
  },
})

function getSourceIcon(type: string) {
  switch (type) {
    case 'text': return <FileText size={16} className="text-blue-500" />
    case 'pdf': return <File size={16} className="text-red-500" />
    case 'youtube': return <PlaySquare size={16} className="text-red-600" />
    case 'article': return <LinkIcon size={16} className="text-green-500" />
    default: return <FileText size={16} />
  }
}

function SubjectBadge({ note, allSubjects }: { note: Note, allSubjects: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isTypingNew, setIsTypingNew] = useState(false)
  const [newValue, setNewValue] = useState('')
  const queryClient = useQueryClient()
  
  const updateMutation = useMutation({
    mutationFn: (subject: string) => api.updateNote(note.id, { subject }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
  })

  const handleSelect = (subject: string) => {
    if (subject !== note.subject) {
      updateMutation.mutate(subject)
    }
    setIsOpen(false)
  }

  const handleSaveNew = () => {
    if (newValue.trim() && newValue.trim() !== note.subject) {
      updateMutation.mutate(newValue.trim())
    }
    setIsOpen(false)
    setIsTypingNew(false)
    setNewValue('')
  }

  return (
    <div className="relative group/badge" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-full text-xs font-semibold transition-colors group/btn"
      >
        <Folder size={12} className="text-muted-foreground group-hover/btn:text-foreground" />
        <span className="truncate max-w-[100px]">{note.subject || 'Uncategorized'}</span>
        <Edit2 size={10} className="opacity-0 group-hover/badge:opacity-100 transition-opacity ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-50 py-2 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Move to subject
          </div>
          <div className="max-h-48 overflow-y-auto">
            {allSubjects.map(sub => (
              <button
                key={sub}
                onClick={() => handleSelect(sub)}
                className={clsx(
                  "w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center justify-between",
                  sub === note.subject && "text-primary font-medium"
                )}
              >
                <span className="truncate">{sub}</span>
                {sub === note.subject && <Check size={14} className="shrink-0" />}
              </button>
            ))}
          </div>
          
          <div className="border-t border-border mt-1 p-2">
            {isTypingNew ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 bg-secondary/50 border border-primary/20 rounded px-2 py-1 text-sm outline-none min-w-0"
                  placeholder="New subject..."
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveNew()
                    if (e.key === 'Escape') { setIsTypingNew(false); setNewValue(''); }
                  }}
                />
                <button onClick={handleSaveNew} className="text-green-500 hover:bg-green-500/10 p-1 rounded shrink-0"><Check size={14}/></button>
              </div>
            ) : (
              <button 
                onClick={() => setIsTypingNew(true)}
                className="w-full flex items-center gap-2 text-sm text-primary hover:bg-primary/10 px-2 py-1.5 rounded transition-colors"
              >
                <Plus size={14} />
                <span>Create new</span>
              </button>
            )}
          </div>
        </div>
      )}
      
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setIsTypingNew(false); }} />
      )}
    </div>
  )
}

function NoteActionsMenu({ note, allSubjects }: { note: Note, allSubjects: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSubMenu, setActiveSubMenu] = useState<'none' | 'move'>('none')
  const [isTypingNew, setIsTypingNew] = useState(false)
  const [newValue, setNewValue] = useState('')
  const queryClient = useQueryClient()
  
  const updateMutation = useMutation({
    mutationFn: (subject: string) => api.updateNote(note.id, { subject }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteNote(note.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
  })

  const handleSelectSubject = (subject: string) => {
    if (subject !== note.subject) updateMutation.mutate(subject)
    setIsOpen(false)
    setActiveSubMenu('none')
  }

  const handleSaveNewSubject = () => {
    if (newValue.trim() && newValue.trim() !== note.subject) {
      updateMutation.mutate(newValue.trim())
    }
    setIsOpen(false)
    setActiveSubMenu('none')
    setIsTypingNew(false)
    setNewValue('')
  }

  const handleDelete = () => {
    if (confirm(`Delete '${note.title}'? This action cannot be undone.`)) {
      deleteMutation.mutate()
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95">
          {activeSubMenu === 'none' && (
            <>
              <button 
                onClick={() => setActiveSubMenu('move')}
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2"
              >
                <FolderOutput size={14} className="text-muted-foreground shrink-0" />
                <span>Move to...</span>
              </button>
              
              <div className="h-px bg-border my-1" />
              
              <button 
                onClick={handleDelete}
                className="w-full text-left px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2"
              >
                <Trash2 size={14} className="shrink-0" />
                <span>Delete</span>
              </button>
            </>
          )}

          {activeSubMenu === 'move' && (
            <div className="py-1">
              <div className="px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Move to</span>
                <button onClick={() => setActiveSubMenu('none')} className="hover:text-foreground"><X size={12} /></button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {allSubjects.map(sub => (
                  <button
                    key={sub}
                    onClick={() => handleSelectSubject(sub)}
                    className={clsx(
                      "w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center justify-between",
                      sub === note.subject && "text-primary font-medium"
                    )}
                  >
                    <span className="truncate max-w-[120px]">{sub}</span>
                    {sub === note.subject && <Check size={14} className="shrink-0" />}
                  </button>
                ))}
              </div>
              
              <div className="border-t border-border mt-1 p-2">
                {isTypingNew ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      className="flex-1 bg-secondary/50 border border-primary/20 rounded px-2 py-1 text-sm outline-none min-w-0"
                      placeholder="New subject..."
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveNewSubject()
                        if (e.key === 'Escape') { setIsTypingNew(false); setNewValue(''); }
                      }}
                    />
                    <button onClick={handleSaveNewSubject} className="text-green-500 hover:bg-green-500/10 p-1 rounded shrink-0"><Check size={14}/></button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsTypingNew(true)}
                    className="w-full flex items-center gap-2 text-sm text-primary hover:bg-primary/10 px-2 py-1.5 rounded transition-colors"
                  >
                    <Plus size={14} />
                    <span>Create new</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setActiveSubMenu('none'); setIsTypingNew(false); }} />
      )}
    </div>
  )
}

function Dashboard() {
  const { subject } = Route.useSearch()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const { data: allNotes, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: api.getNotes,
  })

  const notes = subject && allNotes ? allNotes.filter(n => n.subject === subject) : allNotes
  const subjectsList = Array.from(new Set(allNotes?.map(n => n.subject).filter(Boolean))) || []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-secondary rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto pt-20">
        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
          <FileText size={40} className="text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No notes yet</h2>
        <p className="text-muted-foreground mb-6">
          Get started by creating your first AI-generated summary from text, a PDF, a YouTube video, or an article.
        </p>
        <Link 
          to="/new" 
          className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity"
        >
          Create Note
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {subject ? `${subject} Notes` : 'My Notes'}
        </h1>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <button 
            onClick={() => setView('grid')}
            className={clsx("p-1.5 rounded-md transition-colors", view === 'grid' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setView('list')}
            className={clsx("p-1.5 rounded-md transition-colors", view === 'list' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      <div className={clsx(
        "gap-4", 
        view === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
      )}>
        {notes.map(note => (
          <Link 
            key={note.id} 
            to="/note/$noteId"
            params={{ noteId: note.id }}
            className={clsx(
              "group bg-card border border-border rounded-xl hover:border-primary/30 hover:scale-[1.02] hover:shadow-lg shadow-sm transition-all duration-200 p-6 relative flex",
              view === 'grid' ? "flex-col h-48" : "flex-row items-center justify-between h-auto"
            )}
          >
            <div className="absolute top-4 right-4 z-10">
              <NoteActionsMenu note={note} allSubjects={subjectsList} />
            </div>

            <div className={clsx(view === 'list' && "flex items-center gap-4 flex-1 pr-8")}>
              <div className="flex items-center gap-2 mb-3">
                {getSourceIcon(note.source_type)}
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                  {note.source_type}
                </span>
                <div className="w-1 h-1 rounded-full bg-border shrink-0" />
                <SubjectBadge note={note} allSubjects={subjectsList} />
              </div>
              
              <h3 className={clsx(
                "font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors",
                view === 'grid' ? "mb-auto" : "mb-0"
              )}>
                {note.title}
              </h3>
            </div>
            
            <div className={clsx(
              "flex items-center gap-4 text-xs text-muted-foreground mt-4",
              view === 'list' && "mt-0 ml-4 flex-shrink-0 w-48 justify-end"
            )}>
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{new Date(note.created_at).toLocaleDateString()}</span>
              </div>
              {view === 'grid' && (
                <div className="flex gap-1.5 overflow-hidden">
                  {note.tags.slice(0, 2).map(tag => (
                    <span key={tag} className={clsx("px-2.5 py-0.5 rounded-full truncate max-w-[90px] font-medium", getTagColor(tag))}>
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 2 && <span className="bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-full font-medium">+{note.tags.length - 2}</span>}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
