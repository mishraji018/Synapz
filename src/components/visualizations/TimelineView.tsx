import { Note, NodeAnnotation, BookmarkedItem } from '@/lib/types'
import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronDown, Star, StickyNote, Plus, Trash2, Check } from 'lucide-react'

interface TimelineViewProps {
  data: Note['timeline']
  noteAnnotations?: NodeAnnotation[]
  bookmarks?: BookmarkedItem[]
  onAddAnnotation?: (nodeId: string, nodeLabel: string, content: string) => Promise<void>
  onDeleteAnnotation?: (annotationId: string) => Promise<void>
  onToggleBookmark?: (targetId: string, targetType: BookmarkedItem['target_type'], label: string, detail?: string) => Promise<void>
}

export function TimelineView({ 
  data = [],
  noteAnnotations = [],
  bookmarks = [],
  onAddAnnotation,
  onDeleteAnnotation,
  onToggleBookmark
}: TimelineViewProps) {
  const safeData = data || []
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const [activeStepForNote, setActiveStepForNote] = useState<string | null>(null)
  const [noteInputText, setNoteInputText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!safeData.length) return null

  const handleSaveStepNote = async (stepId: string, stepTitle: string) => {
    if (!noteInputText.trim() || !onAddAnnotation) return
    setIsSubmitting(true)
    try {
      await onAddAnnotation(stepId, stepTitle, noteInputText.trim())
      setNoteInputText('')
      setActiveStepForNote(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="relative border-l-2 border-border ml-4 md:ml-6 space-y-8">
        {safeData.map((item, index) => {
          const isExpanded = expandedIndex === index
          const stepId = `timeline_step_${index + 1}`
          const stepNotes = noteAnnotations.filter(a => a.node_id === stepId)
          const isBookmarked = bookmarks.some(b => b.target_id === stepId)

          return (
            <div key={index} className="relative pl-8 md:pl-12 group">
              <div className="absolute -left-[11px] top-1.5 w-5 h-5 rounded-full bg-background border-4 border-primary group-hover:scale-125 transition-transform" />
              
              <div 
                className="bg-card border border-border rounded-xl p-6 shadow-sm group-hover:border-primary/30 group-hover:shadow-md transition-all duration-300 relative"
              >
                <div className="absolute top-1/2 -left-3 w-3 h-0.5 bg-border group-hover:bg-primary/30 -translate-y-1/2 hidden md:block"></div>
                
                {/* Header row */}
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedIndex(isExpanded ? null : index)}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.step}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {onToggleBookmark && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleBookmark(stepId, 'timeline_step', item.step, item.description)
                        }}
                        className={clsx(
                          "p-1.5 rounded-md transition-colors",
                          isBookmarked ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                        title={isBookmarked ? "Remove Bookmark" : "Bookmark this step"}
                      >
                        <Star size={15} className={isBookmarked ? "fill-amber-500" : ""} />
                      </button>
                    )}
                    <ChevronDown size={18} className={clsx("text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180")} />
                  </div>
                </div>
                
                {/* Expanded Description */}
                <div className={clsx("grid transition-all duration-300 ease-in-out", isExpanded ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0")}>
                  <div className="overflow-hidden space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/20 p-4 rounded-lg border border-border/40">
                      {item.description}
                    </p>

                    {/* Step Notes Section */}
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <StickyNote size={12} className="text-primary" />
                          Step Notes ({stepNotes.length})
                        </span>
                        {onAddAnnotation && activeStepForNote !== stepId && (
                          <button
                            onClick={() => { setActiveStepForNote(stepId); setNoteInputText(''); }}
                            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium capitalize"
                          >
                            <Plus size={12} />
                            <span>Add note</span>
                          </button>
                        )}
                      </div>

                      {stepNotes.length > 0 && (
                        <div className="space-y-1.5">
                          {stepNotes.map(n => (
                            <div key={n.id} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 text-xs relative group/note flex justify-between items-start">
                              <p className="text-foreground leading-relaxed pr-6">{n.content}</p>
                              {onDeleteAnnotation && (
                                <button
                                  onClick={() => onDeleteAnnotation(n.id)}
                                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover/note:opacity-100 transition-opacity p-1"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {activeStepForNote === stepId && (
                        <div className="space-y-2 bg-secondary/40 p-3 rounded-lg border border-border mt-2">
                          <textarea
                            value={noteInputText}
                            onChange={e => setNoteInputText(e.target.value)}
                            placeholder="Add a personal note about this step..."
                            className="w-full text-xs bg-card border border-border rounded p-2 outline-none focus:border-primary resize-none h-16"
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => { setActiveStepForNote(null); setNoteInputText(''); }}
                              className="px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary rounded"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveStepNote(stepId, item.step)}
                              disabled={!noteInputText.trim() || isSubmitting}
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
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
