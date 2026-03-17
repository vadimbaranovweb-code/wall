import { useState, useEffect } from 'react'

interface Props {
  viewportRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Shows a full-board overlay with dashed border when the user
 * drags files over the board viewport.
 */
export function DropZoneOverlay({ viewportRef }: Props) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return

    // Use a counter so nested dragenter/dragleave don't flicker
    let depth = 0

    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.some(t => t === 'Files' || t === 'text/uri-list')) return
      depth++
      setActive(true)
    }
    const onLeave = () => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setActive(false)
    }
    const onDrop  = () => { depth = 0; setActive(false) }

    vp.addEventListener('dragenter', onEnter)
    vp.addEventListener('dragleave', onLeave)
    vp.addEventListener('drop',      onDrop)

    return () => {
      vp.removeEventListener('dragenter', onEnter)
      vp.removeEventListener('dragleave', onLeave)
      vp.removeEventListener('drop',      onDrop)
    }
  }, [viewportRef])

  if (!active) return null

  return (
    <div className="absolute inset-0 z-50 pointer-events-none
                    flex items-center justify-center">
      {/* Dimmed overlay */}
      <div className="absolute inset-0 bg-card/60" />

      {/* Drop target box */}
      <div className="relative flex flex-col items-center gap-3
                      border-2 border-dashed border-ink-30 rounded-2xl
                      px-12 py-10 bg-card/80 animate-pop-in">
        {/* Arrow-down icon */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
             className="text-ink-30">
          <path d="M16 4V22M8 14L16 22L24 14"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 28H28" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round"/>
        </svg>
        <p className="text-sm font-medium text-ink-60">
          Отпустите, чтобы добавить на стену
        </p>
        <p className="text-xs text-ink-30">
          Изображения, ссылки, текст
        </p>
      </div>
    </div>
  )
}
