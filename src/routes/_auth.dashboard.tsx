import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { FileText, LayoutGrid, List, File, PlaySquare, Link as LinkIcon, Calendar, Folder, Edit2, Check, Plus, MoreVertical, Trash2, FolderOutput, X, SlidersHorizontal, ArrowUpDown, Award } from 'lucide-react'
import { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Note } from '@/lib/types'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

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
  q?: string
}

export const Route = createFileRoute('/_auth/dashboard')({
  component: Dashboard,
  validateSearch: (search: Record<string, unknown>): DashboardSearch => {
    return {
      subject: search.subject as string | undefined,
      q: search.q as string | undefined,
    }
  },
})

function getSourceIcon(type: string) {
  switch (type) {
    case 'text': return <FileText size={16} className="text-blue-500" />
    case 'pdf': return <File size={16} className="text-red-500" />
    case 'youtube': return <PlaySquare size={16} className="text-red-600" />
    case 'article': return <LinkIcon size={16} className="text-green-500" />
    case 'docx': return <File size={16} className="text-blue-600" />
    case 'txt': return <FileText size={16} className="text-gray-500" />
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

  const stopEvent = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

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
    <div 
      className="relative group/badge" 
      onClick={stopEvent}
      onMouseDown={stopEvent}
      onPointerDown={stopEvent}
    >
      <button 
        type="button"
        onClick={(e) => { stopEvent(e); setIsOpen(!isOpen); }}
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
                type="button"
                onClick={(e) => { stopEvent(e); handleSelect(sub); }}
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
                <button type="button" onClick={handleSaveNew} className="text-green-500 hover:bg-green-500/10 p-1 rounded shrink-0"><Check size={14}/></button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={(e) => { stopEvent(e); setIsTypingNew(true); }}
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
        <div className="fixed inset-0 z-40" onClick={(e) => { stopEvent(e); setIsOpen(false); setIsTypingNew(false); }} />
      )}
    </div>
  )
}

