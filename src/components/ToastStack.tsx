import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/lib/cn'

export function ToastStack() {
  const toasts  = useToastStore(s => s.toasts)
  const dismiss = useToastStore(s => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100]
                    flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl',
            'text-sm font-medium shadow-card-hover animate-pop-in',
            'pointer-events-auto cursor-pointer select-none',
            t.type === 'success' && 'bg-ink text-card',
            t.type === 'error'   && 'bg-red-500 text-white',
            t.type === 'info'    && 'bg-card border border-ink-10 text-ink',
          )}
          onClick={() => dismiss(t.id)}
        >
          {t.type === 'success' && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {t.type === 'error' && <span className="text-base leading-none">!</span>}
          {t.message}
        </div>
      ))}
    </div>
  )
}
