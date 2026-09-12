import { Link, useSearchParams } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { Search as SearchIcon, FileText, Network, Layers, StickyNote, Target, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { clsx } from 'clsx'

type SearchTab = 'all' | 'documents' | 'nodes' | 'insights' | 'notes' | 'flashcards'

interface SearchResultItem {
  id: string
  noteId: string
  noteTitle: string
  category: 'document' | 'node' | 'insight' | 'note' | 'flashcard'
  title: string
  snippet: string
  sourceType: string
}

export function Search() {
  const [searchParams] = useSearchParams()
  const qParam = searchParams.get('q') || ''
  const [query, setQuery] = useState(qParam)
  const [activeTab, setActiveTab] = useState<SearchTab>('all')

  useEffect(() => {
    if (qParam) {
      setQuery(qParam)
    }
  }, [qParam])

  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: api.getNotes,
  })

  // Deep Search Algorithm across all fields
  const results = useMemo(() => {
    if (!notes || !query.trim()) return []
    const q = query.toLowerCase().trim()
    const list: SearchResultItem[] = []

    notes.forEach(note => {
      const noteTitleLower = note.title.toLowerCase()
      const tldrLower = (note.tldr || '').toLowerCase()
      const tagsMatch = note.tags?.some(t => t.toLowerCase().includes(q))
      const subjectMatch = note.subject.toLowerCase().includes(q)

      // 1. Document Title / TLDR / Subject / Tags match
      if (noteTitleLower.includes(q) || tldrLower.includes(q) || tagsMatch || subjectMatch) {
        list.push({
          id: `doc_${note.id}`,
          noteId: note.id,
          noteTitle: note.title,
          category: 'document',
          title: note.title,
          snippet: note.tldr || note.bullet_summary?.slice(0, 2).join(' ') || note.subject,
          sourceType: note.source_type
        })
      }

      // 2. Visual Nodes (Mindmap & Treemap & Timeline)
      note.mindmap?.nodes?.forEach(node => {
        if (node.label.toLowerCase().includes(q) || node.details?.some(d => d.toLowerCase().includes(q))) {
          list.push({
            id: `node_mm_${note.id}_${node.id}`,
            noteId: note.id,
            noteTitle: note.title,
            category: 'node',
            title: `Mindmap Node: ${node.label}`,
            snippet: node.details?.join(' • ') || node.label,
            sourceType: note.source_type
          })
        }
      })

      note.treemap?.subtopics?.forEach((sub, i) => {
        if (sub.name.toLowerCase().includes(q) || sub.points.some(p => p.toLowerCase().includes(q))) {
          list.push({
            id: `node_tm_${note.id}_${i}`,
            noteId: note.id,
            noteTitle: note.title,
            category: 'node',
            title: `Treemap Topic: ${sub.name}`,
            snippet: sub.points.join(' • '),
            sourceType: note.source_type
          })
        }
      })

      note.timeline?.forEach((step, i) => {
        if (step.step.toLowerCase().includes(q) || step.description.toLowerCase().includes(q)) {
          list.push({
            id: `node_tl_${note.id}_${i}`,
            noteId: note.id,
            noteTitle: note.title,
            category: 'node',
            title: `Timeline: ${step.step}`,
            snippet: step.description,
            sourceType: note.source_type
          })
        }
      })

      // 3. Key Insights & Bullet points
      note.key_points?.forEach((point, i) => {
        if (point.toLowerCase().includes(q)) {
          list.push({
            id: `kp_${note.id}_${i}`,
            noteId: note.id,
            noteTitle: note.title,
            category: 'insight',
            title: `Key Insight #${i + 1}`,
            snippet: point,
            sourceType: note.source_type
          })
        }
      })

      note.bullet_summary?.forEach((bullet, i) => {
        if (bullet.toLowerCase().includes(q)) {
          list.push({
            id: `bs_${note.id}_${i}`,
            noteId: note.id,
            noteTitle: note.title,
            category: 'insight',
            title: `Bullet Summary Point`,
            snippet: bullet,
            sourceType: note.source_type
          })
        }
      })

      // 4. Personal User Annotations / Node Notes
      note.node_annotations?.forEach(ann => {
        if (ann.content.toLowerCase().includes(q) || ann.node_label.toLowerCase().includes(q)) {
          list.push({
            id: `ann_${note.id}_${ann.id}`,
            noteId: note.id,
            noteTitle: note.title,
            category: 'note',
            title: `Note on "${ann.node_label}"`,
            snippet: ann.content,
            sourceType: note.source_type
          })
        }
      })

      // 5. Flashcards
      note.flashcards?.forEach((card, i) => {
        if (card.question.toLowerCase().includes(q) || card.answer.toLowerCase().includes(q)) {
          list.push({
            id: `fc_${note.id}_${i}`,
            noteId: note.id,
            noteTitle: note.title,
            category: 'flashcard',
            title: `Flashcard: ${card.question}`,
            snippet: card.answer,
            sourceType: note.source_type
          })
        }
      })
    })

    return list
  }, [notes, query])

  // Tab Filter
  const filteredResults = useMemo(() => {
    if (activeTab === 'all') return results
    if (activeTab === 'documents') return results.filter(r => r.category === 'document')
    if (activeTab === 'nodes') return results.filter(r => r.category === 'node')
    if (activeTab === 'insights') return results.filter(r => r.category === 'insight')
    if (activeTab === 'notes') return results.filter(r => r.category === 'note')
    if (activeTab === 'flashcards') return results.filter(r => r.category === 'flashcard')
    return results
  }, [results, activeTab])

  const counts = {
    all: results.length,
    documents: results.filter(r => r.category === 'document').length,
    nodes: results.filter(r => r.category === 'node').length,
    insights: results.filter(r => r.category === 'insight').length,
    notes: results.filter(r => r.category === 'note').length,
    flashcards: results.filter(r => r.category === 'flashcard').length,
  }

  function getCategoryIcon(cat: SearchResultItem['category']) {
    switch (cat) {
      case 'document': return <FileText size={15} className="text-blue-500" />
      case 'node': return <Network size={15} className="text-indigo-500" />
      case 'insight': return <Target size={15} className="text-emerald-500" />
      case 'note': return <StickyNote size={15} className="text-amber-500" />
      case 'flashcard': return <Layers size={15} className="text-purple-500" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2">
      <div>
        <h1 className="text-3xl font-bold">Deep Knowledge Search</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search across document titles, summaries, mindmap subtopics, personal annotations, and flashcards.
        </p>
      </div>
      
      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by topic, concept, keyword, question, or note..."
          className="w-full pl-12 pr-4 py-3.5 bg-card border border-border focus:border-primary rounded-2xl outline-none shadow-sm text-base"
          autoFocus
        />
      </div>

      {/* Category Tabs */}
      {query.trim().length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
          {[
            { id: 'all' as SearchTab, label: 'All Results', count: counts.all },
            { id: 'documents' as SearchTab, label: 'Documents', count: counts.documents },
            { id: 'nodes' as SearchTab, label: 'Visual Nodes', count: counts.nodes },
            { id: 'insights' as SearchTab, label: 'Insights & Bullets', count: counts.insights },
            { id: 'notes' as SearchTab, label: 'My Notes', count: counts.notes },
            { id: 'flashcards' as SearchTab, label: 'Flashcards', count: counts.flashcards },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span className={clsx(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                activeTab === tab.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Results Container */}
      <div>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-20 bg-secondary rounded-xl animate-pulse"></div>
            <div className="h-20 bg-secondary rounded-xl animate-pulse"></div>
          </div>
        ) : query.trim().length > 0 ? (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Found {filteredResults.length} matches
            </p>

            {filteredResults.length > 0 ? (
              <div className="space-y-3">
                {filteredResults.map(item => (
                  <Link 
                    key={item.id}
                    to={`/note/${item.noteId}`}
                    className="block bg-card border border-border hover:border-primary/40 rounded-xl p-4 shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium bg-secondary/50 px-2 py-0.5 rounded text-foreground">
                          {getCategoryIcon(item.category)}
                          <span className="capitalize">{item.category}</span>
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[200px] sm:max-w-xs">{item.noteTitle}</span>
                      </div>
                      <ExternalLink size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed bg-secondary/20 p-2 rounded border border-border/40">
                      {item.snippet}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl">
                No matches found for "{query}" in this category.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground bg-card/50 border border-border border-dashed rounded-2xl space-y-2">
            <p className="font-semibold text-foreground">Ready to explore</p>
            <p className="text-xs">Type a keyword, concept, or phrase above to search your entire knowledge base.</p>
          </div>
        )}
      </div>
    </div>
  )
}
