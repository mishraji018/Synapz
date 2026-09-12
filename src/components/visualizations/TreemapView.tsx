import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { Note, NodeAnnotation, BookmarkedItem } from '@/lib/types'
import { useState } from 'react'
import { X, Star, StickyNote, Plus, Trash2, Check } from 'lucide-react'
import { clsx } from 'clsx'

interface TreemapViewProps {
  data: Note['treemap']
  nodeAnnotations?: NodeAnnotation[]
  bookmarks?: BookmarkedItem[]
  onAddAnnotation?: (nodeId: string, nodeLabel: string, content: string) => Promise<void>
  onDeleteAnnotation?: (annotationId: string) => Promise<void>
  onToggleBookmark?: (targetId: string, targetType: BookmarkedItem['target_type'], label: string, detail?: string) => Promise<void>
}

export function TreemapView({ 
  data, 
  nodeAnnotations = [], 
  bookmarks = [],
  onAddAnnotation,
  onDeleteAnnotation,
  onToggleBookmark 
}: TreemapViewProps) {
  const [selectedSubtopic, setSelectedSubtopic] = useState<Note['treemap']['subtopics'][0] | null>(null)
  const [newNoteText, setNewNoteText] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)

  const subtopics = data?.subtopics || []
  const mainTopic = data?.main_topic || 'Main Topic'

  const chartData = [{
    name: mainTopic,
    children: subtopics.map(sub => ({
      name: sub.name,
      size: sub.weight || 10,
      points: sub.points || [],
    }))
  }]

  const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#f43f5e']

  const subtopicId = selectedSubtopic ? `treemap_${selectedSubtopic.name.replace(/\s+/g, '_').toLowerCase()}` : ''
  const currentSubtopicNotes = selectedSubtopic ? nodeAnnotations.filter((a: NodeAnnotation) => a.node_id === subtopicId) : []
  const isCurrentSubtopicBookmarked = selectedSubtopic ? bookmarks.some((b: BookmarkedItem) => b.target_id === subtopicId) : false

  const handleSaveNote = async () => {
    if (!newNoteText.trim() || !selectedSubtopic || !onAddAnnotation) return
    setIsSubmittingNote(true)
    try {
      await onAddAnnotation(subtopicId, selectedSubtopic.name, newNoteText.trim())
      setNewNoteText('')
      setIsAddingNote(false)
    } finally {
      setIsSubmittingNote(false)
    }
  }

  const handleToggleBookmark = async () => {
    if (!selectedSubtopic || !onToggleBookmark) return
    await onToggleBookmark(
      subtopicId,
      'treemap_node',
      selectedSubtopic.name,
      (selectedSubtopic.points || []).slice(0, 2).join(' • ')
    )
  }

  const CustomizedContent = (props: any) => {
    const { x, y, width, height, index, name, depth } = props
    if (depth !== 1) return null
    
    const originalSubtopic = subtopics.find(s => s.name === name)

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={6}
          style={{
            fill: colors[index % colors.length],
            stroke: 'var(--background)',
            strokeWidth: 2,
            strokeOpacity: 1,
            cursor: 'pointer',
          }}
          onClick={() => {
            if (originalSubtopic) {
              setSelectedSubtopic(originalSubtopic)
              setIsAddingNote(false)
              setNewNoteText('')
            }
          }}
          className="hover:opacity-85 transition-opacity"
        />
        {width > 50 && height > 30 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            fill="#fff"
            fontSize={13}
            fontWeight="bold"
            pointerEvents="none"
          >
            {name}
          </text>
        )}
      </g>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[520px]">
      <div className="flex-1 bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col">
        <h3 className="text-lg font-semibold mb-3 text-foreground">{data.main_topic}</h3>
        <div className="flex-1 w-full min-h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={chartData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              content={<CustomizedContent />}
            >
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload
                    return (
                      <div className="bg-popover text-popover-foreground border border-border p-3 rounded-lg shadow-md z-50 text-xs">
                        <p className="font-semibold text-sm">{d.name}</p>
                        <p className="text-muted-foreground mt-0.5">Weight: {d.size}%</p>
                        <p className="text-primary font-medium mt-1">Click to inspect & add notes</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </div>

      {selectedSubtopic && (
        <div className="w-full md:w-88 bg-card border border-border rounded-xl p-6 relative shadow-sm animate-in slide-in-from-right-4 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Subtopic
              </span>
              {onToggleBookmark && (
                <button
                  onClick={handleToggleBookmark}
                  className={clsx(
                    "p-1 rounded-md transition-colors",
                    isCurrentSubtopicBookmarked 
                      ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                  title={isCurrentSubtopicBookmarked ? "Remove Bookmark" : "Bookmark this subtopic"}
                >
                  <Star size={15} className={isCurrentSubtopicBookmarked ? "fill-amber-500" : ""} />
                </button>
              )}
            </div>

            <button 
              onClick={() => setSelectedSubtopic(null)}
              className="p-1 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <h4 className="text-xl font-bold mb-3 pr-6 text-foreground">{selectedSubtopic.name}</h4>

          <div className="space-y-4 mb-6">
            <div className="bg-secondary/40 p-3 rounded-lg flex items-center justify-between border border-border/50">
              <span className="text-xs font-medium text-muted-foreground">Topic Relevance</span>
              <span className="font-bold text-sm text-primary">{selectedSubtopic.weight}%</span>
            </div>
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key Points:</h5>
              <ul className="space-y-2">
                {selectedSubtopic.points.map((point, idx) => (
                  <li key={idx} className="flex gap-2 text-xs leading-relaxed bg-secondary/20 p-2.5 rounded-lg border border-border/40">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Personal Notes */}
          <div className="mt-auto border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <StickyNote size={12} className="text-primary" />
                <span>My Notes ({currentSubtopicNotes.length})</span>
              </h5>
              {!isAddingNote && onAddAnnotation && (
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus size={12} />
                  <span>Add Note</span>
                </button>
              )}
            </div>

            {currentSubtopicNotes.length > 0 && (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {currentSubtopicNotes.map((n: NodeAnnotation) => (
                  <div key={n.id} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 text-xs relative group">
                    <p className="text-foreground leading-relaxed pr-6">{n.content}</p>
                    {onDeleteAnnotation && (
                      <button
                        onClick={() => onDeleteAnnotation(n.id)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isAddingNote && (
              <div className="space-y-2 bg-secondary/30 p-2.5 rounded-lg border border-border animate-in fade-in">
                <textarea
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  placeholder="Note down an insight for this topic..."
                  className="w-full text-xs bg-card border border-border rounded p-2 outline-none focus:border-primary resize-none h-16"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => { setIsAddingNote(false); setNewNoteText(''); }}
                    className="px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={!newNoteText.trim() || isSubmittingNote}
                    className="px-3 py-1 text-xs bg-primary text-primary-foreground font-medium rounded flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check size={12} />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
