import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  FileText, LayoutGrid, List, File, PlaySquare, Calendar, 
  Folder, Edit2, Check, Plus, MoreVertical, Trash2, FolderOutput, X, 
  SlidersHorizontal, ArrowUpDown, Award, Sparkles, BookOpen, Layers, Star, 
  Search, Compass, Zap, BrainCircuit, Globe
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import { Note } from '@/lib/types'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useAuthStore } from '@/store/useAuthStore'

const tagColors = [
  'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-500/20',
  'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20',
  'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-500/20',
  'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/20',
  'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/20',
  'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-500/20',
]

function getTagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return tagColors[Math.abs(hash) % tagColors.length]
}

function getSourceTheme(type: string) {
  switch (type) {
    case 'youtube':
      return {
        icon: <PlaySquare size={15} className="text-rose-500" />,
        gradient: 'from-rose-500 via-red-500 to-pink-500',
        badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        glow: 'hover:shadow-rose-500/10',
        label: 'YouTube',
      }
    case 'pdf':
    case 'docx':
      return {
        icon: <File size={15} className="text-amber-500" />,
        gradient: 'from-amber-500 via-orange-500 to-yellow-500',
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        glow: 'hover:shadow-amber-500/10',
        label: type.toUpperCase(),
      }
    case 'article':
      return {
        icon: <Globe size={15} className="text-emerald-500" />,
        gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        glow: 'hover:shadow-emerald-500/10',
        label: 'Article',
      }
    case 'txt':
    case 'text':
    default:
      return {
        icon: <FileText size={15} className="text-indigo-500" />,
        gradient: 'from-indigo-500 via-blue-500 to-cyan-500',
        badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        glow: 'hover:shadow-indigo-500/10',
        label: type === 'txt' ? 'TXT' : 'Text',
      }
  }
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' }
  if (hour < 18) return { text: 'Good afternoon', emoji: '🌤️' }
  return { text: 'Good evening', emoji: '🌙' }
}

function SubjectBadge({ note, allSubjects }: { note: Note; allSubjects: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isTypingNew, setIsTypingNew] = useState(false)
  const [newValue, setNewValue] = useState('')
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (subject: string) => api.updateNote(note.id, { subject }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
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
        onClick={(e) => {
          stopEvent(e)
          setIsOpen(!isOpen)
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/60 rounded-full text-xs font-semibold transition-all group/btn"
      >
        <Folder size={11} className="text-muted-foreground group-hover/btn:text-primary transition-colors" />
        <span className="truncate max-w-[110px]">{note.subject || 'Uncategorized'}</span>
        <Edit2 size={10} className="opacity-0 group-hover/badge:opacity-100 transition-opacity ml-0.5 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 py-2 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Move to subject
          </div>
          <div className="max-h-48 overflow-y-auto">
            {allSubjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={(e) => {
                  stopEvent(e)
                  handleSelect(sub)
                }}
                className={clsx(
                  'w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center justify-between',
                  sub === note.subject && 'text-primary font-medium bg-primary/5'
                )}
              >
                <span className="truncate">{sub}</span>
                {sub === note.subject && <Check size={14} className="shrink-0 text-primary" />}
              </button>
            ))}
          </div>

          <div className="border-t border-border mt-1 p-2">
            {isTypingNew ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 bg-secondary/50 border border-primary/20 rounded-lg px-2.5 py-1 text-sm outline-none min-w-0"
                  placeholder="New subject..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNew()
                    if (e.key === 'Escape') {
                      setIsTypingNew(false)
                      setNewValue('')
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveNew}
                  className="text-emerald-500 hover:bg-emerald-500/10 p-1.5 rounded-lg shrink-0"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  stopEvent(e)
                  setIsTypingNew(true)
                }}
                className="w-full flex items-center gap-2 text-sm text-primary hover:bg-primary/10 px-2 py-1.5 rounded-lg transition-colors font-medium"
              >
                <Plus size={14} />
                <span>Create new subject</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={(e) => {
            stopEvent(e)
            setIsOpen(false)
            setIsTypingNew(false)
          }}
        />
      )}
    </div>
  )
}

