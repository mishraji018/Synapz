import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { FileText, Link as LinkIcon, Upload, PlaySquare, ArrowRight, Loader2, File as FileIcon, X, ChevronDown, ChevronUp, Sparkles, Settings2 } from 'lucide-react'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { SummaryOptions } from '@/lib/types'

export const Route = createFileRoute('/_auth/new')({
  component: NewNote,
})

type TabType = 'text' | 'upload' | 'youtube' | 'article'

const tabs = [
  { id: 'text' as TabType, label: 'Paste Text', icon: FileText },
  { id: 'upload' as TabType, label: 'Upload File', icon: Upload },
  { id: 'youtube' as TabType, label: 'YouTube Link', icon: PlaySquare },
  { id: 'article' as TabType, label: 'Article URL', icon: LinkIcon },
]

const lengthOptions = [
  { value: 'short', label: 'Short', desc: 'TL;DR style, 3-4 bullets' },
  { value: 'medium', label: 'Medium', desc: 'Balanced, 6-10 bullets' },
  { value: 'detailed', label: 'Detailed', desc: 'Comprehensive, 10-15 bullets' },
] as const

const styleOptions = [
  { value: 'simple', label: 'Simple', desc: 'Easy to understand' },
  { value: 'professional', label: 'Professional', desc: 'Business-ready' },
  { value: 'academic', label: 'Academic', desc: 'Scholarly tone' },
  { value: 'bullets', label: 'Bullet Points', desc: 'Maximum scannability' },
] as const

const focusOptions = [
  { value: 'general', label: '🎯 General' },
  { value: 'exam', label: '🎓 Exam Prep' },
  { value: 'research', label: '🔬 Research' },
  { value: 'business', label: '💼 Business' },
  { value: 'legal', label: '⚖️ Legal' },
  { value: 'news', label: '📰 News' },
  { value: 'meeting', label: '🤝 Meeting' },
] as const

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.doc,.txt'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  // @ts-ignore - worker setup for Vite
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
  
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item: any) => item.str).join(' ')
    fullText += pageText + '\n\n'
  }
  
  return fullText.trim()
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}

async function extractTxtText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read text file'))
    reader.readAsText(file)
  })
}

function getFileType(file: File): 'pdf' | 'docx' | 'txt' | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx'
  if (name.endsWith('.txt')) return 'txt'
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (file.type === 'text/plain') return 'txt'
  return null
}

