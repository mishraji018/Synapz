import { useState } from 'react'
import { Note } from '@/lib/types'
import { clsx } from 'clsx'
import { Zap, Target, CheckSquare, Hash, Users, ChevronRight } from 'lucide-react'

interface KeyInsightsProps {
  note: Note
}

type InsightTab = 'tldr' | 'key_points' | 'action_items' | 'keywords' | 'entities'

const insightTabs = [
  { id: 'tldr' as InsightTab, label: 'TL;DR', icon: Zap, color: 'text-amber-500' },
  { id: 'key_points' as InsightTab, label: 'Key Points', icon: Target, color: 'text-blue-500' },
  { id: 'action_items' as InsightTab, label: 'Action Items', icon: CheckSquare, color: 'text-emerald-500' },
  { id: 'keywords' as InsightTab, label: 'Keywords', icon: Hash, color: 'text-purple-500' },
  { id: 'entities' as InsightTab, label: 'Entities', icon: Users, color: 'text-rose-500' },
]

const entityTypeColors: Record<string, string> = {
  person: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  company: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  place: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  date: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  concept: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  other: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
}

export function KeyInsights({ note }: KeyInsightsProps) {
  const [activeTab, setActiveTab] = useState<InsightTab>('tldr')

  // Check if there's any data to show
  const hasTldr = note.tldr && note.tldr.length > 0
  const hasKeyPoints = note.key_points && note.key_points.length > 0
  const hasActionItems = note.action_items && note.action_items.length > 0
  const hasKeywords = note.keywords && note.keywords.length > 0
  const hasEntities = note.entities && note.entities.length > 0

  const hasAnyInsight = hasTldr || hasKeyPoints || hasActionItems || hasKeywords || hasEntities
  if (!hasAnyInsight) return null

  const availableTabs = insightTabs.filter(tab => {
    if (tab.id === 'tldr') return hasTldr
    if (tab.id === 'key_points') return hasKeyPoints
    if (tab.id === 'action_items') return hasActionItems
    if (tab.id === 'keywords') return hasKeywords
    if (tab.id === 'entities') return hasEntities
    return false
  })

  // Set active tab to first available if current is not available
  const effectiveTab = availableTabs.find(t => t.id === activeTab) ? activeTab : availableTabs[0]?.id || 'tldr'

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Zap size={20} className="text-primary" />
          Key Insights
        </h2>
      </div>

      {/* Tab Bar */}
      <div className="flex overflow-x-auto border-b border-border bg-secondary/20">
        {availableTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 relative",
              effectiveTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            )}
          >
            <tab.icon size={16} className={effectiveTab === tab.id ? tab.color : ''} />
            <span>{tab.label}</span>
            {effectiveTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 animate-in fade-in duration-200">
        {/* TL;DR */}
        {effectiveTab === 'tldr' && hasTldr && (
          <div className="space-y-3">
            <p className="text-base leading-relaxed bg-amber-500/5 border border-amber-500/10 rounded-lg p-4">
              {note.tldr}
            </p>
          </div>
        )}

        {/* Key Points */}
        {effectiveTab === 'key_points' && hasKeyPoints && (
          <ul className="space-y-3">
            {note.key_points!.map((point, i) => (
              <li key={i} className="flex gap-3 items-start group">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 group-hover:bg-blue-500/20 transition-colors">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed pt-1">{point}</p>
              </li>
            ))}
          </ul>
        )}

        {/* Action Items */}
        {effectiveTab === 'action_items' && hasActionItems && (
          <ul className="space-y-3">
            {note.action_items!.map((item, i) => (
              <li key={i} className="flex gap-3 items-start group">
                <div className="w-5 h-5 rounded border-2 border-emerald-500/50 flex-shrink-0 mt-0.5 group-hover:border-emerald-500 transition-colors" />
                <p className="text-sm leading-relaxed">{item}</p>
              </li>
            ))}
          </ul>
        )}

        {/* Keywords */}
        {effectiveTab === 'keywords' && hasKeywords && (
          <div className="flex flex-wrap gap-2">
            {note.keywords!.map((keyword, i) => (
              <span 
                key={i} 
                className="px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium hover:bg-purple-500/20 transition-colors cursor-default"
              >
                <Hash size={12} className="inline mr-1 opacity-60" />
                {keyword}
              </span>
            ))}
          </div>
        )}

        {/* Entities */}
        {effectiveTab === 'entities' && hasEntities && (
          <div className="space-y-2">
            {note.entities!.map((entity, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors group">
                <span className={clsx("px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider flex-shrink-0", entityTypeColors[entity.type] || entityTypeColors.other)}>
                  {entity.type}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{entity.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{entity.context}</div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
