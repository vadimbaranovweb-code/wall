/**
 * QuickAddButton — FAB + type-picker popup.
 * Voice flow lives here; image/link/paste flows are handled by useCapture.
 * Drag-and-drop is also in useCapture — no duplication here.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useBoardStore }     from '@/stores/boardStore'
import { useCardsStore }     from '@/stores/cardsStore'
import { useVoiceRecorder }  from '@/hooks/useVoiceRecorder'
import { useCapture }        from '@/hooks/useCapture'
import { resizeImageToDataUrl, looksLikeUrl, normaliseUrl } from '@/lib/imageUtils'
import { cn }                from '@/lib/cn'

interface Props {
  wallId:      string
  viewportRef: React.RefObject<HTMLDivElement | null>
}

type Mode = 'closed' | 'menu' | 'link' | 'voice'

export function QuickAddButton({ wallId, viewportRef }: Props) {
  const [mode,    setMode]    = useState<Mode>('closed')
  const [linkUrl, setLinkUrl] = useState('')
  const linkInputRef = useRef<HTMLInputElement>(null)

  const screenToCanvas = useBoardStore(s => s.screenToCanvas)
  const startEditing   = useBoardStore(s => s.startEditing)
  const createTextCard = useCardsStore(s => s.createTextCard)

  // Pull capture actions from central hook
  const { captureUrl, captureImageFile, captureVoice } = useCapture({ wallId, viewportRef })
  const voice = useVoiceRecorder()

  const close = useCallback(() => {
    setMode('closed')
    setLinkUrl('')
    if (voice.state === 'recording') voice.cancel()
  }, [voice])

  // ── Helpers ──────────────────────────────────────────────────────────────
  function centerPos(offW = 120, offH = 60) {
    const vp = viewportRef.current
    if (!vp) return { x: 100, y: 100 }
    const r  = vp.getBoundingClientRect()
    const jx = (Math.random() - 0.5) * 200
    const jy = (Math.random() - 0.5) * 120
    const p  = screenToCanvas(r.width / 2 + jx, r.height / 2 + jy)
    return { x: p.x - offW, y: p.y - offH }
  }

  // ── Text ─────────────────────────────────────────────────────────────────
  const addText = useCallback(() => {
    const pos  = centerPos(120, 60)
    const card = createTextCard(wallId, pos.x, pos.y)
    setTimeout(() => startEditing(card.id), 50)
    close()
  }, [wallId, createTextCard, startEditing, close]) // eslint-disable-line

  // ── Image (file picker) ───────────────────────────────────────────────────
  const pickImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async () => {
      const files = Array.from(input.files ?? [])
      for (const file of files) {
        await captureImageFile(file, file.name)
      }
    }
    input.click()
    close()
  }, [captureImageFile, close])

  // ── Link ─────────────────────────────────────────────────────────────────
  const openLinkMode = useCallback(async () => {
    setMode('link')
    try {
      const text = await navigator.clipboard.readText()
      if (looksLikeUrl(text)) setLinkUrl(text)
    } catch { /* clipboard blocked */ }
    setTimeout(() => linkInputRef.current?.focus(), 50)
  }, [])

  const submitLink = useCallback(() => {
    const url = linkUrl.trim()
    if (!url) return
    captureUrl(normaliseUrl(url))
    close()
  }, [linkUrl, captureUrl, close])

  // ── Voice ─────────────────────────────────────────────────────────────────
  const startVoice = useCallback(async () => {
    setMode('voice')
    await voice.start()
  }, [voice])

  const stopVoice = useCallback(async () => {
    const result = await voice.stop()
    if (result && result.durationSeconds >= 1) {
      captureVoice(result.audioDataUrl, result.durationSeconds, result.mimeType)
    }
    close()
  }, [voice, captureVoice, close])

  // ── Hotkey N ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); addText() }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [addText, close])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Dismiss overlay */}
      {mode !== 'closed' && (
        <div className="absolute inset-0 z-40" onClick={close} />
      )}

      {/* ── Type menu ───────────────────────────────────────────────── */}
      {mode === 'menu' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50
                        bg-card border border-ink-10 rounded-2xl shadow-card-hover
                        p-2 flex gap-1 animate-pop-in">
          <TypeBtn icon="📝" label="Текст"  hotkey="N" onClick={addText}      />
          <TypeBtn icon="🖼"  label="Фото"               onClick={pickImage}   />
          <TypeBtn icon="🔗" label="Ссылка"              onClick={openLinkMode}/>
          <TypeBtn icon="🎙" label="Голос"               onClick={startVoice} />
        </div>
      )}

      {/* ── Link input ──────────────────────────────────────────────── */}
      {mode === 'link' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50
                        bg-card border border-ink-10 rounded-2xl shadow-card-hover
                        p-3 w-80 animate-pop-in">
          <p className="text-xs font-medium text-ink-60 mb-2">Вставить ссылку</p>
          <input
            ref={linkInputRef}
            className="w-full px-3 py-2 rounded-lg border border-ink-10
                       bg-canvas text-ink text-sm placeholder:text-ink-30
                       focus:outline-none focus:border-ink-30 transition-colors"
            placeholder="https://…"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); submitLink() }
              if (e.key === 'Escape') close()
            }}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              className="px-3 py-1.5 rounded-lg text-xs text-ink-60
                         hover:text-ink hover:bg-ink-10 transition-colors"
              onClick={close}
            >
              Отмена
            </button>
            <button
              className="px-4 py-1.5 rounded-lg bg-ink text-card text-xs
                         font-medium hover:opacity-90 active:scale-95
                         transition-all disabled:opacity-40"
              disabled={!linkUrl.trim()}
              onClick={submitLink}
            >
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* ── Voice recording ─────────────────────────────────────────── */}
      {mode === 'voice' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50
                        bg-card border border-ink-10 rounded-2xl shadow-card-hover
                        p-4 flex flex-col items-center gap-3 animate-pop-in w-48">
          {voice.error ? (
            <p className="text-xs text-red-500 text-center">{voice.error}</p>
          ) : (
            <>
              <div className="relative">
                {voice.state === 'recording' && (
                  <div className="absolute inset-0 rounded-full bg-accent
                                  animate-ping opacity-25" />
                )}
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  voice.state === 'recording' ? 'bg-accent' : 'bg-ink-10',
                )}>
                  <MicIcon active={voice.state === 'recording'} />
                </div>
              </div>

              <span className="font-mono text-sm text-ink">
                {String(Math.floor(voice.durationSeconds / 60)).padStart(2, '0')}
                :{String(voice.durationSeconds % 60).padStart(2, '0')}
              </span>
              <p className="text-[10px] text-ink-30">
                {voice.state === 'recording' ? 'Запись...' : 'Обработка...'}
              </p>
            </>
          )}

          <div className="flex gap-2 w-full">
            <button
              className="flex-1 py-1.5 rounded-lg text-xs text-ink-60
                         border border-ink-10 hover:bg-ink-10 transition-colors"
              onClick={close}
            >
              Отмена
            </button>
            {voice.state === 'recording' && (
              <button
                className="flex-1 py-1.5 rounded-lg bg-ink text-card text-xs
                           font-medium hover:opacity-90 active:scale-95 transition-all"
                onClick={stopVoice}
              >
                Стоп
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <button
        className={cn(
          'absolute bottom-5 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-2 px-5 py-2.5 rounded-full',
          'bg-ink text-card font-medium text-sm',
          'shadow-card-hover hover:opacity-90 active:scale-95',
          'transition-all duration-150',
        )}
        onClick={() => mode === 'closed' ? setMode('menu') : close()}
      >
        <span className="text-lg leading-none">{mode !== 'closed' ? '×' : '+'}</span>
        Добавить
      </button>
    </>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TypeBtn({ icon, label, onClick, hotkey }: {
  icon: string; label: string; onClick: () => void; hotkey?: string
}) {
  return (
    <button
      className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl
                 hover:bg-ink-10 hover:scale-105 active:scale-95
                 transition-all duration-100 min-w-[56px]"
      onClick={onClick}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span className="text-[11px] text-ink-60 font-medium leading-none">{label}</span>
      {hotkey && (
        <kbd className="text-[9px] font-mono text-ink-30 bg-ink-10
                        px-1 py-0.5 rounded leading-none">{hotkey}</kbd>
      )}
    </button>
  )
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none"
         className={active ? 'text-white' : 'text-ink-60'}>
      <rect x="4" y="0" width="8" height="13" rx="4"
            stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1 9C1 13.4183 4.13401 17 8 17C11.866 17 15 13.4183 15 9"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="17" x2="8" y2="20"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
