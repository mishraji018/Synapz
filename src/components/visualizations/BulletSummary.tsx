import { Note } from '@/lib/types'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface BulletSummaryProps {
  data: Note['bullet_summary']
}

export function BulletSummary({ data }: BulletSummaryProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const textToCopy = data.map(bullet => `• ${bullet}`).join('\n')
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!data.length) return null

  return (
    <div className="bg-card border border-border rounded-xl p-6 md:p-8 relative group max-w-4xl mx-auto shadow-sm hover:shadow-md transition-shadow duration-300">
      <button 
        onClick={handleCopy}
        className="absolute top-4 right-4 p-2 bg-secondary text-secondary-foreground rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary/80 flex items-center gap-2"
        title="Copy to clipboard"
      >
        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        <span className="text-sm font-medium pr-1">{copied ? 'Copied' : 'Copy'}</span>
      </button>

      <h3 className="text-xl font-bold mb-6">Key Takeaways</h3>
      
      <ul className="space-y-4">
        {data.map((bullet, index) => (
          <li key={index} className="flex gap-4 items-start">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-bold">{index + 1}</span>
            </div>
            <p className="text-foreground leading-relaxed text-lg">{bullet}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
