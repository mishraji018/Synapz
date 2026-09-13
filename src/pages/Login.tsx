import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, ShieldAlert, Clock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { SynapzLogo } from '@/components/ui/SynapzLogo'
import { CaptchaChallenge } from '@/components/ui/CaptchaChallenge'
import { logSecurityEvent } from '@/lib/logger'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaPassed, setCaptchaPassed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null)
  const navigate = useNavigate()

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds])

  // Password Login Handler (Protected by Visual CAPTCHA + Rate Limiting)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutSeconds && lockoutSeconds > 0) return

    if (!captchaPassed) {
      setError('Please solve the security CAPTCHA verification before signing in.')
      return
    }

    setError('')
    setSuccessMsg('')
    setLoading(true)
    const sanitizedEmail = email.trim().toLowerCase()

    try {
      // 1. Check server-side brute-force lockout status
      try {
        const { data: limitCheck } = await supabase.rpc('check_login_rate_limit', {
          p_email: sanitizedEmail
        })

        if (limitCheck && limitCheck.locked) {
          setLockoutSeconds(limitCheck.retry_after_seconds || 900)
          setError(limitCheck.message || 'Too many failed login attempts. Please wait 15 minutes.')
          setLoading(false)
          logSecurityEvent({
            type: 'AUTH_LOCKOUT_TRIGGERED',
            details: { email: sanitizedEmail, retry_after: limitCheck.retry_after_seconds }
          })
          return
        }
      } catch {
        // Fallback if RPC is not deployed yet
      }

      // 2. Perform Supabase authentication
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      })

      if (authError) {
        logSecurityEvent({
          type: 'AUTH_LOGIN_FAILED',
          details: { email: sanitizedEmail, error: authError.message }
        })

        try {
          await supabase.rpc('record_login_attempt', {
            p_email: sanitizedEmail,
            p_success: false
          })
          const { data: checkAfter } = await supabase.rpc('check_login_rate_limit', {
            p_email: sanitizedEmail
          })
          if (checkAfter?.locked) {
            setLockoutSeconds(checkAfter.retry_after_seconds || 900)
            setError(checkAfter.message || 'Account temporarily locked due to repeated failed attempts.')
          } else if (checkAfter?.failed_attempts) {
            const left = Math.max(0, 5 - checkAfter.failed_attempts)
            setError(`Invalid credentials. ${left} attempt${left === 1 ? '' : 's'} remaining before 15-min lockout.`)
          } else {
            setError(authError.message)
          }
        } catch {
          setError(authError.message)
        }
        setLoading(false)
      } else {
        logSecurityEvent({
          type: 'AUTH_LOGIN_SUCCESS',
          details: { email: sanitizedEmail }
        })
        try {
          await supabase.rpc('record_login_attempt', {
            p_email: sanitizedEmail,
            p_success: true
          })
        } catch {
          // ignore
        }
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`
  }

  const isLocked = lockoutSeconds !== null && lockoutSeconds > 0

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <SynapzLogo size="lg" subtitle="Secure AI Authentication Portal" className="justify-center mb-2" />
        </div>

        {isLocked && (
          <div className="bg-destructive/15 text-destructive text-sm p-3.5 rounded-xl mb-4 font-medium border border-destructive/30 flex items-start gap-2.5">
            <Clock className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-semibold">Account Temporarily Locked</p>
              <p className="text-xs mt-0.5 opacity-90">
                Too many failed attempts. Try again in <span className="font-bold underline">{formatTime(lockoutSeconds)}</span>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl mb-4 font-medium border border-destructive/20 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs p-3 rounded-xl mb-4 font-medium border border-emerald-500/20 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Unified Email + Password + Visual CAPTCHA Form */}
        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" 
              className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-background focus:ring-2 focus:ring-ring outline-none text-sm transition-all"
              required
              disabled={isLocked}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">Password</label>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full px-3.5 py-2.5 pr-10 border border-border rounded-xl bg-background focus:ring-2 focus:ring-ring outline-none text-sm transition-all"
                required
                disabled={isLocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Anti-Bot Visual CAPTCHA (2 Letters + 2 Digits + 1 Letter + 1 Digit) */}
          <CaptchaChallenge onValidate={setCaptchaPassed} />

          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" className="rounded border-border text-primary focus:ring-ring" disabled={isLocked} />
              <span>Remember me</span>
            </label>
            <a href="#" className="text-primary hover:underline font-medium">Forgot password?</a>
          </div>

          <button 
            type="submit" 
            disabled={loading || isLocked || !captchaPassed || !email.trim() || !password}
            className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold py-2.5 rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm mt-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {isLocked ? `Locked (${formatTime(lockoutSeconds)})` : (loading ? 'Signing In...' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account? <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
        </div>
      </div>
    </div>
  )
}