function NoteActionsMenu({ note, allSubjects }: { note: Note, allSubjects: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSubMenu, setActiveSubMenu] = useState<'none' | 'move'>('none')
  const [isTypingNew, setIsTypingNew] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const queryClient = useQueryClient()
  
  const updateMutation = useMutation({
    mutationFn: (subject: string) => api.updateNote(note.id, { subject }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteNote(note.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData<Note[]>(['notes'])
      if (previousNotes) {
        queryClient.setQueryData<Note[]>(['notes'], previousNotes.filter(n => n.id !== note.id))
      }
      return { previousNotes }
    },
    onError: (err, _variables, context) => {
      console.error("Failed to delete note:", err)
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setShowConfirmDelete(false)
      setIsOpen(false)
    }
  })

  const stopEvent = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

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

  return (
    <div 
      className="relative" 
      onClick={stopEvent}
      onMouseDown={stopEvent}
      onPointerDown={stopEvent}
    >
      <button 
        type="button"
        onClick={(e) => { stopEvent(e); setIsOpen(!isOpen); }}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95">
          {activeSubMenu === 'none' && (
            <>
              <button 
                type="button"
                onClick={(e) => { stopEvent(e); setActiveSubMenu('move'); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2"
              >
                <FolderOutput size={14} className="text-muted-foreground shrink-0" />
                <span>Move to...</span>
              </button>
              
              <div className="h-px bg-border my-1" />
              
              <button 
                type="button"
                onClick={(e) => { stopEvent(e); setShowConfirmDelete(true); }}
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
                <button type="button" onClick={(e) => { stopEvent(e); setActiveSubMenu('none'); }} className="hover:text-foreground"><X size={12} /></button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {allSubjects.map(sub => (
                  <button
                    key={sub}
                    type="button"
                    onClick={(e) => { stopEvent(e); handleSelectSubject(sub); }}
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
                    <button type="button" onClick={handleSaveNewSubject} className="text-green-500 hover:bg-green-500/10 p-1 rounded shrink-0"><Check size={14}/></button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={(e) => { stopEvent(e); setIsTypingNew(true); }}
                    className="w-full flex items-center gap-2 text-sm text-primary hover:bg-primary/10 px-2 py-1.5 rounded-colors"
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
        <div className="fixed inset-0 z-40" onClick={(e) => { stopEvent(e); setIsOpen(false); setActiveSubMenu('none'); setIsTypingNew(false); }} />
      )}

      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Delete Note"
        message={`Are you sure you want to delete '${note.title}'? This action cannot be undone.`}
        confirmText="Delete Note"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setShowConfirmDelete(false)}
      />
    </div>
  )
}

function Dashboard() {
  const { subject } = Route.useSearch()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest')

  const { data: allNotes, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: api.getNotes,
  })

  // Subjects list
  const subjectsList = useMemo(() => {
    return Array.from(new Set(allNotes?.map(n => n.subject).filter(Boolean))) || []
  }, [allNotes])

  // Filter & sort logic
  const filteredNotes = useMemo(() => {
    if (!allNotes) return []
    let result = [...allNotes]

    // Subject filter from route params
    if (subject) {
      result = result.filter(n => n.subject === subject)
    }

    // Source type filter
    if (filterSource !== 'all') {
      result = result.filter(n => n.source_type === filterSource)
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(n => 
        n.title.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q) ||
        n.tags?.some(t => t.toLowerCase().includes(q)) ||
        n.tldr?.toLowerCase().includes(q)
      )
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      return 0
    })

    return result
  }, [allNotes, subject, filterSource, searchQuery, sortBy])

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-secondary rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!allNotes || allNotes.length === 0) {
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
          className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Create Note</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {subject ? `${subject} Notes` : 'My Knowledge Base'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'} found
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button 
              onClick={() => setView('grid')}
              className={clsx("p-1.5 rounded-md transition-colors", view === 'grid' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setView('list')}
              className={clsx("p-1.5 rounded-md transition-colors", view === 'list' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>

          <Link
            to="/new"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus size={16} />
            <span>New Note</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        {/* Source Type Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <SlidersHorizontal size={14} className="text-muted-foreground shrink-0" />
          {[
            { id: 'all', label: 'All Sources' },
            { id: 'text', label: 'Text' },
            { id: 'pdf', label: 'PDF' },
            { id: 'youtube', label: 'YouTube' },
            { id: 'article', label: 'Article' },
            { id: 'docx', label: 'DOCX' },
            { id: 'txt', label: 'TXT' },
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setFilterSource(type.id)}
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                filterSource === type.id
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <ArrowUpDown size={14} className="text-muted-foreground" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs font-medium outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Note Grid / List */}
      {filteredNotes.length > 0 ? (
        <div className={clsx(
          "gap-4", 
          view === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
        )}>
          {filteredNotes.map(note => (
            <Link 
              key={note.id} 
              to="/note/$noteId"
              params={{ noteId: note.id }}
              className={clsx(
                "group bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-md shadow-sm transition-all duration-200 p-6 relative flex flex-col justify-between",
                view === 'grid' ? "min-h-[220px]" : "flex-row items-center justify-between min-h-[90px]"
              )}
            >
              <div className="absolute top-4 right-4 z-10">
                <NoteActionsMenu note={note} allSubjects={subjectsList} />
              </div>

              <div className={clsx(view === 'list' && "flex items-center gap-4 flex-1 pr-8")}>
                {/* Meta Row */}
                <div className="flex items-center gap-2 mb-3 flex-wrap pr-6">
                  {getSourceIcon(note.source_type)}
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                    {note.source_type}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-border shrink-0" />
                  <SubjectBadge note={note} allSubjects={subjectsList} />
                  
                  {note.quality_score && (
                    <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Award size={10} />
                      {note.quality_score.overall}
                    </span>
                  )}
                </div>
                
                {/* Title */}
                <h3 className={clsx(
                  "font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors mb-2",
                  view === 'grid' ? "" : "mb-0"
                )}>
                  {note.title}
                </h3>

                {/* TL;DR snippet preview in grid mode */}
                {view === 'grid' && note.tldr && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed bg-secondary/20 p-2 rounded border border-border/50">
                    {note.tldr}
                  </p>
                )}
              </div>
              
              {/* Footer row */}
              <div className={clsx(
                "flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border/40",
                view === 'list' && "mt-0 pt-0 border-none ml-4 shrink-0 w-48 justify-end"
              )}>
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                </div>

                {view === 'grid' && (
                  <div className="flex gap-1.5 overflow-hidden">
                    {note.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className={clsx("px-2.5 py-0.5 rounded-full truncate max-w-[90px] font-medium", getTagColor(tag))}>
                        {tag}
                      </span>
                    ))}
                    {note.tags?.length > 2 && <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">+{note.tags.length - 2}</span>}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground text-sm">No notes match your filters.</p>
          <button 
            onClick={() => { setFilterSource('all'); setSearchQuery(''); }}
            className="text-xs text-primary font-medium hover:underline mt-2"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
