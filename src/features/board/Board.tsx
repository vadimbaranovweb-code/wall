import { useRef, useCallback, useEffect } from 'react'
import { useShallow }      from 'zustand/react/shallow'
import { useBoardStore }   from '@/stores/boardStore'
import { useCardsStore }   from '@/stores/cardsStore'
import { useBoard }        from '@/hooks/useBoard'
import { CardShell }       from '@/features/cards/CardShell'
import { QuickAddButton }  from '@/features/quick-add/QuickAddButton'
import { DropZoneOverlay } from '@/features/board/DropZoneOverlay'
import { ToastStack }      from '@/components/ToastStack'
import { AutosaveIndicator } from '@/components/AutosaveIndicator'

interface Props { wallId: string }

export function Board({ wallId }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const camera      = useBoardStore(s => s.camera)
  const resetCamera = useBoardStore(s => s.resetCamera)
  const fitCards    = useBoardStore(s => s.fitCards)

  const cardIds = useCardsStore(useShallow(s =>
    s.cards.filter(c => c.wallId === wallId).map(c => c.id)
  ))

  const { handleViewportMouseDown, screenToCanvas } = useBoard(viewportRef)

  // Auto-fit когда карточки загрузились — только один раз на стену
  const hasFitted = useRef(false)

  useEffect(() => {
    hasFitted.current = false
  }, [wallId])

  useEffect(() => {
    if (hasFitted.current) return
    if (cardIds.length === 0) return
    const vp = viewportRef.current
    if (!vp) return

    // Берём свежие данные из store напрямую — без подписки
    const allCards = useCardsStore.getState().cards.filter(c => c.wallId === wallId)
    if (allCards.length === 0) return

    hasFitted.current = true
    fitCards(
      allCards.map(c => ({ x: c.x, y: c.y, width: c.width, height: c.height })),
      vp.clientWidth,
      vp.clientHeight
    )
  }, [cardIds.length, wallId, fitCards])

  const handleFitAll = useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return
    const allCards = useCardsStore.getState().cards.filter(c => c.wallId === wallId)
    fitCards(
      allCards.map(c => ({ x: c.x, y: c.y, width: c.width, height: c.height })),
      vp.clientWidth,
      vp.clientHeight
    )
  }, [wallId, fitCards])

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-card]')) return
    const vp = viewportRef.current?.getBoundingClientRect()
    if (!vp) return
    const pos = screenToCanvas(e.clientX - vp.left, e.clientY - vp.top)
    useCardsStore.getState().createTextCard(wallId, pos.x - 120, pos.y - 60)
  }, [wallId, screenToCanvas])

  const zoomPct = Math.round(camera.zoom * 100)

  return (
    <div className="relative w-full h-full overflow-hidden">

      <div
        ref={viewportRef}
        className="w-full h-full canvas-bg select-none"
        onMouseDown={handleViewportMouseDown}
        onDoubleClick={handleDblClick}
        style={{ cursor: 'default' }}
      >
        <div
          className="absolute top-0 left-0 origin-[0_0]"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            willChange: 'transform',
            transition: 'none',
          }}
        >
          {cardIds.map(id => (
            <CardShell key={id} cardId={id} />
          ))}
        </div>
      </div>

      <DropZoneOverlay viewportRef={viewportRef} />
      <ToastStack />

      {/* Bottom-right HUD */}
      <div className="absolute bottom-5 right-5 flex items-center gap-2 pointer-events-none">
        <AutosaveIndicator />

        {/* Fit all button */}
        {cardIds.length > 0 && (
          <button
            className="pointer-events-auto px-3 py-1.5 rounded-lg
                       bg-card/90 backdrop-blur-sm border border-ink-10
                       shadow-card font-mono text-xs text-ink-60
                       hover:text-ink hover:border-ink-30
                       transition-all duration-150"
            onClick={handleFitAll}
            title="Показать все карточки"
          >
            ⊡
          </button>
        )}

        {/* Zoom % */}
        <button
          className="pointer-events-auto px-3 py-1.5 rounded-lg
                     bg-card/90 backdrop-blur-sm border border-ink-10
                     shadow-card font-mono text-xs text-ink-60
                     hover:text-ink hover:border-ink-30
                     transition-all duration-150"
          onClick={resetCamera}
          title="Сбросить вид — 100% (Ctrl+0)"
        >
          {zoomPct}%
        </button>
      </div>

      <QuickAddButton wallId={wallId} viewportRef={viewportRef} />

      {cardIds.length === 0 && <EmptyBoardHint />}
    </div>
  )
}

function EmptyBoardHint() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-ink-20
                        flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
               className="text-ink-30">
            <path d="M12 5v14M5 12h14" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-ink-60 mb-3">
          Стена пустая
        </p>
        <div className="space-y-1.5 text-xs text-ink-30">
          <p>
            <kbd className="px-1.5 py-0.5 rounded-md bg-ink-10 font-mono text-ink-60">N</kbd>
            {' '}новая заметка
          </p>
          <p>
            <kbd className="px-1.5 py-0.5 rounded-md bg-ink-10 font-mono text-ink-60">⌘V</kbd>
            {' '}вставить текст, ссылку или скриншот
          </p>
          <p>Или перетащите файл сюда</p>
          <p className="pt-2 text-ink-20">
            Двойной клик на доске — создать заметку
          </p>
        </div>
      </div>
    </div>
  )
}