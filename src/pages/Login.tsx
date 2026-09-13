import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, ShieldAlert, Clock, Mail, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { SynapzLogo } from '@/components/ui/SynapzLogo'
import { logSecurityEvent } from '@/lib/logger'

export function Login() {
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('otp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
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

  // Countdown for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // 1. Password Login Handler
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutSeconds && lockoutSeconds > 0) return

    setError('')
    setSuccessMsg('')
    setLoading(true)
    const sanitizedEmail = email.trim().toLowerCase()

    try {
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

  // 2. Send OTP to Email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim() || resendCooldown > 0) return

    setError('')
    setSuccessMsg('')
    setLoading(true)
    const sanitizedEmail = email.trim().toLowerCase()

    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: sanitizedEmail,
        options: {
          shouldCreateUser: true,
        }
      })

      if (otpErr) {
        setError(otpErr.message)
        setLoading(false)
      } else {
        setOtpSent(true)
        setResendCooldown(60) // 60-second cooldown
        setSuccessMsg(`A 6-digit verification code has been sent to ${sanitizedEmail}`)
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP code.')
      setLoading(false)
    }
  }

  // 3. Verify 6-digit OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim() || !email.trim()) return

    setError('')
    setSuccessMsg('')
    setLoading(true)
    const sanitizedEmail = email.trim().toLowerCase()
    const sanitizedToken = otpCode.trim()

    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: sanitizedEmail,
        token: sanitizedToken,
        type: 'email',
      })

      if (verifyErr) {
        setError(verifyErr.message || 'Invalid or expired OTP code.')
        setLoading(false)
      } else {
        logSecurityEvent({
          type: 'AUTH_LOGIN_SUCCESS',
          details: { email: sanitizedEmail, method: 'email_otp' }
        })
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP code.')
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
        <div className="flex flex-col items-center text-center mb-6">
          <SynapzLogo size="lg" subtitle="Sign in to your AI workspace" className="justify-center mb-2" />
        </div>

        {/* Tab Switcher: OTP vs Password */}
        <div className="grid grid-cols-2 p-1 bg-secondary/60 rounded-xl mb-6 border border-border/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMode('otp'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              authMode === 'otp'
                ? 'bg-background text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail size={14} className="text-primary" />
            <span>Email OTP (Fast)</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('password'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              authMode === 'password'
                ? 'bg-background text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <KeyRound size={14} className="text-indigo-500" />
            <span>Password</span>
          </button>
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

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4 font-medium border border-destructive/20 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs p-3 rounded-md mb-4 font-medium border border-emerald-500/20 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MODE 1: EMAIL OTP */}
        {authMode === 'otp' && (
          <div>
            {!otpSent ? (
              <form className="space-y-4" onSubmit={handleSendOtp}>
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" 
                    className="w-full px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    We'll email you a secure 6-digit login code. No password needed!
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !email.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-medium py-2 rounded-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleVerifyOtp}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium">Enter 6-Digit Code</label>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtpCode(''); setError(''); setSuccessMsg(''); }}
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <ArrowLeft size={12} /> Change Email
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="123456" 
                    maxLength={6}
                    className="w-full px-3 py-2.5 text-center tracking-widest text-lg font-mono font-bold border border-border rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
                    required
                    autoFocus
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading || otpCode.length < 6}
                  className="w-full bg-primary text-primary-foreground font-medium py-2 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading || resendCooldown > 0}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive code? Resend OTP"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* MODE 2: PASSWORD LOGIN */}
        {authMode === 'password' && (
          <form className="space-y-4" onSubmit={handlePasswordLogin}>
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
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account? <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
        </div>
      </div>
    </div>
  )
}


