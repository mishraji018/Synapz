import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'
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

export function FollowUpChat({ noteId, noteContent }: FollowUpChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.askFollowUp(noteId, userMsg.content, noteContent)
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response }
      setMessages(prev => [...prev, assistantMsg])
    } catch (error) {
      console.error('Failed to get answer', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden max-w-4xl mx-auto mt-12 h-[500px]">
      <div className="p-4 border-b border-border bg-secondary/30">
        <h3 className="font-bold flex items-center gap-2">
          <Bot size={18} className="text-primary" />
          Ask a Follow-up Question
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Chat with the AI about this note's content.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <Bot size={32} className="opacity-50" />
            <p>Ask me anything about this summary!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                  <Bot size={16} />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-2xl p-3 ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-secondary text-secondary-foreground rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0">
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
            <div className="bg-secondary rounded-2xl rounded-tl-sm p-3 flex gap-1 items-center">
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="E.g., What were the main reasons for the revenue increase?"
            className="w-full pl-4 pr-12 py-3 bg-secondary/50 border border-transparent focus:border-primary rounded-full outline-none transition-colors"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center disabled:opacity-50 transition-opacity"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  )
}
