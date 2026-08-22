import { Note, BookmarkedItem } from '@/lib/types'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Star, CheckCircle, HelpCircle, Award, Sparkles, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

interface FlashcardDeckProps {
  cards: Note['flashcards']
  bookmarks?: BookmarkedItem[]
  onToggleBookmark?: (targetId: string, targetType: BookmarkedItem['target_type'], label: string, detail?: string) => Promise<void>
}

export function FlashcardDeck({ cards, bookmarks = [], onToggleBookmark }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isRevisionMode, setIsRevisionMode] = useState(false)
  
  // Revision tracking state: 1 = mastered (green), -1 = still learning (orange)
  const [cardStats, setCardStats] = useState<Record<number, 'mastered' | 'learning'>>({})
  const [sessionCompleted, setSessionCompleted] = useState(false)

  const handleNext = () => {
    setIsFlipped(false)
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else if (isRevisionMode) {
        setSessionCompleted(true)
      } else {
        setCurrentIndex(0)
      }
    }, 150)
  }

  const handlePrev = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length)
    }, 150)
  }

  const handleRateCard = (status: 'mastered' | 'learning') => {
    setCardStats(prev => ({ ...prev, [currentIndex]: status }))
    handleNext()
  }

  const startRevisionSession = () => {
    setIsRevisionMode(true)
    setSessionCompleted(false)
    setCardStats({})
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  const exitRevisionMode = () => {
    setIsRevisionMode(false)
    setSessionCompleted(false)
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionCompleted) return
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsFlipped(f => !f)
      }
      if (isRevisionMode && isFlipped) {
        if (e.key === '1') handleRateCard('learning')
        if (e.key === '2') handleRateCard('mastered')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cards.length, isRevisionMode, isFlipped, sessionCompleted, currentIndex])

  if (!cards.length) return null

  const currentCard = cards[currentIndex]
  const cardId = `flashcard_${currentIndex + 1}`
  const isBookmarked = bookmarks.some(b => b.target_id === cardId)

  // Revision Stats
  const masteredCount = Object.values(cardStats).filter(s => s === 'mastered').length
  const learningCount = Object.values(cardStats).filter(s => s === 'learning').length
  const answeredCount = Object.keys(cardStats).length
  const progressPercent = Math.round((answeredCount / cards.length) * 100)
  const masteryPercent = answeredCount > 0 ? Math.round((masteredCount / answeredCount) * 100) : 0

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-6">
      {/* Top Controls Bar */}
      <div className="w-full flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          {!isRevisionMode ? (
            <button
              onClick={startRevisionSession}
              className="bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
            >
              <Sparkles size={13} />
              <span>Start Revision Mode</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Revision Mode
              </span>
              <button
                onClick={exitRevisionMode}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Exit
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Card {currentIndex + 1} of {cards.length}
          </span>
          {onToggleBookmark && (
            <button
              onClick={() => onToggleBookmark(cardId, 'flashcard', currentCard.question, currentCard.answer)}
              className={clsx(
                "p-1.5 rounded-md transition-colors",
                isBookmarked ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title={isBookmarked ? "Remove Bookmark" : "Bookmark Card"}
            >
              <Star size={15} className={isBookmarked ? "fill-amber-500" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* Revision Progress Bar */}
      {isRevisionMode && (
        <div className="w-full mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progress: {progressPercent}%</span>
            <span>Mastery: {masteryPercent}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${(masteredCount / cards.length) * 100}%` }} />
            <div className="bg-amber-500 transition-all duration-300" style={{ width: `${(learningCount / cards.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Session Recap Modal / Screen */}
      {sessionCompleted ? (
        <div className="w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg animate-in zoom-in-95 space-y-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <Award size={36} />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Revision Session Completed!</h3>
            <p className="text-muted-foreground text-sm">
              You reviewed {cards.length} cards in this document deck.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{masteredCount}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">Mastered</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{learningCount}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">Still Learning</div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={startRevisionSession}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"
            >
              <RefreshCw size={14} />
              <span>Restart Session</span>
            </button>
            <button
              onClick={exitRevisionMode}
              className="border border-border hover:bg-secondary px-5 py-2 rounded-lg text-sm font-medium"
            >
              Back to Deck
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Card Flip Canvas */}
          <div 
            className="w-full h-80 perspective-1000 cursor-pointer select-none"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={clsx(
              "w-full h-full relative preserve-3d transition-transform duration-500",
              isFlipped && "rotate-y-180"
            )}>
              {/* Front Side */}
              <div className="absolute inset-0 backface-hidden bg-card border-2 border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300">
                <span className="text-primary font-bold tracking-wider uppercase text-[11px] absolute top-6 left-6 bg-primary/10 px-2.5 py-1 rounded-full">
                  Question
                </span>
                <h3 className="text-2xl font-semibold text-foreground px-4 leading-relaxed">
                  {currentCard.question}
                </h3>
                <div className="absolute bottom-6 flex items-center gap-2 text-muted-foreground text-xs">
                  <RotateCcw size={13} />
                  <span>Click card or press Space to flip</span>
                </div>
              </div>

              {/* Back Side */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-primary to-indigo-700 text-white rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-md">
                <span className="text-white/80 font-bold tracking-wider uppercase text-[11px] absolute top-6 left-6 bg-white/20 px-2.5 py-1 rounded-full">
                  Answer
                </span>
                <p className="text-xl font-medium leading-relaxed px-4 text-white">
                  {currentCard.answer}
                </p>
                <div className="absolute bottom-6 text-white/70 text-xs">
                  {isRevisionMode ? "Rate your memory below" : "Click to flip back"}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Rating Buttons in Revision Mode */}
          {isRevisionMode ? (
            <div className="flex items-center gap-4 mt-6 w-full justify-center">
              <button
                onClick={() => handleRateCard('learning')}
                className="flex-1 max-w-[180px] py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <HelpCircle size={15} />
                <span>Still Learning (1)</span>
              </button>
              <button
                onClick={() => handleRateCard('mastered')}
                className="flex-1 max-w-[180px] py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <CheckCircle size={15} />
                <span>I Knew This (2)</span>
              </button>
            </div>
          ) : (
            /* Navigation Controls in Standard Mode */
            <div className="flex items-center gap-6 mt-8">
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrev() }}
                className="p-3 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors shadow-sm"
                title="Previous card (Left Arrow)"
              >
                <ChevronLeft size={22} />
              </button>
              <div className="text-xs text-muted-foreground">Use left / right arrow keys to browse</div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleNext() }}
                className="p-3 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors shadow-sm"
                title="Next card (Right Arrow)"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          )}
        </>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  )
}
