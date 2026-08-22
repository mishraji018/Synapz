import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import { GlobalChatMessage } from '@/lib/types'
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  FileText, 
  ExternalLink,
  MessageSquare,
  Compass
} from 'lucide-react'
import { clsx } from 'clsx'

export const Route = createFileRoute('/_auth/chat')({
  component: GlobalChat,
})

const starterQuestions = [
  "What are the main key takeaways across all my notes?",
  "List all pending action items from my documents",
  "Summarize the most important concepts I've learned recently",
  "What topics or entities appear most frequently in my notes?",
]

function GlobalChat() {
  const [messages, setMessages] = useState<GlobalChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleAsk = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return

    const userMsg: GlobalChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: questionText.trim(),
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const { answer, citations } = await api.askGlobalKnowledge(userMsg.content, history)

      const assistantMsg: GlobalChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: answer,
        citations,
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (error: any) {
      console.error("Global Chat error:", error)
      const errorMsg: GlobalChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I ran into an error while synthesizing answers from your knowledge base. Please try again.",
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAsk(input)
  }

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (_e) {
      // ignore
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="text-primary" size={26} />
            <span>Ask My Knowledge</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI synthesis grounded in your entire library of notes, summaries, mindmaps & document chunks.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-destructive/10 border border-border transition-colors"
          >
            <Trash2 size={13} />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 bg-card border border-border rounded-2xl p-4 md:p-6 overflow-y-auto space-y-6 shadow-sm">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center shadow-inner">
              <Sparkles size={32} />
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-2">Cross-Document Knowledge Chat</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ask any question across all your summarized articles, YouTube videos, PDFs, and mindmaps.
                Answers are grounded directly in your notes and accompanied by clickable citation references.
              </p>
            </div>

            {/* Suggested Starter Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
              {starterQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleAsk(q)}
                  className="flex items-center gap-2.5 text-left p-3.5 rounded-xl border border-border bg-secondary/20 hover:bg-primary/5 hover:border-primary/30 transition-all text-xs font-medium group"
                >
                  <MessageSquare size={14} className="text-primary shrink-0 opacity-70 group-hover:opacity-100" />
                  <span className="line-clamp-2">{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={clsx("flex gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={16} />
                </div>
              )}

              <div className={clsx(
                "group relative max-w-[88%] rounded-2xl p-5 space-y-3",
                msg.role === 'user'
                  ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                  : "bg-secondary/40 text-foreground border border-border/80 rounded-tl-sm shadow-sm"
              )}>
                {/* Content */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {/* Citations / Source References */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-3 border-t border-border/40 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <FileText size={11} className="text-primary" />
                      Sources & Citations
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((c, idx) => (
                        <Link
                          key={idx}
                          to="/note/$noteId"
                          params={{ noteId: c.document_id }}
                          className="bg-card hover:bg-secondary border border-border px-3 py-1.5 rounded-lg text-xs font-medium text-foreground flex items-center gap-2 hover:border-primary/40 transition-all group/chip max-w-[260px]"
                        >
                          <span className="truncate">{c.document_title}</span>
                          <ExternalLink size={12} className="text-muted-foreground group-hover/chip:text-primary shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy button */}
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded bg-card/60"
                    title="Copy Answer"
                  >
                    {copiedId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={16} />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-secondary/40 border border-border rounded-2xl rounded-tl-sm p-4 flex gap-2 items-center">
              <span className="text-xs text-muted-foreground font-medium">Synthesizing from your notes</span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything across all your saved documents & notes..."
          className="w-full pl-5 pr-14 py-3.5 bg-card border border-border focus:border-primary rounded-xl outline-none text-sm shadow-sm transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-primary text-primary-foreground rounded-lg flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