function NewNote() {
  const [activeTab, setActiveTab] = useState<TabType>('text')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Analyzing your content...")
  const [subject, setSubject] = useState('')
  const [error, setError] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  
  // Summary options
  const [summaryLength, setSummaryLength] = useState<SummaryOptions['length']>('medium')
  const [summaryStyle, setSummaryStyle] = useState<SummaryOptions['style']>('simple')
  const [summaryFocus, setSummaryFocus] = useState<SummaryOptions['focus']>('general')
  
  // Tab-specific state
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [articleUrl, setArticleUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const navigate = useNavigate()

  const summaryOptions: SummaryOptions = {
    length: summaryLength,
    style: summaryStyle,
    focus: summaryFocus,
  }

  const handleGenerate = async () => {
    setError('')
    
    // Validation
    if (activeTab === 'text' && !text.trim()) {
      return setError('Please enter some text.')
    }
    if (activeTab === 'upload' && !file) {
      return setError('Please select a file.')
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
      let content: string | null = null
      let sourceType: string = activeTab

      // === TEXT ===
      if (activeTab === 'text') {
        content = text
        sourceType = 'text'
      }

      // === FILE UPLOAD (PDF / DOCX / TXT) ===
      if (activeTab === 'upload' && file) {
        const fileType = getFileType(file)
        if (!fileType) throw new Error("Unsupported file type.")
        
        setLoadingMessage(`Extracting text from ${fileType.toUpperCase()} file...`)
        
        if (fileType === 'pdf') {
          content = await extractPdfText(file)
        } else if (fileType === 'docx') {
          content = await extractDocxText(file)
        } else {
          content = await extractTxtText(file)
        }
        
        sourceType = fileType
        if (!content || content.length < 20) {
          throw new Error("Could not extract enough text from this file. The file might be image-based or empty.")
        }
        setLoadingMessage("Analyzing your content...")
      }

      // === YOUTUBE ===
      if (activeTab === 'youtube') {
        setLoadingMessage("Fetching video transcript...")
        
        let videoId = ''
        try {
          const urlObj = new URL(youtubeUrl)
          if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v') || ''
          } else if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1)
          }
        } catch (_e) { /* ignore */ }

        if (!videoId) {
          throw new Error("Could not extract Video ID from the URL.")
        }

        const { data, error } = await supabase.functions.invoke('get-youtube-transcript', {
          body: { video_id: videoId }
        })

        if (error) {
           console.error("Edge function error:", error)
           throw new Error("Failed to invoke transcript function.")
        }
        if (data?.error) {
           throw new Error(data.error)
        }

        content = `Video URL: ${youtubeUrl}\nVideo Title: ${data.title}\n\nTranscript:\n${data.transcript}`
        sourceType = 'youtube'
        setLoadingMessage("Analyzing your content...")
      }

      // === ARTICLE URL ===
      if (activeTab === 'article') {
        setLoadingMessage("Extracting article content...")
        
        const { data, error } = await supabase.functions.invoke('extract-article', {
          body: { url: articleUrl }
        })

        if (error) {
          console.error("Edge function error:", error)
          throw new Error("Failed to extract article content.")
        }
        if (data?.error) {
          throw new Error(data.error)
        }

        content = `Article URL: ${articleUrl}\nArticle Title: ${data.title}\n\nContent:\n${data.content}`
        sourceType = 'article'
        setLoadingMessage("Analyzing your content...")
      }

      if (!content) throw new Error("No content to process.")

      setLoadingMessage("AI is generating your summary...")
      const note = await api.createNote(sourceType as any, subject, content, summaryOptions)
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
      const fileType = getFileType(droppedFile)
      if (fileType) {
        if (droppedFile.size > MAX_FILE_SIZE) {
          setError('File size must be under 10MB.')
          return
        }
        setFile(droppedFile)
        setError('')
      } else {
        setError('Please upload a PDF, DOCX, or TXT file.')
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError('File size must be under 10MB.')
        return
      }
      const fileType = getFileType(selectedFile)
      if (!fileType) {
        setError('Unsupported file type. Please upload PDF, DOCX, or TXT.')
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-card border border-border p-8 rounded-2xl flex flex-col items-center shadow-xl animate-in zoom-in-95 duration-300 max-w-sm mx-4">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Sparkles size={12} className="text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2 text-center">{loadingMessage}</h3>
            <p className="text-muted-foreground text-center text-sm">
              Our AI is reading, extracting key points, and generating visualizations.
            </p>
            <div className="mt-4 flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
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
          {/* === TEXT TAB === */}
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
                  {text.length.toLocaleString()} characters · ~{Math.ceil(text.split(/\s+/).filter(Boolean).length)} words
                </div>
              </div>
            </div>
          )}

          {/* === UPLOAD TAB (PDF/DOCX/TXT) === */}
          {activeTab === 'upload' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block font-medium">Upload Document</label>
              {!file ? (
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer text-center"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                >
                  <input 
                    type="file" 
                    accept={ACCEPTED_FILE_TYPES}
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                  />
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                    <Upload size={32} />
                  </div>
                  <p className="font-medium text-lg mb-1">Click to upload or drag and drop</p>
                  <p className="text-muted-foreground text-sm">PDF, DOCX, or TXT files up to 10MB</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg p-6 bg-secondary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileIcon size={24} />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="font-medium truncate max-w-[200px] sm:max-w-[400px]">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB · {getFileType(file)?.toUpperCase()}
                      </p>
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

          {/* === YOUTUBE TAB === */}
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

          {/* === ARTICLE URL TAB === */}
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
              <p className="text-sm text-muted-foreground">We'll extract the article content and generate a summary.</p>
            </div>
          )}

          {/* === SUBJECT INPUT === */}
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
          
          {/* === SUMMARY OPTIONS PANEL === */}
          <div className="border-t border-border pt-4">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Settings2 size={16} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>Summary Options</span>
              {showOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {(summaryLength !== 'medium' || summaryStyle !== 'simple' || summaryFocus !== 'general') && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">Customized</span>
              )}
            </button>

            {showOptions && (
              <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 bg-secondary/20 rounded-xl p-5">
                {/* Length */}
                <div>
                  <label className="block text-sm font-semibold mb-3">Summary Length</label>
                  <div className="grid grid-cols-3 gap-3">
                    {lengthOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSummaryLength(opt.value)}
                        className={clsx(
                          "p-3 rounded-lg border text-left transition-all duration-200",
                          summaryLength === opt.value
                            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20"
                            : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                        )}
                      >
                        <div className="font-medium text-sm">{opt.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="block text-sm font-semibold mb-3">Summary Style</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {styleOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSummaryStyle(opt.value)}
                        className={clsx(
                          "p-3 rounded-lg border text-left transition-all duration-200",
                          summaryStyle === opt.value
                            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20"
                            : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                        )}
                      >
                        <div className="font-medium text-sm">{opt.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Focus */}
                <div>
                  <label className="block text-sm font-semibold mb-3">Summary Focus</label>
                  <div className="flex flex-wrap gap-2">
                    {focusOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSummaryFocus(opt.value)}
                        className={clsx(
                          "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                          summaryFocus === opt.value
                            ? "bg-primary text-primary-foreground shadow-sm scale-105"
                            : "bg-card border border-border hover:border-primary/30 hover:bg-primary/5"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* === ERROR === */}
          {error && (
            <div className="text-destructive text-sm font-medium animate-in fade-in bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* === GENERATE BUTTON === */}
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
                  <Sparkles size={18} />
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
