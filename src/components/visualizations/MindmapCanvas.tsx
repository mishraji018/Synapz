import { Note, NodeAnnotation, BookmarkedItem } from '@/lib/types'
import { useCallback, useState } from 'react'
import { X, Sparkles, Layers, Star, Plus, Trash2, StickyNote, Check } from 'lucide-react'
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Node,
  Edge
} from '@xyflow/react'
import { clsx } from 'clsx'
// @ts-ignore
import '@xyflow/react/dist/style.css'

interface MindmapCanvasProps {
  data: Note['mindmap']
  bullets?: Note['bullet_summary']
  noteId?: string
  nodeAnnotations?: NodeAnnotation[]
  bookmarks?: BookmarkedItem[]
  onAddAnnotation?: (nodeId: string, nodeLabel: string, content: string) => Promise<void>
  onDeleteAnnotation?: (annotationId: string) => Promise<void>
  onToggleBookmark?: (targetId: string, targetType: BookmarkedItem['target_type'], label: string, detail?: string) => Promise<void>
}

export function MindmapCanvas({ 
  data, 
  bullets, 
  nodeAnnotations = [], 
  bookmarks = [],
  onAddAnnotation,
  onDeleteAnnotation,
  onToggleBookmark
}: MindmapCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [newNoteText, setNewNoteText] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)

  // Calculate layout positions
  const rootId = data.nodes[0]?.id
  const outgoingEdgesFromRoot = data.edges.filter(e => e.source === rootId)
  const childIdsOfRoot = new Set(outgoingEdgesFromRoot.map(e => e.target))

  const initialNodes: Node[] = data.nodes.map((n, i) => {
    const isRoot = i === 0
    const isLevel1 = childIdsOfRoot.has(n.id)
    const hasNotes = nodeAnnotations.some(a => a.node_id === n.id)
    const isBookmarked = bookmarks.some(b => b.target_id === n.id)

    // Calculate layout positions
    let posX = 400
    let posY = 50

    if (!isRoot) {
      if (isLevel1) {
        const level1Array = Array.from(childIdsOfRoot)
        const indexInLevel1 = level1Array.indexOf(n.id)
        const totalLevel1 = level1Array.length || 1
        const spacing = Math.max(180, 700 / totalLevel1)
        posX = 100 + indexInLevel1 * spacing
        posY = 180
      } else {
        const leafIndex = i - (childIdsOfRoot.size + 1)
        posX = 80 + (leafIndex % 4) * 200
        posY = 300 + Math.floor(leafIndex / 4) * 100
      }
    }

    let nodeStyle = '!bg-indigo-600 !text-white !border-none !font-bold !rounded-xl !shadow-lg !px-6 !py-3 cursor-pointer'
    if (isLevel1) {
      nodeStyle = '!bg-teal-600 !text-white !border-none !rounded-lg !shadow-md !px-4 !py-2 !font-semibold cursor-pointer hover:!bg-teal-700 transition-colors'
    } else if (!isRoot) {
      nodeStyle = '!bg-card !text-foreground !border !border-border !rounded-lg !shadow-sm !px-3 !py-1.5 !text-xs !font-medium cursor-pointer hover:!border-primary transition-colors'
    }

    return {
      id: n.id,
      position: { x: posX, y: posY },
      data: { 
        label: n.label, 
        details: n.details,
        hasNotes,
        isBookmarked
      },
      className: nodeStyle,
    }
  })

  const initialEdges: Edge[] = data.edges.map((e) => ({
    id: `e${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: 'var(--primary)', strokeWidth: 2 }
  }))

  const [nodes, setNodes] = useState<Node[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setIsAddingNote(false)
    setNewNoteText('')
  }

  const selectedNodeData = selectedNode 
    ? data.nodes.find(n => n.id === selectedNode.id)
    : null

  const nodeDetails = selectedNodeData?.details || []
  const currentNodeNotes = selectedNode ? nodeAnnotations.filter(a => a.node_id === selectedNode.id) : []
  const isCurrentNodeBookmarked = selectedNode ? bookmarks.some(b => b.target_id === selectedNode.id) : false

  const handleSaveNodeNote = async () => {
    if (!newNoteText.trim() || !selectedNode || !onAddAnnotation) return
    setIsSubmittingNote(true)
    try {
      await onAddAnnotation(
        selectedNode.id, 
        (selectedNode.data.label as string) || 'Mindmap Node', 
        newNoteText.trim()
      )
      setNewNoteText('')
      setIsAddingNote(false)
    } finally {
      setIsSubmittingNote(false)
    }
  }

  const handleToggleBookmark = async () => {
    if (!selectedNode || !onToggleBookmark) return
    await onToggleBookmark(
      selectedNode.id,
      'mindmap_node',
      (selectedNode.data.label as string) || 'Mindmap Node',
      nodeDetails.slice(0, 2).join(' • ')
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[560px]">
      <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden relative shadow-sm">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--muted-foreground)" gap={20} size={1} />
          <Controls className="bg-card border-border fill-foreground" />
        </ReactFlow>
        
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground border border-border flex items-center gap-1.5 shadow-sm">
          <Sparkles size={12} className="text-primary" />
          <span>Click any node to explore details, add notes & bookmark</span>
        </div>
      </div>

      {selectedNode ? (
        <div className="w-full md:w-88 bg-card border border-border rounded-xl p-6 relative shadow-sm animate-in slide-in-from-right-4 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Node Inspector
              </span>
              {onToggleBookmark && (
                <button
                  onClick={handleToggleBookmark}
                  className={clsx(
                    "p-1 rounded-md transition-colors",
                    isCurrentNodeBookmarked 
                      ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                  title={isCurrentNodeBookmarked ? "Remove Bookmark" : "Bookmark this node"}
                >
                  <Star size={15} className={isCurrentNodeBookmarked ? "fill-amber-500" : ""} />
                </button>
              )}
            </div>

            <button 
              onClick={() => setSelectedNode(null)}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="mb-4 pr-2">
            <h4 className="text-xl font-bold text-foreground leading-tight">
              {selectedNode.data.label as string}
            </h4>
          </div>

          {/* AI Extracted Key Points */}
          <div className="space-y-4 mb-6">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Points & Details</h5>
            {nodeDetails.length > 0 ? (
              <ul className="space-y-2.5">
                {nodeDetails.map((detail, idx) => (
                  <li key={idx} className="flex gap-2.5 text-xs leading-relaxed bg-secondary/30 p-2.5 rounded-lg border border-border/50">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic bg-secondary/20 p-3 rounded-lg">
                No detailed points found for this specific node.
              </p>
            )}
          </div>

          {/* Personal User Notes Tied to this Node */}
          <div className="mt-auto border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <StickyNote size={12} className="text-primary" />
                <span>My Node Notes ({currentNodeNotes.length})</span>
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

            {/* List of user notes */}
            {currentNodeNotes.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {currentNodeNotes.map(n => (
                  <div key={n.id} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 text-xs relative group">
                    <p className="text-foreground leading-relaxed pr-6">{n.content}</p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {onDeleteAnnotation && (
                      <button
                        onClick={() => onDeleteAnnotation(n.id)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add note inline form */}
            {isAddingNote && (
              <div className="space-y-2 bg-secondary/30 p-2.5 rounded-lg border border-border animate-in fade-in">
                <textarea
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  placeholder="Write a personal note or takeaway for this node..."
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
                    onClick={handleSaveNodeNote}
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
      ) : bullets && bullets.length > 0 ? (
        <div className="hidden lg:flex w-72 bg-secondary/20 border border-border rounded-xl p-5 flex-col">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Layers size={14} className="text-primary" />
            Quick Overview
          </h5>
          <ul className="space-y-2 overflow-y-auto text-xs text-muted-foreground flex-1 pr-1">
            {bullets.slice(0, 6).map((bullet, idx) => (
              <li key={idx} className="line-clamp-3 bg-card p-2.5 rounded-lg border border-border">
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
