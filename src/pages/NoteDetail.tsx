import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Note, SummaryOptions, BookmarkedItem } from '@/lib/types'
import { useState } from 'react'
import { clsx } from 'clsx'

// Components
import { TreemapView } from '@/components/visualizations/TreemapView'
import { MindmapCanvas } from '@/components/visualizations/MindmapCanvas'
import { FlashcardDeck } from '@/components/visualizations/FlashcardDeck'
import { TimelineView } from '@/components/visualizations/TimelineView'
import { BulletSummary } from '@/components/visualizations/BulletSummary'
import { QuizView } from '@/components/visualizations/QuizView'
import { VideoSuggestions } from '@/components/ui/VideoSuggestions'
import { TagEditor } from '@/components/ui/TagEditor'
import { FollowUpChat } from '@/components/ui/FollowUpChat'
import { KeyInsights } from '@/components/ui/KeyInsights'
import { ExportBar } from '@/components/ui/ExportBar'
import { QualityBadge } from '@/components/ui/QualityBadge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

import { 
  List, 
  LayoutTemplate, 
  Network, 
  Layers, 
  Clock, 
  Edit2, 
  Check, 
  X as XIcon, 
  Calendar, 
  FileText, 
  File, 
  PlaySquare, 
  Link as LinkIcon, 
  Trash2, 
  Sparkles, 
  ChevronDown, 
  Star, 
  GraduationCap,
  Loader2
} from 'lucide-react'

type TabType = 'bullets' | 'treemap' | 'mindmap' | 'flashcards' | 'timeline' | 'quiz'

const tabs = [
  { id: 'bullets' as TabType, label: 'Bullets', icon: List },
  { id: 'treemap' as TabType, label: 'Treemap', icon: LayoutTemplate },
  { id: 'mindmap' as TabType, label: 'Mindmap', icon: Network },
  { id: 'flashcards' as TabType, label: 'Flashcards', icon: Layers },
  { id: 'timeline' as TabType, label: 'Timeline', icon: Clock },
  { id: 'quiz' as TabType, label: 'Quiz', icon: GraduationCap },
]

const regenerateModes: { label: string; desc: string; options: SummaryOptions }[] = [
  { 
    label: 'TL;DR (Short)', 
    desc: 'Ultra concise, 3-4 key bullets',
    options: { length: 'short', style: 'simple', focus: 'general' }
  },
  { 
    label: 'Detailed Summary', 
    desc: 'Deep dive, 10-15 comprehensive points',
    options: { length: 'detailed', style: 'professional', focus: 'general' }
  },
  { 
    label: 'Exam Notes & Formulas', 
    desc: 'Focus on high-yield exam concepts & facts',
    options: { length: 'detailed', style: 'academic', focus: 'exam' }
  },
  { 
    label: 'ELI5 (Beginner-Friendly)', 
    desc: 'Explain in simplest plain terms',
    options: { length: 'medium', style: 'simple', focus: 'general' }
  },
  { 
    label: 'Action-Driven Bullets', 
    desc: 'Max scannability with action items',
    options: { length: 'medium', style: 'bullets', focus: 'business' }
  },
]

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

function EditableSubject({ initialSubject, noteId }: { initialSubject: string, noteId: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialSubject)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (subject: string) => api.updateNote(noteId, { subject }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] })
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    }
  })

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mb-4 max-w-4xl mx-auto w-full">
        <input
          autoFocus
          className="text-sm font-semibold uppercase tracking-wider bg-secondary/50 border border-primary/20 px-3 py-1 rounded-full outline-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { updateMutation.mutate(value); setIsEditing(false) }
            if (e.key === 'Escape') { setValue(initialSubject); setIsEditing(false) }
          }}
          onBlur={() => { updateMutation.mutate(value); setIsEditing(false) }}
        />
        <button onClick={() => { updateMutation.mutate(value); setIsEditing(false) }} className="text-green-500 hover:bg-green-500/10 p-1 rounded-full transition-colors"><Check size={14}/></button>
        <button onClick={() => { setValue(initialSubject); setIsEditing(false) }} className="text-muted-foreground hover:bg-secondary p-1 rounded-full transition-colors"><XIcon size={14}/></button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mb-4 group max-w-4xl mx-auto w-full">
      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/30 px-3 py-1 rounded-full">{initialSubject}</span>
      <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity p-1"><Edit2 size={14}/></button>
    </div>
  )
}

