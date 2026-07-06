import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { Note } from '@/lib/types'
import { useState } from 'react'
import { X } from 'lucide-react'

interface TreemapViewProps {
  data: Note['treemap']
}

export function TreemapView({ data }: TreemapViewProps) {
  const [selectedSubtopic, setSelectedSubtopic] = useState<Note['treemap']['subtopics'][0] | null>(null)

  const chartData = [{
    name: data.main_topic,
    children: data.subtopics.map(sub => ({
      name: sub.name,
      size: sub.weight || 10,
      points: sub.points,
    }))
  }]

  // Tailwind colors matching our tags (blue, emerald, purple, amber, rose)
  const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#f43f5e']

  const CustomizedContent = (props: any) => {
    const { x, y, width, height, index, name, depth } = props
    
    // Only render the children (subtopics), not the root container
    if (depth !== 1) return null
    
    const originalSubtopic = data.subtopics.find(s => s.name === name)

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: colors[index % colors.length],
            stroke: 'var(--background)',
            strokeWidth: 2,
            strokeOpacity: 1,
            cursor: 'pointer',
          }}
          onClick={() => {
            if (originalSubtopic) setSelectedSubtopic(originalSubtopic)
          }}
          className="hover:opacity-80 transition-opacity"
        />
        {width > 50 && height > 30 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            fill="#fff"
            fontSize={14}
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
    <div className="flex flex-col md:flex-row gap-6 h-[500px]">
      <div className="flex-1 bg-card border border-border rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-4">{data.main_topic}</h3>
        <div className="h-[400px] w-full">
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
                    const data = payload[0].payload
                    return (
                      <div className="bg-popover text-popover-foreground border border-border p-3 rounded-lg shadow-md z-50">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-sm text-muted-foreground">Weight: {data.size}</p>
                        <p className="text-xs text-primary mt-1">Click to view details</p>
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
        <div className="w-full md:w-80 bg-card border border-border rounded-xl p-6 relative animate-in slide-in-from-right-4">
          <button 
            onClick={() => setSelectedSubtopic(null)}
            className="absolute top-4 right-4 p-1 hover:bg-secondary rounded-full"
          >
            <X size={16} />
          </button>
          <h4 className="text-xl font-bold mb-4 pr-6 text-primary">{selectedSubtopic.name}</h4>
          <div className="space-y-4">
            <div className="bg-secondary/50 p-3 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">Relevance Weight</span>
              <span className="font-bold">{selectedSubtopic.weight}</span>
            </div>
            <div>
              <h5 className="font-semibold mb-2">Key Points:</h5>
              <ul className="space-y-2">
                {selectedSubtopic.points.map((point, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
