import { useState, useEffect } from 'react'
import { Plus, X, Tag } from 'lucide-react'

interface TagEditorProps {
  initialTags?: string[]
  onTagsChange?: (tags: string[]) => void
}

const tagColors = [
  'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
  'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300',
  'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
]

function getTagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return tagColors[Math.abs(hash) % tagColors.length]
}

export function TagEditor({ initialTags = [], onTagsChange }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags || [])
  const [isEditing, setIsEditing] = useState(false)
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    setTags(initialTags || [])
  }, [initialTags])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()]
      setTags(updatedTags)
      onTagsChange?.(updatedTags)
      setNewTag('')
    }
    setIsEditing(false)
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove)
    setTags(updatedTags)
    onTagsChange?.(updatedTags)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 max-w-4xl mx-auto">
      <div className="flex items-center gap-1.5 text-muted-foreground mr-2">
        <Tag size={16} />
        <span className="text-sm font-medium">Tags:</span>
      </div>
      
      {tags.map(tag => (
        <span 
          key={tag} 
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 group ${getTagColor(tag)}`}
        >
          {tag}
          <button 
            onClick={() => handleRemoveTag(tag)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
          >
            <X size={14} />
          </button>
        </span>
      ))}

      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTag()
              if (e.key === 'Escape') setIsEditing(false)
            }}
            placeholder="Add tag..."
            className="bg-background border border-primary px-3 py-1 rounded-full text-sm w-24 outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
            onBlur={() => newTag.trim() ? handleAddTag() : setIsEditing(false)}
          />
        </div>
      ) : (
        <button 
          onClick={() => setIsEditing(true)}
          className="border border-dashed border-border text-muted-foreground px-3 py-1 rounded-full text-sm font-medium hover:bg-secondary/50 hover:text-foreground hover:border-muted-foreground transition-colors flex items-center gap-1"
        >
          <Plus size={14} />
          <span>Add</span>
        </button>
      )}
    </div>
  )
}
