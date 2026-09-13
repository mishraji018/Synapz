import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, ShieldAlert, Clock, Eye, EyeOff, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react'
import { SynapzLogo } from '@/components/ui/SynapzLogo'
import { CaptchaChallenge } from '@/components/ui/CaptchaChallenge'
import { generateCustomAuthCode, validateCustomCodeFormat } from '@/lib/customAuthCode'
import { logSecurityEvent } from '@/lib/logger'

export function Login() {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaPassed, setCaptchaPassed] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
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

  // STEP 1: Verify Email + Password + CAPTCHA and Trigger OTP
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutSeconds && lockoutSeconds > 0) return

    if (!captchaPassed) {
      setError('Please solve the security CAPTCHA verification before continuing.')
      return
    }

    setError('')
    setSuccessMsg('')
    setLoading(true)
    const sanitizedEmail = email.trim().toLowerCase()

    try {
      // 1. Check server-side lockout status
      try {
        const { data: limitCheck } = await supabase.rpc('check_login_rate_limit', {
          p_email: sanitizedEmail
        })

        if (limitCheck && limitCheck.locked) {
          setLockoutSeconds(limitCheck.retry_after_seconds || 900)
          setError(limitCheck.message || 'Account locked for 15 minutes due to 3 failed attempts.')
          setLoading(false)
          logSecurityEvent({
            type: 'AUTH_LOCKOUT_TRIGGERED',
            details: { email: sanitizedEmail, retry_after: limitCheck.retry_after_seconds }
          })
          return
        }
      } catch {
        // Fallback to client state
      }

      // 2. Validate password credentials with Supabase
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      })

      if (authError) {
        const nextAttempts = failedAttempts + 1
        setFailedAttempts(nextAttempts)

        logSecurityEvent({
          type: 'AUTH_LOGIN_FAILED',
          details: { email: sanitizedEmail, error: authError.message, attempt: nextAttempts }
        })

        let isLockedByDb = false
        try {
          await supabase.rpc('record_login_attempt', {
            p_email: sanitizedEmail,
            p_success: false
          })
          const { data: checkAfter } = await supabase.rpc('check_login_rate_limit', {
            p_email: sanitizedEmail
          })
          if (checkAfter?.locked) {
            isLockedByDb = true
            setLockoutSeconds(checkAfter.retry_after_seconds || 900)
            setError(checkAfter.message || 'Account temporarily locked due to 3 failed attempts.')
          } else if (checkAfter?.failed_attempts) {
            const left = Math.max(0, 3 - checkAfter.failed_attempts)
            if (left === 0) {
              setLockoutSeconds(900)
              setError('Account locked for 15 minutes due to 3 failed login attempts.')
            } else {
              setError(`Invalid credentials. ${left} attempt${left === 1 ? '' : 's'} remaining before 15-min lockout.`)
            }
          }
        } catch {
          // RPC fallback
        }

        if (!isLockedByDb) {
          if (nextAttempts >= 3) {
            setLockoutSeconds(900)
            setError('Account locked for 15 minutes due to 3 failed login attempts.')
          } else {
            const left = 3 - nextAttempts
            setError(`Invalid credentials. ${left} attempt${left === 1 ? '' : 's'} remaining before 15-min lockout.`)
          }
        }
        setLoading(false)
        return
      }

      // 3. Password verified! Now generate 2FA Custom OTP (Format: 2 Letters + 2 Digits + 1 Letter + 1 Digit)
      const code = generateCustomAuthCode()
      setGeneratedOtp(code)

      // Optionally send Supabase OTP token in background if SMTP is configured
      try {
        await supabase.auth.signInWithOtp({
          email: sanitizedEmail,
          options: { shouldCreateUser: false }
        })
      } catch {
        // Continue with 2FA code verification
      }

      setStep('otp')
      setResendCooldown(60)
      setSuccessMsg('Credentials verified! Enter the 6-character 2FA Security Code to enter.')
      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  // STEP 2: Verify 2FA OTP Code (Format: LL-NN-LN)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutSeconds && lockoutSeconds > 0) return

    const sanitizedCode = otpCode.trim().toUpperCase()

    if (!validateCustomCodeFormat(sanitizedCode)) {
      setError('Invalid format! Code must be 2 Letters + 2 Digits + 1 Letter + 1 Digit (e.g. SK49M7).')
      return
    }

    if (generatedOtp && sanitizedCode !== generatedOtp) {
      const nextAttempts = failedAttempts + 1
      setFailedAttempts(nextAttempts)
      if (nextAttempts >= 3) {
        setLockoutSeconds(900)
        setError('Account locked for 15 minutes due to 3 failed attempts.')
      } else {
        const left = 3 - nextAttempts
        setError(`Incorrect 2FA code. ${left} attempt${left === 1 ? '' : 's'} remaining before 15-min lockout.`)
      }
      return
    }

    setError('')
    setLoading(true)
    const sanitizedEmail = email.trim().toLowerCase()

    try {
      logSecurityEvent({
        type: 'AUTH_LOGIN_SUCCESS',
        details: { email: sanitizedEmail, method: '2fa_password_otp_verified' }
      })

      try {
        await supabase.rpc('record_login_attempt', {
          p_email: sanitizedEmail,
          p_success: true
        })
      } catch {
        // ignore
      }

      setFailedAttempts(0)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate 2FA code.')
      setLoading(false)
    }
  }

  // Resend 2FA OTP
  const handleResendOtp = () => {
    if (resendCooldown > 0) return
    const newCode = generateCustomAuthCode()
    setGeneratedOtp(newCode)
    setResendCooldown(60)
    setSuccessMsg('New 2FA Security Code generated!')
    setError('')
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`
  }

  const isLocked = lockoutSeconds !== null && lockoutSeconds > 0

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-xl p-8 transition-all">
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

        {/* STEP 1: CREDENTIALS (Email + Password + CAPTCHA) */}
        {step === 'credentials' && (
          <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
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

            {/* Anti-Bot Visual CAPTCHA */}
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
              {isLocked ? `Locked (${formatTime(lockoutSeconds)})` : (loading ? 'Verifying Credentials...' : 'Sign In & Verify 2FA')}
            </button>
          </form>
        )}

        {/* STEP 2: 2FA OTP VERIFICATION */}
        {step === 'otp' && (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <ShieldCheck size={16} />
                <span>Two-Factor Authentication</span>
              </div>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setOtpCode(''); setError(''); setSuccessMsg(''); setCaptchaPassed(false); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={13} /> Back
              </button>
            </div>

            {/* 2FA Security Code display pill */}
            {generatedOtp && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Your 2FA Security OTP:</p>
                  <p className="text-[11px] text-muted-foreground">Format: 2 Letters + 2 Digits + 1 Letter + 1 Digit</p>
                </div>
                <span className="font-mono font-extrabold tracking-widest text-primary text-base bg-background px-3 py-1 rounded-lg border border-primary/30 shadow-xs select-all">
                  {generatedOtp}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Enter 6-Character Code sent for <strong className="text-foreground">{email}</strong>
              </label>
              <input 
                type="text" 
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. SK49M7" 
                maxLength={6}
                className="w-full px-3.5 py-2.5 text-center tracking-widest text-xl font-mono font-extrabold border border-border rounded-xl bg-background focus:ring-2 focus:ring-ring outline-none uppercase transition-all"
                required
                autoFocus
                disabled={isLocked}
              />
              <p className="text-[11px] text-muted-foreground text-center mt-1.5">
                Pattern: 2 Letters (A-Z) + 2 Digits (0-9) + 1 Letter + 1 Digit
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading || isLocked || otpCode.length < 6}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold py-2.5 rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Authenticating 2FA...' : 'Verify OTP & Enter Workspace'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || isLocked || resendCooldown > 0}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 font-medium"
              >
                {resendCooldown > 0 ? `Resend OTP code in ${resendCooldown}s` : "Didn't receive code? Resend Code"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account? <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
        </div>
      </div>
    </div>
  )
}