export function NoteDetail() {
  const { noteId } = useParams<{ noteId: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('bullets')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showRegenerateMenu, setShowRegenerateMenu] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => (noteId ? api.getNoteById(noteId) : Promise.resolve(undefined)),
    enabled: !!noteId,
  })

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Note>) => (noteId ? api.updateNote(noteId, updates) : Promise.resolve()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] })
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => (noteId ? api.deleteNote(noteId) : Promise.resolve()),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData<Note[]>(['notes'])
      if (previousNotes) {
        queryClient.setQueryData<Note[]>(['notes'], previousNotes.filter(n => n.id !== noteId))
      }
      return { previousNotes }
    },
    onError: (err, _vars, context) => {
      console.error("Failed to delete note", err)
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      navigate('/dashboard', { replace: true })
    }
  })

  const handleRegenerate = async (options: SummaryOptions) => {
    if (!noteId) return
    setShowRegenerateMenu(false)
    setIsRegenerating(true)
    try {
      await api.regenerateNoteSummary(noteId, options)
      queryClient.invalidateQueries({ queryKey: ['note', noteId] })
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    } catch (err) {
      console.error("Failed to regenerate summary:", err)
    } finally {
      setIsRegenerating(false)
    }
  }

  // Annotation Handlers
  const handleAddAnnotation = async (nodeId: string, nodeLabel: string, content: string) => {
    if (!noteId) return
    await api.addNodeAnnotation(noteId, {
      node_id: nodeId,
      node_label: nodeLabel,
      viz_type: (activeTab as any) || 'general',
      content
    })
    queryClient.invalidateQueries({ queryKey: ['note', noteId] })
    queryClient.invalidateQueries({ queryKey: ['notes'] })
  }

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!noteId) return
    await api.deleteNodeAnnotation(noteId, annotationId)
    queryClient.invalidateQueries({ queryKey: ['note', noteId] })
    queryClient.invalidateQueries({ queryKey: ['notes'] })
  }

  // Bookmark Handler
  const handleToggleBookmark = async (
    targetId: string, 
    targetType: BookmarkedItem['target_type'], 
    label: string, 
    detail?: string
  ) => {
    if (!noteId) return
    await api.toggleBookmark(noteId, {
      target_id: targetId,
      target_type: targetType,
      label,
      detail
    })
    queryClient.invalidateQueries({ queryKey: ['note', noteId] })
    queryClient.invalidateQueries({ queryKey: ['notes'] })
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse pt-4">
        <div className="h-10 w-2/3 bg-secondary rounded-lg"></div>
        <div className="h-6 w-1/3 bg-secondary rounded-lg mb-8"></div>
        <div className="h-12 w-full bg-secondary rounded-xl mb-8"></div>
        <div className="h-[400px] w-full bg-secondary rounded-xl"></div>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center pt-20">
        <h2 className="text-2xl font-bold mb-2">Note Not Found</h2>
        <p className="text-muted-foreground">This note may have been deleted or doesn't exist.</p>
      </div>
    )
  }

  const isDocBookmarked = (note.bookmarks || []).some(b => b.target_id === note.id)

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-4">
      {/* Subject & Meta */}
      <EditableSubject initialSubject={note.subject} noteId={note.id} />
      
      {/* Title & Top Toolbar */}
      <div className="max-w-4xl mx-auto w-full space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold leading-tight">{note.title}</h1>
          
          <button
            onClick={() => handleToggleBookmark(note.id, 'document', note.title, note.tldr)}
            className={clsx(
              "p-2 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 text-xs font-semibold",
              isDocBookmarked 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" 
                : "bg-card border-border hover:bg-secondary text-muted-foreground"
            )}
            title={isDocBookmarked ? "Remove bookmark" : "Bookmark this document"}
          >
            <Star size={16} className={isDocBookmarked ? "fill-amber-500" : ""} />
            <span className="hidden sm:inline">{isDocBookmarked ? "Bookmarked" : "Bookmark"}</span>
          </button>
        </div>
        
        {/* Meta row & Regenerate Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground pb-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              {getSourceIcon(note.source_type)}
              <span className="uppercase text-xs font-medium tracking-wider">{note.source_type}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>{new Date(note.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Regenerate as Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRegenerateMenu(!showRegenerateMenu)}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/80 hover:bg-secondary border border-border rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="animate-spin text-primary" size={13} />
                  <span>Regenerating Summary...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-primary" />
                  <span>Regenerate as...</span>
                  <ChevronDown size={13} />
                </>
              )}
            </button>

            {showRegenerateMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Select Summary Style
                </div>
                {regenerateModes.map((mode, i) => (
                  <button
                    key={i}
                    onClick={() => handleRegenerate(mode.options)}
                    className="w-full text-left px-3 py-2 hover:bg-primary/5 hover:text-primary transition-colors flex flex-col border-b border-border/40 last:border-none"
                  >
                    <span className="text-xs font-semibold text-foreground">{mode.label}</span>
                    <span className="text-[11px] text-muted-foreground">{mode.desc}</span>
                  </button>
                ))}
              </div>
            )}
            {showRegenerateMenu && (
              <div className="fixed inset-0 z-40" onClick={() => setShowRegenerateMenu(false)} />
            )}
          </div>
        </div>

        {/* Quality Badge + Actions (Export & Delete) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <QualityBadge score={note.quality_score} documentType={note.document_type} />
          <div className="flex items-center gap-2">
            <ExportBar note={note} />
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors"
              title="Delete Note"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

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

      {/* Tags */}
      <div className="max-w-4xl mx-auto w-full">
        <TagEditor 
          initialTags={note.tags} 
          onTagsChange={(newTags: string[]) => updateMutation.mutate({ tags: newTags })} 
        />
      </div>

      {/* Key Insights Section */}
      <div className="max-w-4xl mx-auto w-full">
        <KeyInsights note={note} />
      </div>

      {/* Visualization Tabs */}
      <div className="relative bg-secondary/30 rounded-xl p-1 flex gap-0.5 max-w-4xl mx-auto overflow-x-auto">
        <div 
          className="absolute inset-y-1 bg-background shadow-sm rounded-lg transition-transform duration-300 ease-out z-0"
          style={{ 
            width: `calc(100% / ${tabs.length})`, 
            transform: `translateX(${tabs.findIndex(t => t.id === activeTab) * 100}%)` 
          }}
        />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors flex-1 justify-center whitespace-nowrap text-sm",
              activeTab === tab.id 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/20"
            )}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px] animate-in fade-in duration-300">
        {activeTab === 'bullets' && <BulletSummary data={note.bullet_summary} />}
        {activeTab === 'treemap' && (
          <TreemapView 
            data={note.treemap}
            nodeAnnotations={note.node_annotations}
            bookmarks={note.bookmarks}
            onAddAnnotation={handleAddAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            onToggleBookmark={handleToggleBookmark}
          />
        )}
        {activeTab === 'mindmap' && (
          <MindmapCanvas 
            data={note.mindmap} 
            bullets={note.bullet_summary}
            noteId={note.id}
            nodeAnnotations={note.node_annotations}
            bookmarks={note.bookmarks}
            onAddAnnotation={handleAddAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            onToggleBookmark={handleToggleBookmark}
          />
        )}
        {activeTab === 'flashcards' && (
          <FlashcardDeck 
            cards={note.flashcards} 
            bookmarks={note.bookmarks}
            onToggleBookmark={handleToggleBookmark}
          />
        )}
        {activeTab === 'timeline' && (
          <TimelineView 
            data={note.timeline}
            noteAnnotations={note.node_annotations}
            bookmarks={note.bookmarks}
            onAddAnnotation={handleAddAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            onToggleBookmark={handleToggleBookmark}
          />
        )}
        {activeTab === 'quiz' && (
          <QuizView
            noteId={note.id}
            noteTitle={note.title}
            noteContent={note}
            quizzes={note.quizzes}
            onQuizUpdated={() => queryClient.invalidateQueries({ queryKey: ['note', noteId] })}
          />
        )}
      </div>

      <hr className="border-border my-12" />

      {/* Bottom Sections */}
      <div className="space-y-12">
        <VideoSuggestions videos={note.suggested_videos} />
        <FollowUpChat noteId={note.id} noteContent={note} />
      </div>
    </div>
  )
}
