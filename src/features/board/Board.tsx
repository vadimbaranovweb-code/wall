import { useRef, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useBoardStore }   from '@/stores/boardStore'
import { useCardsStore }   from '@/stores/cardsStore'
import { useBoard }        from '@/hooks/useBoard'
import { CardShell }       from '@/features/cards/CardShell'
import { QuickAddButton }  from '@/features/quick-add/QuickAddButton'
import { DropZoneOverlay } from '@/features/board/DropZoneOverlay'
import { ToastStack }      from '@/components/ToastStack'

interface Props { wallId: string }

export function Board({ wallId }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const camera      = useBoardStore(s => s.camera)
  const resetCamera = useBoardStore(s => s.resetCamera)

  // ✅ Select card IDs only — stable reference when cards don't change
  // Zustand compares with shallow equality — array of primitives is safe
  // useShallow prevents re-render when array contents are identical
  const cardIds = useCardsStore(useShallow(s =>
    s.cards.filter(c => c.wallId === wallId).map(c => c.id)
  ))

  const { handleWheel, handleViewportMouseDown, screenToCanvas } = useBoard(viewportRef)

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
        className="w-full h-full canvas-bg"
        onWheel={handleWheel}
        onMouseDown={handleViewportMouseDown}
        onDoubleClick={handleDblClick}
        style={{ cursor: 'default' }}
      >
        <div
          className="absolute top-0 left-0 origin-[0_0]"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            willChange: 'transform',
          }}
        >
          {cardIds.map(id => (
            <CardShell key={id} cardId={id} />
          ))}
        </div>
      </div>

      <DropZoneOverlay viewportRef={viewportRef} />
      <ToastStack />

      <div className="absolute bottom-5 right-5 pointer-events-none">
        <button
          className="pointer-events-auto px-3 py-1.5 rounded-lg
                     bg-card border border-ink-10 shadow-card
                     font-mono text-xs text-ink-60 hover:text-ink
                     hover:border-ink-30 transition-all duration-150"
          onClick={resetCamera}
          title="Сбросить вид (100%)"
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
      <div className="text-center animate-fade-in space-y-2">
        <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-ink-30
                        flex items-center justify-center mx-auto text-2xl text-ink-30">
          +
        </div>
        <p className="text-sm font-medium text-ink-60">Стена пустая</p>
        <div className="text-xs text-ink-30 space-y-0.5">
          <p>Нажмите <kbd className="px-1.5 py-0.5 rounded bg-ink-10 font-mono">N</kbd> или кнопку <b>+</b> внизу</p>
          <p>Вставьте <kbd className="px-1.5 py-0.5 rounded bg-ink-10 font-mono">⌘V</kbd> текст, ссылку или скриншот</p>
          <p>Или перетащите файл сюда</p>
        </div>
      </div>
    </div>
  )
}
