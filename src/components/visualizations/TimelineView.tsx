import { Note } from '@/lib/types'
import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

interface TimelineViewProps {
  data: Note['timeline']
}

export function TimelineView({ data }: TimelineViewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0) // First item expanded by default

  if (!data.length) return null

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="relative border-l-2 border-border ml-4 md:ml-6 space-y-12">
        {data.map((item, index) => {
          const isExpanded = expandedIndex === index
          return (
            <div key={index} className="relative pl-8 md:pl-12 group">
              <div className="absolute -left-[11px] top-1.5 w-5 h-5 rounded-full bg-background border-4 border-primary group-hover:scale-125 transition-transform" />
              
              <div 
                className="bg-card border border-border rounded-xl p-6 shadow-sm group-hover:border-primary/30 group-hover:shadow-md group-hover:-translate-y-1 transition-all duration-300 relative cursor-pointer"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <div className="absolute top-1/2 -left-3 w-3 h-0.5 bg-border group-hover:bg-primary/30 -translate-y-1/2 hidden md:block"></div>
                
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-primary">{item.step}</h4>
                  <ChevronDown size={18} className={clsx("text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180")} />
                </div>
                
                <div className={clsx("grid transition-all duration-300 ease-in-out", isExpanded ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0")}>
                  <p className="overflow-hidden text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
