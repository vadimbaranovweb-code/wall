import { useEffect, useState } from 'react'
import { useCardsStore } from '@/stores/cardsStore'

/**
 * Shows a subtle "Сохранено" indicator that appears briefly after
 * any card update, then fades out.
 */
export function AutosaveIndicator() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout>
    let hideTimer: ReturnType<typeof setTimeout>

    const unsub = useCardsStore.subscribe((state, prev) => {
      // Detect any card content/position change
      const changed = state.cards.some((card, i) => {
        const p = prev.cards[i]
        return !p || p.updatedAt !== card.updatedAt ||
               p.x !== card.x || p.y !== card.y ||
               p.width !== card.width || p.height !== card.height
      })

      if (!changed) return

      setStatus('saving')
      clearTimeout(saveTimer)
      clearTimeout(hideTimer)

      // Show "saved" after 1.2s (matches debounce timings)
      saveTimer = setTimeout(() => {
        setStatus('saved')
        hideTimer = setTimeout(() => setStatus('idle'), 2000)
      }, 1200)
    })

    return () => {
      unsub()
      clearTimeout(saveTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (status === 'idle') return null

  return (
    <div
      className="pointer-events-none flex items-center gap-1.5
                 px-2.5 py-1.5 rounded-lg
                 bg-card/90 border border-ink-10
                 text-xs text-ink-30 font-mono
                 transition-opacity duration-300"
      style={{ opacity: status === 'saved' ? 0.7 : 1 }}
    >
      {status === 'saving' ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          сохранение…
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          сохранено
        </>
      )}
    </div>
  )
}
