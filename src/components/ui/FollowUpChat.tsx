import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Trash2, Copy, Check, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api'

interface FollowUpChatProps {
  noteId: string
  noteContent: any
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const suggestedPrompts = [
  "Explain this simply in 2 sentences",
  "What are the top 3 actionable takeaways?",
  "What are the main risks or limitations mentioned?",
  "Give me a quiz question based on this note",
]

export function FollowUpChat({ noteId, noteContent }: FollowUpChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
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

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: questionText }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.askFollowUp(noteId, userMsg.content, noteContent)
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response }
      setMessages(prev => [...prev, assistantMsg])
    } catch (error) {
      console.error('Failed to get answer', error)
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I failed to get an answer. Please check your network or try again.' }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAsk(input)
  }

  const handleCopyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (_e) {
      // ignore
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden max-w-4xl mx-auto mt-12 h-[560px] shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              Ask Your Document
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] uppercase tracking-wider font-semibold">AI Assistant</span>
            </h3>
            <p className="text-xs text-muted-foreground">Ask follow-up questions or clarify concepts from this note.</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-destructive/10 transition-colors"
            title="Clear chat history"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-base mb-1">Interactive Document Q&A</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Have a question about this summary? Ask below or choose one of the suggested prompts to get started.
              </p>
            </div>

            {/* Suggested prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full pt-2">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleAsk(prompt)}
                  className="flex items-center gap-2 text-left p-3 rounded-lg border border-border bg-secondary/20 hover:bg-primary/5 hover:border-primary/30 transition-all text-xs font-medium group"
                >
                  <MessageSquare size={14} className="text-primary shrink-0 opacity-70 group-hover:opacity-100" />
                  <span className="line-clamp-2">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={16} />
                </div>
              )}
              
              <div className={`group relative max-w-[85%] rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-secondary text-secondary-foreground rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                    className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded bg-card/60"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
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
            <div className="bg-secondary rounded-2xl rounded-tl-sm p-4 flex gap-1.5 items-center">
              <span className="text-xs text-muted-foreground font-medium mr-1">AI is thinking</span>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about this document..."
            className="w-full pl-4 pr-12 py-3 bg-secondary/50 border border-transparent focus:border-primary focus:bg-background rounded-full outline-none transition-all text-sm"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center disabled:opacity-50 transition-opacity hover:scale-105 active:scale-95"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  )
}
