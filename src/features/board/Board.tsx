import { useRef, useCallback, useEffect, useState } from 'react'
import { useShallow }        from 'zustand/react/shallow'
import { useBoardStore }     from '@/stores/boardStore'
import { useCardsStore }     from '@/stores/cardsStore'
import { useBoard }          from '@/hooks/useBoard'
import { CardShell }         from '@/features/cards/CardShell'
import { QuickAddButton }    from '@/features/quick-add/QuickAddButton'
import { DropZoneOverlay }   from '@/features/board/DropZoneOverlay'
import { ToastStack }        from '@/components/ToastStack'
import { AutosaveIndicator } from '@/components/AutosaveIndicator'
import { MultiSelectToolbar } from '@/features/board/MultiSelectToolbar'

interface Props { wallId: string }

export function Board({ wallId }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const camera      = useBoardStore(s => s.camera)
  const resetCamera = useBoardStore(s => s.resetCamera)
  const fitCards    = useBoardStore(s => s.fitCards)
  const selectCards = useBoardStore(s => s.selectCards)
  const clearSelection = useBoardStore(s => s.clearSelection)
  const selectedCardIds = useBoardStore(s => s.selectedCardIds)

  // Drag selection state
  const [dragSel, setDragSel] = useState<{
    startX: number; startY: number
    curX: number;   curY: number
    active: boolean
  } | null>(null)

  const cardIds = useCardsStore(useShallow(s =>
    s.cards.filter(c => c.wallId === wallId).map(c => c.id)
  ))

  const { handleViewportMouseDown, screenToCanvas } = useBoard(viewportRef)

  // Auto-fit
  const hasFitted = useRef(false)
  useEffect(() => {
    if (hasFitted.current) return
    if (cardIds.length === 0) return
    const vp = viewportRef.current
    if (!vp) return
    hasFitted.current = true
    const allCards = useCardsStore.getState().cards.filter(c => c.wallId === wallId)
    if (allCards.length === 0) return
    fitCards(
      allCards.map(c => ({ x: c.x, y: c.y, width: c.width, height: c.height })),
      vp.clientWidth,
      vp.clientHeight
    )
  }, [cardIds.length, wallId, fitCards])

  useEffect(() => { hasFitted.current = false }, [wallId])

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

  // Drag selection — mousedown на холсте
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const isCard = (e.target as HTMLElement).closest('[data-card]')
    if (isCard) {
      handleViewportMouseDown(e)
      return
    }

    // Левая кнопка без модификаторов — начинаем drag selection
    if (e.button === 0 && !e.altKey && !e.metaKey && !e.ctrlKey) {
      const vp = viewportRef.current?.getBoundingClientRect()
      if (!vp) return
      const x = e.clientX - vp.left
      const y = e.clientY - vp.top
      setDragSel({ startX: x, startY: y, curX: x, curY: y, active: false })
      clearSelection()
      return
    }

    handleViewportMouseDown(e)
  }, [handleViewportMouseDown, clearSelection])

  // Drag selection — mousemove / mouseup
  useEffect(() => {
    if (!dragSel) return

    const onMove = (e: MouseEvent) => {
      const vp = viewportRef.current?.getBoundingClientRect()
      if (!vp) return
      const curX = e.clientX - vp.left
      const curY = e.clientY - vp.top
      setDragSel(s => s ? { ...s, curX, curY, active: true } : null)

      // Находим карточки в области выделения
      const selLeft   = Math.min(dragSel.startX, curX)
      const selTop    = Math.min(dragSel.startY, curY)
      const selRight  = Math.max(dragSel.startX, curX)
      const selBottom = Math.max(dragSel.startY, curY)

      const cam = useBoardStore.getState().camera
      const cards = useCardsStore.getState().cards.filter(c => c.wallId === wallId)

      const inside = cards.filter(c => {
        const cx1 = c.x * cam.zoom + cam.x
        const cy1 = c.y * cam.zoom + cam.y
        const cx2 = (c.x + c.width)  * cam.zoom + cam.x
        const cy2 = (c.y + c.height) * cam.zoom + cam.y
        return cx1 < selRight && cx2 > selLeft && cy1 < selBottom && cy2 > selTop
      }).map(c => c.id)

      selectCards(inside)
    }

    const onUp = () => setDragSel(null)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [dragSel, wallId, selectCards])

  const zoomPct = Math.round(camera.zoom * 100)

  // Rect для drag selection overlay
  const selRect = dragSel?.active ? {
    left:   Math.min(dragSel.startX, dragSel.curX),
    top:    Math.min(dragSel.startY, dragSel.curY),
    width:  Math.abs(dragSel.curX - dragSel.startX),
    height: Math.abs(dragSel.curY - dragSel.startY),
  } : null

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={viewportRef}
        className="w-full h-full canvas-bg select-none"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDblClick}
        style={{ cursor: dragSel?.active ? 'crosshair' : 'default' }}
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

        {/* Drag selection overlay */}
        {selRect && (
          <div
            className="absolute pointer-events-none border border-blue-400
                       bg-blue-400/10 rounded"
            style={{
              left:   selRect.left,
              top:    selRect.top,
              width:  selRect.width,
              height: selRect.height,
            }}
          />
        )}
      </div>

      <DropZoneOverlay viewportRef={viewportRef} />
      <ToastStack />

      {/* Multi-select toolbar */}
      {selectedCardIds.length > 1 && (
        <MultiSelectToolbar wallId={wallId} />
      )}

      {/* Bottom-right HUD */}
      <div className="absolute bottom-5 right-5 flex items-center gap-2 pointer-events-none">
        <AutosaveIndicator />
        {cardIds.length > 0 && (
          <button
            className="pointer-events-auto px-3 py-1.5 rounded-lg
                       bg-card/90 backdrop-blur-sm border border-ink-10
                       shadow-card font-mono text-xs text-ink-60
                       hover:text-ink hover:border-ink-30 transition-all duration-150"
            onClick={handleFitAll}
            title="Показать все карточки"
          >
            ⊡
          </button>
        )}
        <button
          className="pointer-events-auto px-3 py-1.5 rounded-lg
                     bg-card/90 backdrop-blur-sm border border-ink-10
                     shadow-card font-mono text-xs text-ink-60
                     hover:text-ink hover:border-ink-30 transition-all duration-150"
          onClick={resetCamera}
          title="Сбросить вид (Ctrl+0)"
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink-30">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-ink-60 mb-3">Стена пустая</p>
        <div className="space-y-1.5 text-xs text-ink-30">
          <p><kbd className="px-1.5 py-0.5 rounded-md bg-ink-10 font-mono text-ink-60">N</kbd> новая заметка</p>
          <p><kbd className="px-1.5 py-0.5 rounded-md bg-ink-10 font-mono text-ink-60">⌘V</kbd> вставить текст, ссылку или скриншот</p>
          <p>Или перетащите файл сюда</p>
          <p className="pt-2 text-ink-20">Двойной клик на доске — создать заметку</p>
        </div>
      </div>
    </div>
  )
}