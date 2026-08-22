import { Note } from '@/lib/types'
import { clsx } from 'clsx'
import { Award, TrendingUp, Shield, Repeat } from 'lucide-react'

interface QualityBadgeProps {
  score: Note['quality_score']
  documentType?: string
}

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-500'
  if (score >= 75) return 'text-blue-500'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

const getScoreBg = (score: number) => {
  if (score >= 90) return 'bg-emerald-500/10'
  if (score >= 75) return 'bg-blue-500/10'
  if (score >= 60) return 'bg-amber-500/10'
  return 'bg-red-500/10'
}

const getScoreLabel = (score: number) => {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Needs Review'
}

const docTypeLabels: Record<string, string> = {
  research_paper: '📄 Research Paper',
  meeting_transcript: '🤝 Meeting Transcript',
  news: '📰 News Article',
  lecture: '🎓 Lecture Notes',
  legal: '⚖️ Legal Document',
  general: '📋 General Document',
}

export function QualityBadge({ score, documentType }: QualityBadgeProps) {
  if (!score) return null

  const metrics = [
    { label: 'Coverage', value: score.coverage, icon: TrendingUp },
    { label: 'Faithfulness', value: score.faithfulness, icon: Shield },
    { label: 'Redundancy', value: 100 - score.redundancy, icon: Repeat, tooltip: `${score.redundancy}% redundancy` },
  ]

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Document type badge */}
      {documentType && documentType !== 'general' && (
        <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
          {docTypeLabels[documentType] || documentType}
        </span>
      )}
      
      {/* Overall quality */}
      <div className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold", getScoreBg(score.overall), getScoreColor(score.overall))}>
        <Award size={14} />
        <span>{score.overall}/100</span>
        <span className="opacity-75">·</span>
        <span>{getScoreLabel(score.overall)}</span>
      </div>

      {/* Individual metrics */}
      {metrics.map(m => (
        <div key={m.label} className="flex items-center gap-1 text-xs text-muted-foreground" title={m.tooltip || `${m.label}: ${m.value}%`}>
          <m.icon size={12} />
          <span className="font-medium">{m.label}</span>
          <span className={clsx("font-semibold", getScoreColor(m.value))}>{m.value}%</span>
        </div>
      ))}
    </div>
  )
}