function NoteActionsMenu({ note, allSubjects }: { note: Note; allSubjects: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSubMenu, setActiveSubMenu] = useState<'none' | 'move'>('none')
  const [isTypingNew, setIsTypingNew] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (subject: string) => api.updateNote(note.id, { subject }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteNote(note.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData<Note[]>(['notes'])
      if (previousNotes) {
        queryClient.setQueryData<Note[]>(['notes'], previousNotes.filter((n) => n.id !== note.id))
      }
      return { previousNotes }
    },
    onError: (err, _variables, context) => {
      console.error('Failed to delete note:', err)
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setShowConfirmDelete(false)
      setIsOpen(false)
    },
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
        onClick={(e) => {
          stopEvent(e)
          setIsOpen(!isOpen)
        }}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95">
          {activeSubMenu === 'none' && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  stopEvent(e)
                  setActiveSubMenu('move')
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2"
              >
                <FolderOutput size={14} className="text-muted-foreground shrink-0" />
                <span>Move to subject...</span>
              </button>

              <div className="h-px bg-border my-1" />

              <button
                type="button"
                onClick={(e) => {
                  stopEvent(e)
                  setShowConfirmDelete(true)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2"
              >
                <Trash2 size={14} className="shrink-0" />
                <span>Delete note</span>
              </button>
            </>
          )}

          {activeSubMenu === 'move' && (
            <div className="py-1">
              <div className="px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Move to</span>
                <button
                  type="button"
                  onClick={(e) => {
                    stopEvent(e)
                    setActiveSubMenu('none')
                  }}
                  className="hover:text-foreground"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {allSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={(e) => {
                      stopEvent(e)
                      handleSelectSubject(sub)
                    }}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center justify-between',
                      sub === note.subject && 'text-primary font-medium'
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
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveNewSubject()
                        if (e.key === 'Escape') {
                          setIsTypingNew(false)
                          setNewValue('')
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveNewSubject}
                      className="text-emerald-500 hover:bg-emerald-500/10 p-1 rounded shrink-0"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      stopEvent(e)
                      setIsTypingNew(true)
                    }}
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
        <div
          className="fixed inset-0 z-40"
          onClick={(e) => {
            stopEvent(e)
            setIsOpen(false)
            setActiveSubMenu('none')
            setIsTypingNew(false)
          }}
        />
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

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const subject = searchParams.get('subject') || undefined
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'quality'>('newest')
  const { user } = useAuthStore()

  const greeting = getGreeting()
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend'

  const { data: allNotes, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: api.getNotes,
  })

  // Subjects list
  const subjectsList = useMemo(() => {
    return Array.from(new Set(allNotes?.map((n) => n.subject).filter(Boolean))) || []
  }, [allNotes])

  // Analytics & Stats
  const stats = useMemo(() => {
    if (!allNotes) return { total: 0, subjects: 0, bookmarks: 0, mindmaps: 0, avgQuality: 0 }
    const total = allNotes.length
    const subjects = new Set(allNotes.map((n) => n.subject).filter(Boolean)).size
    const bookmarks = allNotes.reduce((acc, n) => acc + (n.bookmarks?.length || 0), 0)
    const mindmaps = allNotes.filter((n) => n.mindmap?.nodes && n.mindmap.nodes.length > 0).length
    const qualityScores = allNotes.map((n) => n.quality_score?.overall).filter(Boolean) as number[]
    const avgQuality = qualityScores.length > 0 ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) : 88

    return { total, subjects, bookmarks, mindmaps, avgQuality }
  }, [allNotes])

  // Filter & sort logic
  const filteredNotes = useMemo(() => {
    if (!allNotes) return []
    let result = [...allNotes]

    // Subject filter from route params
    if (subject) {
      result = result.filter((n) => n.subject === subject)
    }

    // Source type filter
    if (filterSource !== 'all') {
      result = result.filter((n) => n.source_type === filterSource)
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.subject.toLowerCase().includes(q) ||
          n.tags?.some((t) => t.toLowerCase().includes(q)) ||
          n.tldr?.toLowerCase().includes(q)
      )
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'quality') return (b.quality_score?.overall || 0) - (a.quality_score?.overall || 0)
      return 0
    })

    return result
  }, [allNotes, subject, filterSource, searchQuery, sortBy])

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-44 bg-card/60 border border-border rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card/60 border border-border rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-card/60 border border-border rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. CREATIVE WELCOME HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 shadow-sm p-6 sm:p-8 mesh-gradient-bg">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold tracking-wide shadow-xs">
              <img src="/synapz-icon.png" alt="Synapz" className="w-4 h-4 rounded-md object-cover animate-synapz-glow shadow-xs" />
              <span>Synapz AI Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              {greeting.text}, <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">{userName}</span> {greeting.emoji}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Transform any YouTube video, PDF, document, or article into interactive mindmaps, flashcards & instant insights.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 shrink-0">
            <Link
              to="/new?type=youtube"
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-all duration-200 group shadow-xs hover:scale-[1.02]"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <PlaySquare size={16} className="text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-left">
                <span className="block font-bold">YouTube</span>
                <span className="text-[10px] text-muted-foreground">Video Summary</span>
              </div>
            </Link>

            <Link
              to="/new?type=upload"
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs transition-all duration-200 group shadow-xs hover:scale-[1.02]"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <File size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-left">
                <span className="block font-bold">PDF / Doc</span>
                <span className="text-[10px] text-muted-foreground">Upload File</span>
              </div>
            </Link>

            <Link
              to="/new?type=article"
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs transition-all duration-200 group shadow-xs hover:scale-[1.02]"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Globe size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <span className="block font-bold">Web Article</span>
                <span className="text-[10px] text-muted-foreground">Paste URL</span>
              </div>
            </Link>

            <Link
              to="/chat"
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-xs transition-all duration-200 group shadow-xs hover:scale-[1.02]"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Compass size={16} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-left">
                <span className="block font-bold">Ask AI</span>
                <span className="text-[10px] text-muted-foreground">Across Notes</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. STATS & ANALYTICS BAR (Vibrant Mixed Colors) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Notes */}
        <div className="bg-card border border-indigo-500/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden shadow-xs hover:border-indigo-500/40 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight">{stats.total}</div>
            <div className="text-xs font-semibold text-muted-foreground">Knowledge Notes</div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 2: Subjects & Domains */}
        <div className="bg-card border border-purple-500/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden shadow-xs hover:border-purple-500/40 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight">{stats.subjects}</div>
            <div className="text-xs font-semibold text-muted-foreground">Active Subjects</div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 3: Saved Bookmarks */}
        <div className="bg-card border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden shadow-xs hover:border-amber-500/40 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
            <Star size={22} />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight">{stats.bookmarks}</div>
            <div className="text-xs font-semibold text-muted-foreground">Key Bookmarks</div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 4: Mindmaps & Visuals */}
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden shadow-xs hover:border-emerald-500/40 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
            <BrainCircuit size={22} />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight">{stats.mindmaps}</div>
            <div className="text-xs font-semibold text-muted-foreground">Mindmaps & Visuals</div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* 3. SUBJECT FILTER CAROUSEL (If subjects exist) */}
      {subjectsList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            <span>Explore by Subject</span>
            {subject && (
              <button
                onClick={() => setSearchParams({})}
                className="text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <X size={12} />
                <span>Show all</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSearchParams({})}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5',
                !subject
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25 scale-105'
                  : 'bg-card border border-border/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Folder size={12} />
              <span>All Topics</span>
              <span className="opacity-70 text-[10px] ml-0.5 font-normal">({allNotes?.length || 0})</span>
            </button>

            {subjectsList.map((sub, idx) => {
              const isCurrent = subject === sub
              const count = allNotes?.filter((n) => n.subject === sub).length || 0
              const colorClasses = [
                'hover:border-indigo-500/40 text-indigo-600 dark:text-indigo-400',
                'hover:border-purple-500/40 text-purple-600 dark:text-purple-400',
                'hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
                'hover:border-amber-500/40 text-amber-600 dark:text-amber-400',
                'hover:border-rose-500/40 text-rose-600 dark:text-rose-400',
                'hover:border-cyan-500/40 text-cyan-600 dark:text-cyan-400',
              ][idx % 6]

              return (
                <button
                  key={sub}
                  onClick={() => setSearchParams({ subject: sub })}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border',
                    isCurrent
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-sm shadow-indigo-500/25 scale-105 font-bold'
                      : `bg-card border-border/80 ${colorClasses} hover:bg-secondary/40`
                  )}
                >
                  <span className={clsx('w-1.5 h-1.5 rounded-full', isCurrent ? 'bg-white' : 'bg-current')} />
                  <span>{sub}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. CONTROLS TOOLBAR (Search, Source Filters, Sorting, Grid/List) */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Source Type Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Sources', icon: SlidersHorizontal, activeBg: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/20' },
            { id: 'youtube', label: 'YouTube', icon: PlaySquare, color: 'text-rose-500', activeBg: 'bg-rose-500 text-white shadow-rose-500/20' },
            { id: 'pdf', label: 'PDF', icon: File, color: 'text-amber-500', activeBg: 'bg-amber-500 text-white shadow-amber-500/20' },
            { id: 'article', label: 'Article', icon: Globe, color: 'text-emerald-500', activeBg: 'bg-emerald-500 text-white shadow-emerald-500/20' },
            { id: 'text', label: 'Text', icon: FileText, color: 'text-blue-500', activeBg: 'bg-blue-500 text-white shadow-blue-500/20' },
            { id: 'docx', label: 'DOCX', icon: File, color: 'text-indigo-500', activeBg: 'bg-indigo-500 text-white shadow-indigo-500/20' },
          ].map((type) => {
            const Icon = type.icon
            const isSelected = filterSource === type.id
            return (
              <button
                key={type.id}
                onClick={() => setFilterSource(type.id)}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
                  isSelected
                    ? `${type.activeBg} shadow-sm font-bold scale-105`
                    : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon size={13} className={isSelected ? 'text-white' : type.color} />
                <span>{type.label}</span>
              </button>
            )
          })}
        </div>

        {/* Search, Sort & View Modes */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-secondary/50 border border-border/80 rounded-xl text-xs outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-secondary/50 border border-border/80 rounded-xl px-2.5 py-1 text-xs">
            <ArrowUpDown size={13} className="text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer pr-1"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title (A-Z)</option>
              <option value="quality">AI Quality</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-secondary/50 border border-border/80 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setView('grid')}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                view === 'grid' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setView('list')}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                view === 'list' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>

          <Link
            to="/new"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 shrink-0 hover:scale-105"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New Note</span>
          </Link>
        </div>
      </div>

      {/* 5. NOTE GRID / LIST VIEW */}
      {filteredNotes.length > 0 ? (
        <div
          className={clsx(
            'gap-5',
            view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
          )}
        >
          {filteredNotes.map((note) => {
            const theme = getSourceTheme(note.source_type)
            const hasMindmap = note.mindmap?.nodes && note.mindmap.nodes.length > 0
            const hasFlashcards = note.flashcards && note.flashcards.length > 0
            const hasTimeline = note.timeline && note.timeline.length > 0

            return (
              <Link
                key={note.id}
                to={`/note/${note.id}`}
                className={clsx(
                  'group relative bg-card border border-border/80 rounded-2xl hover:border-primary/50 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden card-hover-glow',
                  view === 'grid' ? 'min-h-[260px] p-5 sm:p-6' : 'p-4 sm:p-5 flex-row items-center gap-6 min-h-[100px]'
                )}
              >
                {/* Dynamic Top Source Gradient Line */}
                <div className={clsx('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', theme.gradient)} />

                <div className={clsx(view === 'list' && 'flex items-center gap-5 flex-1 pr-6')}>
                  {/* Top Meta Bar */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap pr-6">
                    {/* Source Pill */}
                    <div className={clsx('flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border', theme.badge)}>
                      {theme.icon}
                      <span>{theme.label}</span>
                    </div>

                    <div className="w-1 h-1 rounded-full bg-border" />

                    {/* Subject Selector */}
                    <SubjectBadge note={note} allSubjects={subjectsList} />

                    {/* Quality Score Badge */}
                    {note.quality_score && (
                      <span className="ml-auto text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Award size={11} className="text-emerald-500" />
                        {note.quality_score.overall}%
                      </span>
                    )}
                  </div>

                  {/* Note Title */}
                  <h3
                    className={clsx(
                      'font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2',
                      view === 'list' && 'mb-0 max-w-md'
                    )}
                  >
                    {note.title}
                  </h3>

                  {/* TL;DR Preview in Grid View */}
                  {view === 'grid' && note.tldr && (
                    <div className="relative my-3 p-3 rounded-xl bg-secondary/40 border border-border/60 text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">
                      <span className="text-primary font-bold not-italic mr-1">TL;DR:</span>
                      {note.tldr}
                    </div>
                  )}

                  {/* Visual Capabilities Pill Strip */}
                  {view === 'grid' && (hasMindmap || hasFlashcards || hasTimeline) && (
                    <div className="flex items-center gap-2 mt-1 mb-4 flex-wrap">
                      {hasMindmap && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-500/20">
                          <BrainCircuit size={10} /> Mindmap
                        </span>
                      )}
                      {hasFlashcards && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                          <Zap size={10} /> {note.flashcards.length} Cards
                        </span>
                      )}
                      {hasTimeline && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold border border-cyan-500/20">
                          <Calendar size={10} /> Timeline
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Section */}
                <div
                  className={clsx(
                    'flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border/60',
                    view === 'list' && 'mt-0 pt-0 border-none shrink-0 w-64 justify-end gap-4'
                  )}
                >
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Calendar size={13} />
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-1.5 overflow-hidden">
                    {note.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={clsx('px-2 py-0.5 rounded-full truncate max-w-[85px] text-[11px] font-semibold', getTagColor(tag))}
                      >
                        #{tag}
                      </span>
                    ))}
                    {note.tags && note.tags.length > 2 && (
                      <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-[11px] font-semibold">
                        +{note.tags.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                {/* Top-right menu trigger */}
                <div className="absolute top-3.5 right-3.5 z-20">
                  <NoteActionsMenu note={note} allSubjects={subjectsList} />
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-6 bg-card border border-border/80 rounded-3xl relative overflow-hidden mesh-gradient-bg">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-sm">
            <Sparkles size={28} />
          </div>
          <h3 className="text-xl font-bold mb-2">No notes match your filter</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Try adjusting your search query, clearing the subject filter, or create a brand new AI-powered note.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setFilterSource('all')
                setSearchQuery('')
                setSearchParams({})
              }}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-bold transition-colors"
            >
              Reset Filters
            </button>
            <Link
              to="/new"
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Create Note</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
