import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/search')({
  component: Search,
})

function Search() {
  const [query, setQuery] = useState('')
  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: api.getNotes,
  })

  const results = notes?.filter(note => 
    note.title.toLowerCase().includes(query.toLowerCase()) || 
    note.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  ) || []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Search</h1>
      
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for notes, tags, or content..."
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none shadow-sm text-lg"
          autoFocus
        />
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-20 bg-secondary rounded-xl animate-pulse"></div>
            <div className="h-20 bg-secondary rounded-xl animate-pulse"></div>
          </div>
        ) : query.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Found {results.length} results</p>
            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map(note => (
                  <Link 
                    key={note.id}
                    to="/note/$noteId"
                    params={{ noteId: note.id }}
                    className="block bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
                  >
                    <h3 className="font-semibold text-lg">{note.title}</h3>
                    <div className="flex gap-2 mt-2">
                      {note.tags.map(tag => (
                        <span key={tag} className="bg-secondary px-2 py-0.5 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                No results found for "{query}"
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground bg-card/50 border border-border border-dashed rounded-xl">
            Type something to start searching
          </div>
        )}
      </div>
    </div>
  )
}
