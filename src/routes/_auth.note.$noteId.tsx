import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState } from 'react'
import { clsx } from 'clsx'

// Components
import { TreemapView } from '@/components/visualizations/TreemapView'
import { MindmapCanvas } from '@/components/visualizations/MindmapCanvas'
import { FlashcardDeck } from '@/components/visualizations/FlashcardDeck'
import { TimelineView } from '@/components/visualizations/TimelineView'
import { BulletSummary } from '@/components/visualizations/BulletSummary'
import { VideoSuggestions } from '@/components/ui/VideoSuggestions'
import { TagEditor } from '@/components/ui/TagEditor'
import { FollowUpChat } from '@/components/ui/FollowUpChat'

import { List, LayoutTemplate, Network, Layers, Clock, Edit2, Check, X as XIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/note/$noteId')({
  component: NoteDetail,
})

type TabType = 'bullets' | 'treemap' | 'mindmap' | 'flashcards' | 'timeline'

const tabs = [
  { id: 'bullets' as TabType, label: 'Bullets', icon: List },
  { id: 'treemap' as TabType, label: 'Treemap', icon: LayoutTemplate },
  { id: 'mindmap' as TabType, label: 'Mindmap', icon: Network },
  { id: 'flashcards' as TabType, label: 'Flashcards', icon: Layers },
  { id: 'timeline' as TabType, label: 'Timeline', icon: Clock },
]

function SubjectEditor({ initialSubject, onSave }: { initialSubject: string, onSave: (s: string) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialSubject)

  const handleSave = () => {
    if (value.trim() && value.trim() !== initialSubject) {
      onSave(value.trim())
    } else {
      setValue(initialSubject)
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <input 
          autoFocus
          className="text-sm font-medium bg-secondary/20 border border-primary px-3 py-1 rounded-full outline-none" 
          value={value} 
          onChange={e => setValue(e.target.value)} 
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setValue(initialSubject); setIsEditing(false) } }}
        />
        <button onClick={handleSave} className="text-green-500 hover:bg-green-500/10 p-1 rounded-full"><Check size={16}/></button>
        <button onClick={() => { setValue(initialSubject); setIsEditing(false) }} className="text-destructive hover:bg-destructive/10 p-1 rounded-full"><XIcon size={16}/></button>
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

function NoteDetail() {
  const { noteId } = Route.useParams()
  const [activeTab, setActiveTab] = useState<TabType>('bullets')
  const queryClient = useQueryClient()

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => api.getNoteById(noteId),
  })

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<typeof note>) => api.updateNote(noteId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] })
      queryClient.invalidateQueries({ queryKey: ['notes'] }) // Refresh dashboard too
    }
  })

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
      <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Note not found</h2>
        <p className="text-muted-foreground">The note you are looking for does not exist.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 pt-4">
      {/* Header */}
      <div>
        <SubjectEditor 
          initialSubject={note.subject} 
          onSave={(subject) => updateMutation.mutate({ subject })}
        />
        <h1 className="text-3xl font-bold mb-4">{note.title}</h1>
        <TagEditor 
          initialTags={note.tags} 
          onTagsChange={(tags) => updateMutation.mutate({ tags })}
        />
      </div>

      {/* Segmented Control */}
      <div className="bg-secondary/50 p-1 rounded-xl flex relative overflow-x-auto">
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
              "relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors flex-1 justify-center whitespace-nowrap",
              activeTab === tab.id 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/20"
            )}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px] animate-in fade-in duration-300">
        {activeTab === 'bullets' && <BulletSummary data={note.bullet_summary} />}
        {activeTab === 'treemap' && <TreemapView data={note.treemap} />}
        {activeTab === 'mindmap' && <MindmapCanvas data={note.mindmap} bullets={note.bullet_summary} />}
        {activeTab === 'flashcards' && <FlashcardDeck cards={note.flashcards} />}
        {activeTab === 'timeline' && <TimelineView data={note.timeline} />}
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
