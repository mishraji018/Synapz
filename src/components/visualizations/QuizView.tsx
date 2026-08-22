import { useState } from 'react'
import { Quiz, QuizQuestion } from '@/lib/types'
import { api } from '@/lib/api'
import { Sparkles, CheckCircle2, XCircle, ArrowRight, RotateCcw, Award, Loader2, BookOpen } from 'lucide-react'
import { clsx } from 'clsx'

interface QuizViewProps {
  noteId: string
  noteTitle: string
  noteContent: any
  quizzes?: Quiz[]
  onQuizUpdated: () => void
}

export function QuizView({
  noteId,
  noteTitle,
  noteContent,
  quizzes = [],
  onQuizUpdated
}: QuizViewProps) {
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(quizzes[0] || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  
  // Quiz taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({})
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [isSavingAttempt, setIsSavingAttempt] = useState(false)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

  const handleGenerateQuiz = async () => {
    setIsGenerating(true)
    setError('')
    try {
      const newQuiz = await api.generateQuiz(noteId, noteTitle, noteContent, 5, difficulty)
      setActiveQuiz(newQuiz)
      setCurrentQuestionIndex(0)
      setUserAnswers({})
      setSelectedOption(null)
      setIsAnswerSubmitted(false)
      setQuizFinished(false)
      onQuizUpdated()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to generate quiz')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return
    setSelectedOption(index)
  }

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !activeQuiz) return
    const currentQ = activeQuiz.questions[currentQuestionIndex]
    const updatedAnswers = { ...userAnswers, [currentQ.id]: selectedOption }
    setUserAnswers(updatedAnswers)
    setIsAnswerSubmitted(true)
  }

  const handleNextQuestion = async () => {
    if (!activeQuiz) return

    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedOption(null)
      setIsAnswerSubmitted(false)
    } else {
      // Finish quiz & calculate score
      let correctCount = 0
      activeQuiz.questions.forEach(q => {
        if (userAnswers[q.id] === q.correct_index) {
          correctCount++
        }
      })

      setIsSavingAttempt(true)
      try {
        await api.saveQuizAttempt(noteId, activeQuiz.id, {
          score: correctCount,
          total_questions: activeQuiz.questions.length,
          user_answers: userAnswers
        })
        onQuizUpdated()
      } catch (err) {
        console.error("Failed to save attempt:", err)
      } finally {
        setIsSavingAttempt(false)
        setQuizFinished(true)
      }
    }
  }

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0)
    setUserAnswers({})
    setSelectedOption(null)
    setIsAnswerSubmitted(false)
    setQuizFinished(false)
  }

  // If no quizzes exist yet
  if (!activeQuiz) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
          <BookOpen size={32} />
        </div>
        <div>
          <h3 className="text-2xl font-bold mb-2">Test Your Knowledge</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Generate an interactive, AI-powered multiple choice quiz specifically crafted from this document.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Difficulty:</span>
          {(['easy', 'medium', 'hard'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all",
                difficulty === d 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {d}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-destructive text-xs bg-destructive/10 p-3 rounded-lg border border-destructive/20 max-w-md mx-auto">
            {error}
          </p>
        )}

        <button
          onClick={handleGenerateQuiz}
          disabled={isGenerating}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Generating 5 Questions...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Generate Practice Quiz</span>
            </>
          )}
        </button>
      </div>
    )
  }

  // Quiz Finished Scorecard Screen
  if (quizFinished) {
    const total = activeQuiz.questions.length
    let correctCount = 0
    activeQuiz.questions.forEach(q => {
      if (userAnswers[q.id] === q.correct_index) correctCount++
    })
    const scorePercent = Math.round((correctCount / total) * 100)
    const isPassed = scorePercent >= 70

    return (
      <div className="max-w-2xl mx-auto py-8 bg-card border border-border rounded-2xl p-8 shadow-md space-y-8 animate-in zoom-in-95">
        <div className="text-center space-y-3">
          <div className={clsx(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-md",
            isPassed ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          )}>
            <Award size={44} />
          </div>
          <h3 className="text-2xl font-bold">{isPassed ? "Excellent Mastery!" : "Keep Practicing!"}</h3>
          <p className="text-muted-foreground text-sm">
            You scored <strong className="text-foreground">{correctCount}</strong> out of <strong className="text-foreground">{total}</strong> ({scorePercent}%)
          </p>
        </div>

        {/* Detailed Question Review Breakdown */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Answer Breakdown</h4>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {activeQuiz.questions.map((q, idx) => {
              const userAns = userAnswers[q.id]
              const isCorrect = userAns === q.correct_index
              return (
                <div key={q.id} className={clsx(
                  "p-4 rounded-xl border text-xs leading-relaxed space-y-2",
                  isCorrect ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-foreground">Q{idx + 1}: {q.question}</span>
                    {isCorrect ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                        <CheckCircle2 size={14} /> Correct
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-destructive font-bold shrink-0">
                        <XCircle size={14} /> Incorrect
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground space-y-1">
                    <p>Your answer: <strong className="text-foreground">{q.options[userAns]}</strong></p>
                    {!isCorrect && (
                      <p>Correct answer: <strong className="text-emerald-600 dark:text-emerald-400">{q.options[q.correct_index]}</strong></p>
                    )}
                  </div>
                  <p className="text-muted-foreground/90 italic bg-background/50 p-2 rounded">
                    💡 {q.explanation}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
          <button
            onClick={handleGenerateQuiz}
            disabled={isGenerating}
            className="w-full sm:w-auto text-xs text-primary hover:underline flex items-center justify-center gap-1.5 font-medium"
          >
            <Sparkles size={14} />
            <span>Generate New Version</span>
          </button>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleRetakeQuiz}
              className="flex-1 sm:flex-none px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>Retake</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active Question In-Progress Screen
  const currentQ: QuizQuestion = activeQuiz.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === activeQuiz.questions.length - 1

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4 shadow-sm">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            {activeQuiz.title}
          </span>
          <h4 className="text-sm font-semibold text-muted-foreground">
            Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
          </h4>
        </div>

        <button
          onClick={handleGenerateQuiz}
          disabled={isGenerating}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          title="Generate fresh quiz questions"
        >
          <Sparkles size={13} />
          <span>New Quiz</span>
        </button>
      </div>

      {/* Question Card */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in">
        <h3 className="text-xl font-bold text-foreground leading-relaxed">
          {currentQ.question}
        </h3>

        {/* Options List */}
        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === idx
            const isCorrect = idx === currentQ.correct_index
            
            let optionStyle = "border-border hover:border-primary/40 hover:bg-secondary/30 text-foreground"
            if (isSelected && !isAnswerSubmitted) {
              optionStyle = "border-primary bg-primary/10 ring-2 ring-primary/20 font-medium"
            } else if (isAnswerSubmitted) {
              if (isCorrect) {
                optionStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
              } else if (isSelected && !isCorrect) {
                optionStyle = "border-destructive bg-destructive/10 text-destructive font-medium"
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                disabled={isAnswerSubmitted}
                className={clsx(
                  "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between text-sm leading-relaxed",
                  optionStyle
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0 opacity-80">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option}</span>
                </div>

                {isAnswerSubmitted && isCorrect && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
                {isAnswerSubmitted && isSelected && !isCorrect && <XCircle size={18} className="text-destructive shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Explanation Banner after submitting */}
        {isAnswerSubmitted && (
          <div className="bg-secondary/40 border border-border p-4 rounded-xl space-y-1.5 animate-in fade-in">
            <h5 className="text-xs font-bold uppercase tracking-wider text-primary">Explanation:</h5>
            <p className="text-xs text-muted-foreground leading-relaxed">{currentQ.explanation}</p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex justify-end pt-4 border-t border-border">
          {!isAnswerSubmitted ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              disabled={isSavingAttempt}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
            >
              {isSavingAttempt ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Saving Score...</span>
                </>
              ) : (
                <>
                  <span>{isLastQuestion ? "View Scorecard" : "Next Question"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
