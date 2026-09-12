import { Note } from '@/lib/types'
import { PlayCircle } from 'lucide-react'

interface VideoSuggestionsProps {
  videos: Note['suggested_videos']
}

export function VideoSuggestions({ videos = [] }: VideoSuggestionsProps) {
  const safeVideos = videos || []
  if (!safeVideos.length) return null

  return (
    <div className="max-w-4xl mx-auto mt-12">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <PlayCircle className="text-red-500" />
        Suggested Videos
      </h3>
      
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
        {videos.map((video, index) => (
          <a 
            key={index} 
            href={video.video_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-shrink-0 w-72 bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:scale-[1.02] hover:shadow-lg shadow-sm transition-all duration-200 group snap-start block"
          >
            <div className="aspect-video w-full bg-secondary overflow-hidden relative">
              <img 
                src={video.thumbnail_url} 
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100 transform duration-300 shadow-lg">
                  <PlayCircle size={24} className="ml-1" />
                </div>
              </div>
            </div>
            <div className="p-4">
              <h4 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">{video.title}</h4>
              <p className="text-xs text-muted-foreground">{video.channel}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
