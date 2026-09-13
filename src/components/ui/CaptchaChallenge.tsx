import { useState, useEffect, useRef } from 'react'
import { RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react'
import { generateCustomAuthCode } from '@/lib/customAuthCode'

interface CaptchaProps {
  onValidate: (isValid: boolean) => void;
  className?: string;
}

export function CaptchaChallenge({ onValidate, className = '' }: CaptchaProps) {
  const [captchaText, setCaptchaText] = useState('')
  const [userInput, setUserInput] = useState('')
  const [isValidated, setIsValidated] = useState<boolean | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Generate 6-character captcha with format: 2 Letters + 2 Digits + 1 Letter + 1 Digit (e.g. BT46K6)
  const generateCaptchaText = () => {
    return generateCustomAuthCode()
  }

  // Draw noisy, distorted text onto Canvas
  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#1e1b4b')
    gradient.addColorStop(1, '#311042')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Draw random noise lines
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, 255, 0.35)`
      ctx.lineWidth = 1 + Math.random() * 1.5
      ctx.beginPath()
      ctx.moveTo(Math.random() * width, Math.random() * height)
      ctx.bezierCurveTo(
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height
      )
      ctx.stroke()
    }

    // Draw random noise dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.4})`
      ctx.beginPath()
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw each letter with randomized rotation and position
    const charWidth = (width - 24) / text.length
    ctx.textBaseline = 'middle'

    const colors = ['#818cf8', '#a855f7', '#ec4899', '#38bdf8', '#34d399', '#fbbf24']

    for (let i = 0; i < text.length; i++) {
      ctx.save()
      const char = text[i]
      const x = 16 + i * charWidth + (Math.random() * 4 - 2)
      const y = height / 2 + (Math.random() * 6 - 3)
      const angle = (Math.random() * 30 - 15) * (Math.PI / 180)

      ctx.translate(x, y)
      ctx.rotate(angle)
      ctx.font = `bold ${20 + Math.random() * 4}px monospace`
      ctx.fillStyle = colors[i % colors.length]
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 4
      ctx.fillText(char, 0, 0)
      ctx.restore()
    }
  }

  const refreshCaptcha = () => {
    const newText = generateCaptchaText()
    setCaptchaText(newText)
    setUserInput('')
    setIsValidated(null)
    onValidate(false)
    drawCaptcha(newText)
  }

  useEffect(() => {
    const text = generateCaptchaText()
    setCaptchaText(text)
    drawCaptcha(text)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().slice(0, 6)
    setUserInput(val)

    if (val.length === 6) {
      if (val === captchaText) {
        setIsValidated(true)
        onValidate(true)
      } else {
        setIsValidated(false)
        onValidate(false)
      }
    } else {
      setIsValidated(null)
      onValidate(false)
    }
  }

  return (
    <div className={`space-y-2 p-3 bg-secondary/40 rounded-xl border border-border/70 ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-primary" />
          Security CAPTCHA Verification
        </span>
        <button
          type="button"
          onClick={refreshCaptcha}
          className="text-xs text-primary hover:underline flex items-center gap-1 hover:opacity-80 transition-opacity"
          title="Regenerate CAPTCHA"
        >
          <RefreshCw size={12} className="animate-hover:rotate-180" />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Canvas displaying distorted visual text */}
        <div className="relative rounded-lg overflow-hidden border border-border/80 shadow-inner bg-black/40">
          <canvas
            ref={canvasRef}
            width={160}
            height={44}
            className="block select-none cursor-pointer"
            onClick={refreshCaptcha}
            title="Click to refresh CAPTCHA"
          />
        </div>

        {/* Input box */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={userInput}
            onChange={handleInputChange}
            placeholder="Type CAPTCHA"
            maxLength={6}
            className={`w-full px-3 py-2 text-sm font-mono tracking-wider font-bold rounded-lg border bg-background outline-none transition-all ${
              isValidated === true
                ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                : isValidated === false
                ? 'border-destructive focus:ring-2 focus:ring-destructive/20'
                : 'border-border focus:ring-2 focus:ring-ring'
            }`}
          />
          {isValidated === true && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-bold">✓</span>
          )}
        </div>
      </div>

      {isValidated === false && (
        <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
          <AlertCircle size={12} /> Incorrect CAPTCHA code. Please check and try again.
        </p>
      )}
      {isValidated === true && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ CAPTCHA verified successfully.
        </p>
      )}
    </div>
  )
}
