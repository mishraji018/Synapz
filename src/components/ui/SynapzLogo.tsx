import { clsx } from 'clsx'

interface SynapzLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  subtitle?: string
  className?: string
}

export function SynapzLogo({
  size = 'md',
  showText = true,
  subtitle = 'AI Knowledge Studio',
  className,
}: SynapzLogoProps) {
  const iconDimensions = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl',
  }[size]

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size]

  return (
    <div className={clsx('flex items-center gap-3 select-none', className)}>
      {/* 2-Second Timelapse Animated Synapz Icon */}
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Glowing 3D Glassmorphic Icon */}
        <div
          className={clsx(
            'relative overflow-hidden flex items-center justify-center p-0.5 bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 shadow-md shadow-purple-500/25 animate-synapz-glow transition-transform duration-300 hover:scale-105',
            iconDimensions
          )}
          title="Synapz AI"
        >
          <img
            src="/synapz-icon.png"
            alt="Synapz Icon"
            className="w-full h-full object-cover rounded-[10px]"
          />
        </div>

        {/* 2-Second Concentric Timelapse Pulse Aura */}
        <div
          className={clsx(
            'absolute inset-0 bg-purple-500/40 animate-ping pointer-events-none -z-10',
            iconDimensions
          )}
          style={{ animationDuration: '2s' }}
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'font-extrabold tracking-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent leading-none',
                textSizes
              )}
            >
              Synapz
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-extrabold uppercase tracking-wider border border-purple-500/20">
              AI
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-bold mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
