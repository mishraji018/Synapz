import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { FileText, Link as LinkIcon, Upload, PlaySquare, ArrowRight, Loader2, File as FileIcon, X } from 'lucide-react'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_auth/new')({
  component: NewNote,
})

type TabType = 'text' | 'pdf' | 'youtube' | 'article'

const tabs = [
  { id: 'text' as TabType, label: 'Paste Text', icon: FileText },
  { id: 'pdf' as TabType, label: 'Upload PDF', icon: Upload },
  { id: 'youtube' as TabType, label: 'YouTube Link', icon: PlaySquare },
  { id: 'article' as TabType, label: 'Article URL', icon: LinkIcon },
]

function NewNote() {
  const [activeTab, setActiveTab] = useState<TabType>('text')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Analyzing your content...")
  const [subject, setSubject] = useState('')
  const [error, setError] = useState('')
  
  // Tab-specific state
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [articleUrl, setArticleUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const navigate = useNavigate()

  const handleGenerate = async () => {
    setError('')
    
    // Validation
    if (activeTab === 'text' && !text.trim()) {
      return setError('Please enter some text.')
    }
    if (activeTab === 'pdf' && !file) {
      return setError('Please select a PDF file.')
    }
    if (activeTab === 'youtube') {
      if (!youtubeUrl.trim()) return setError('Please enter a YouTube URL.')
      if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
        return setError('Please enter a valid YouTube URL.')
      }
    }
    if (activeTab === 'article') {
      if (!articleUrl.trim()) return setError('Please enter an Article URL.')
      try {
        new URL(articleUrl)
      } catch {
        return setError('Please enter a valid URL.')
      }
    }

    setLoading(true)
    setLoadingMessage("Analyzing your content...")
    try {
      let content = null;
      if (activeTab === 'text') {
        content = text;
      } else if (activeTab === 'youtube') {
        setLoadingMessage("Fetching video transcript...")
        
        let videoId = '';
        try {
          const urlObj = new URL(youtubeUrl);
          if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v') || '';
          } else if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1);
          }
        } catch (e) {}

        if (!videoId) {
          throw new Error("Could not extract Video ID from the URL.");
        }

        const { data, error } = await supabase.functions.invoke('get-youtube-transcript', {
          body: { video_id: videoId }
        });

        if (error) {
           console.error("Edge function error:", error);
           throw new Error("Failed to invoke transcript function.");
        }
        if (data?.error) {
           throw new Error(data.error);
        }

        content = `Video URL: ${youtubeUrl}\nVideo Title: ${data.title}\n\nTranscript:\n${data.transcript}`;
        setLoadingMessage("Analyzing your content...")
      }
      
      const note = await api.createNote(activeTab, subject, content)
      navigate({ to: '/note/$noteId', params: { noteId: note.id } })
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to process content, please try again')
      setLoading(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
        setError('')
      } else {
        setError('Please upload a PDF file.')
      }
    }
  }

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-card border border-border p-8 rounded-2xl flex flex-col items-center shadow-xl animate-in zoom-in-95 duration-300">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <h3 className="text-xl font-bold mb-2">{loadingMessage}</h3>
            <p className="text-muted-foreground text-center max-w-[250px]">
              Our AI is reading, extracting key points, and generating visualizations.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8 pt-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Create New Note</h1>
          <p className="text-muted-foreground">Submit content to generate a comprehensive AI summary and visualizations.</p>
        </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex border-b border-border overflow-x-auto relative">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "relative flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap overflow-hidden group",
                activeTab === tab.id
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              )}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
              <div 
                className={clsx(
                  "absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300 ease-out",
                  activeTab === tab.id ? "w-full" : "w-0 group-hover:w-full group-hover:opacity-30"
                )} 
              />
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {activeTab === 'text' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block font-medium">Paste your text</label>
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Paste the article, transcript, or document text here..."
                  className="w-full h-64 px-4 py-3 pb-8 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                />
                <div className="absolute bottom-3 right-4 text-xs text-muted-foreground">
                  {text.length} characters
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block font-medium">Upload PDF Document</label>
              {!file ? (
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer text-center"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                >
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setFile(e.target.files[0])
                        setError('')
                      }
                    }}
                  />
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                    <Upload size={32} />
                  </div>
                  <p className="font-medium text-lg mb-1">Click to upload or drag and drop</p>
                  <p className="text-muted-foreground text-sm">PDF files up to 10MB</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg p-6 bg-secondary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileIcon size={24} />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="font-medium truncate max-w-[200px] sm:max-w-[400px]">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setFile(null)}
                    className="text-muted-foreground hover:text-destructive px-3 py-1.5 rounded-md hover:bg-destructive/10 transition-colors flex items-center gap-2"
                  >
                    <X size={16} />
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'youtube' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block font-medium">YouTube Video URL</label>
              <div className="relative">
                <PlaySquare className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full pl-12 pr-4 py-3 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <p className="text-sm text-muted-foreground">We'll extract the transcript and summarize the video.</p>
            </div>
          )}

          {activeTab === 'article' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block font-medium">Article URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="url"
                  value={articleUrl}
                  onChange={(e) => {
                    setArticleUrl(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="https://example.com/article"
                  className="w-full pl-12 pr-4 py-3 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          )}

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-4 border-t border-border mt-6">
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">
              Subject <span className="font-normal opacity-80">(optional — AI will assign one if left blank)</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics, Web Dev, Finance..."
              className="w-full max-w-sm px-3 py-2 text-sm bg-secondary/10 border border-border rounded-md focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          
          {error && (
            <div className="text-destructive text-sm font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:scale-[1.02] hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Generate Notes</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}
