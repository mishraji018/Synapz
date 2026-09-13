import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, ShieldAlert, Clock } from 'lucide-react'
import { SynapzLogo } from '@/components/ui/SynapzLogo'
import { logSecurityEvent } from '@/lib/logger'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutSeconds && lockoutSeconds > 0) return

    setError('')
    setLoading(true)
    const sanitizedEmail = email.trim().toLowerCase()

    try {
      // 1. Server-side Rate Limit / Brute-Force Check via Supabase RPC
      try {
        const { data: limitCheck } = await supabase.rpc('check_login_rate_limit', {
          p_email: sanitizedEmail
        })

        if (limitCheck && limitCheck.locked) {
          setLockoutSeconds(limitCheck.retry_after_seconds || 900)
          setError(limitCheck.message || 'Too many failed login attempts. Please wait 15 minutes before trying again.')
          setLoading(false)
          logSecurityEvent({
            type: 'AUTH_LOCKOUT_TRIGGERED',
            details: { email: sanitizedEmail, retry_after: limitCheck.retry_after_seconds }
          })
          return
        }
      } catch {
        // Fallback gracefully if RPC is not yet created
      }

      // 2. Perform Supabase Authentication
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      })

      if (authError) {
        logSecurityEvent({
          type: 'AUTH_LOGIN_FAILED',
          details: { email: sanitizedEmail, error: authError.message }
        })

        // Record failed attempt in DB
        try {
          await supabase.rpc('record_login_attempt', {
            p_email: sanitizedEmail,
            p_success: false
          })
          // Re-check rate limit status
          const { data: checkAfter } = await supabase.rpc('check_login_rate_limit', {
            p_email: sanitizedEmail
          })
          if (checkAfter?.locked) {
            setLockoutSeconds(checkAfter.retry_after_seconds || 900)
            setError(checkAfter.message || 'Account temporarily locked due to repeated failed attempts.')
            logSecurityEvent({
              type: 'AUTH_LOCKOUT_TRIGGERED',
              details: { email: sanitizedEmail, retry_after: checkAfter.retry_after_seconds }
            })
          } else if (checkAfter?.failed_attempts) {
            const left = Math.max(0, 5 - checkAfter.failed_attempts)
            setError(`Invalid email or password. ${left} attempt${left === 1 ? '' : 's'} remaining before temporary 15-min lockout.`)
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

        // Record successful login
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
      <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <SynapzLogo size="lg" subtitle="Sign in to your AI workspace" className="justify-center mb-2" />
        </div>

        {isLocked && (
          <div className="bg-destructive/15 text-destructive text-sm p-3.5 rounded-lg mb-4 font-medium border border-destructive/30 flex items-start gap-2.5">
            <Clock className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-semibold">Account Temporarily Locked</p>
              <p className="text-xs mt-0.5 opacity-90">
                Too many failed attempts. Try again in <span className="font-bold underline">{formatTime(lockoutSeconds)}</span>
              </p>
            </div>
          </div>
        )}

        {!isLocked && error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4 font-medium border border-destructive/20 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" 
              className="w-full px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
              required
              disabled={isLocked}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
              required
              disabled={isLocked}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="rounded border-border text-primary focus:ring-ring" disabled={isLocked} />
              Remember me
            </label>
            <a href="#" className="text-sm text-primary hover:underline">Forgot password?</a>
          </div>
          
          <button 
            type="submit" 
            disabled={loading || isLocked}
            className="w-full bg-primary text-primary-foreground font-medium py-2 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

