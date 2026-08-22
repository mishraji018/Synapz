import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Note, BookmarkedItem } from '@/lib/types'
import { useState, useMemo } from 'react'
import { 
  Star, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Network, 
  LayoutTemplate, 
  Clock, 
  Layers,
  Calendar
} from 'lucide-react'
import { clsx } from 'clsx'

export const Route = createFileRoute('/_auth/bookmarks')({
  component: BookmarksPage,
})

type FilterType = 'all' | 'document' | 'mindmap_node' | 'treemap_node' | 'timeline_step' | 'flashcard'

function getBookmarkIcon(type: BookmarkedItem['target_type']) {
  switch (type) {
    case 'document': return <FileText size={16} className="text-blue-500" />
    case 'mindmap_node': return <Network size={16} className="text-indigo-500" />
    case 'treemap_node': return <LayoutTemplate size={16} className="text-emerald-500" />
    case 'timeline_step': return <Clock size={16} className="text-amber-500" />
    case 'flashcard': return <Layers size={16} className="text-purple-500" />
    default: return <Star size={16} className="text-amber-500" />
  }
}

function BookmarksPage() {
  const [filterType, setFilterType] = useState<FilterType>('all')
  const queryClient = useQueryClient()

  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: api.getNotes,
  })

  // Aggregate all bookmarks across all documents
  const allBookmarks = useMemo(() => {
    if (!notes) return []
    const items: { note: Note; bookmark: BookmarkedItem }[] = []

    notes.forEach(note => {
      if (note.bookmarks && note.bookmarks.length > 0) {
        note.bookmarks.forEach(bm => {
          items.push({ note, bookmark: bm })
        })
      }
    })

    return items
  }, [notes])

  // Filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    if (filterType === 'all') return allBookmarks
    return allBookmarks.filter(item => item.bookmark.target_type === filterType)
  }, [allBookmarks, filterType])

  const removeBookmarkMutation = useMutation({
    mutationFn: ({ noteId, targetId }: { noteId: string; targetId: string }) =>
      api.toggleBookmark(noteId, {
        target_id: targetId,
        target_type: 'document',
        label: ''
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    }
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Star className="text-amber-500 fill-amber-500" size={28} />
          <span>My Bookmarks & Starred Items</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quickly access starred documents, key mindmap subtopics, timeline events, and flashcards.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
        {[
          { id: 'all' as FilterType, label: 'All Starred' },
          { id: 'document' as FilterType, label: 'Documents' },
          { id: 'mindmap_node' as FilterType, label: 'Mindmap Nodes' },
          { id: 'treemap_node' as FilterType, label: 'Treemap Topics' },
          { id: 'timeline_step' as FilterType, label: 'Timeline Steps' },
          { id: 'flashcard' as FilterType, label: 'Flashcards' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={clsx(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
              filterType === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookmarks List */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-20 bg-secondary rounded-xl animate-pulse" />
          <div className="h-20 bg-secondary rounded-xl animate-pulse" />
          <div className="h-20 bg-secondary rounded-xl animate-pulse" />
        </div>
      ) : filteredBookmarks.length > 0 ? (
        <div className="space-y-3">
          {filteredBookmarks.map(({ note, bookmark }) => (
            <div
              key={bookmark.id}
              className="bg-card border border-border hover:border-primary/40 rounded-xl p-5 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground bg-secondary/40 px-2 py-0.5 rounded-md">
                    {getBookmarkIcon(bookmark.target_type)}
                    <span className="capitalize">{bookmark.target_type.replace('_', ' ')}</span>
                  </span>
                  <span>•</span>
                  <span>From document: <strong className="text-foreground">{note.title}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(bookmark.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-bold text-base text-foreground leading-snug">
                  {bookmark.label}
                </h3>

                {bookmark.detail && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-secondary/20 p-2 rounded-lg border border-border/40">
                    {bookmark.detail}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link
                  to="/note/$noteId"
                  params={{ noteId: note.id }}
                  className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <span>Open Note</span>
                  <ExternalLink size={13} />
                </Link>

                <button
                  onClick={() => removeBookmarkMutation.mutate({ noteId: note.id, targetId: bookmark.target_id })}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Remove Bookmark"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card border border-border rounded-2xl p-8 space-y-4">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <Star size={28} />
          </div>
          <h3 className="text-lg font-bold">No bookmarks found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Star documents or individual nodes inside your mindmaps, treemaps, and flashcards to view them here.
          </p>
          <Link
            to="/dashboard"
            className="inline-block bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Browse Documents
          </Link>
        </div>
      )}
    </div>
  )
}
