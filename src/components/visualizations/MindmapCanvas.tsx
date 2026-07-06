import { Note } from '@/lib/types'
import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
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
// @ts-ignore
import '@xyflow/react/dist/style.css'

interface MindmapCanvasProps {
  data: Note['mindmap']
  bullets: Note['bullet_summary']
}

export function MindmapCanvas({ data, bullets }: MindmapCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  // Map data to react-flow format
  const initialNodes: Node[] = data.nodes.map((n, i) => ({
    id: n.id,
    position: { 
      x: i === 0 ? 300 : 100 + (i * 150), 
      y: i === 0 ? 50 : 200 + (i % 2 === 0 ? 50 : 0) 
    },
    data: { label: n.label },
    className: i === 0 
      ? '!bg-indigo-600 !text-white !border-none !font-bold !rounded-xl !shadow-lg !px-6 !py-3 cursor-pointer' 
      : '!bg-teal-600 !text-white !border-none !rounded-lg !shadow-sm !px-4 !py-2 !font-medium cursor-pointer hover:!bg-teal-700 transition-colors',
  }))

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
  }

  const nodeDetails = selectedNode 
    ? (data.nodes.find(n => n.id === selectedNode.id)?.details || [])
    : []

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[500px]">
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
        
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground border border-border">
          Click a node to view details
        </div>
      </div>

      {selectedNode && (
        <div className="w-full md:w-80 bg-card border border-border rounded-xl p-6 relative shadow-sm animate-in slide-in-from-right-4">
          <button 
            onClick={() => setSelectedNode(null)}
            className="absolute top-4 right-4 p-1 hover:bg-secondary rounded-full transition-colors"
          >
            <X size={16} />
          </button>
          <h4 className="text-xl font-bold mb-4 pr-6 text-primary">{selectedNode.data.label as string}</h4>
          
          <div className="space-y-4">
            <h5 className="font-semibold">Details:</h5>
            {nodeDetails.length > 0 ? (
              <ul className="space-y-3">
                {nodeDetails.map((detail, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No detailed points found for this node.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
