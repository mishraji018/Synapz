import { Note } from '@/lib/types'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'

interface FlashcardDeckProps {
  cards: Note['flashcards']
}

export function FlashcardDeck({ cards }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const handleNext = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length)
    }, 150)
  }

  const handlePrev = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)
    }, 150)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsFlipped(f => !f)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cards.length])

  if (!cards.length) return null

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-8">
      <div className="text-sm font-medium text-muted-foreground mb-4">
        Card {currentIndex + 1} of {cards.length}
      </div>

      <div 
        className="w-full h-80 perspective-1000 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={clsx(
          "w-full h-full relative preserve-3d transition-transform duration-500",
          isFlipped && "rotate-y-180"
        )}>
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-card border-2 border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg hover:border-primary/30 hover:scale-[1.02] transition-all duration-300">
            <span className="text-primary font-semibold tracking-wider uppercase text-xs absolute top-6 left-6">Question</span>
            <h3 className="text-2xl font-medium">{cards[currentIndex].question}</h3>
            <div className="absolute bottom-6 flex items-center gap-2 text-muted-foreground text-sm">
              <RotateCcw size={14} />
              <span>Click to flip</span>
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary text-primary-foreground rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-md">
            <span className="text-primary-foreground/70 font-semibold tracking-wider uppercase text-xs absolute top-6 left-6">Answer</span>
            <p className="text-xl font-medium">{cards[currentIndex].answer}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-8">
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrev() }}
          className="p-3 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-sm text-muted-foreground">Use arrow keys to navigate</div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleNext() }}
          className="p-3 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  )
}
