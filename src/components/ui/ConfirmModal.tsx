import { AlertTriangle, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  isLoading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isLoading) onClose()
      }}
    >
      <div 
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <div className="flex items-start gap-4">
          <div className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            variant === 'danger' && "bg-destructive/15 text-destructive",
            variant === 'warning' && "bg-amber-500/15 text-amber-500",
            variant === 'primary' && "bg-primary/15 text-primary"
          )}>
            <AlertTriangle size={24} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border/50">
          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onConfirm()
            }}
            className={clsx(
              "px-5 py-2 text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-50",
              variant === 'danger' && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              variant === 'warning' && "bg-amber-600 text-white hover:bg-amber-700",
              variant === 'primary' && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
