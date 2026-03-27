import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBoardStore } from '@/stores/boardStore'
import { useCardsStore } from '@/stores/cardsStore'

interface Props { wallId: string }

export function MultiSelectToolbar({ wallId }: Props) {
  const selectedCardIds = useBoardStore(s => s.selectedCardIds)
  const clearSelection  = useBoardStore(s => s.clearSelection)
  const deleteCard      = useCardsStore(s => s.deleteCard)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const count = selectedCardIds.length

  const handleDeleteAll = useCallback(() => {
    selectedCardIds.forEach(id => deleteCard(id))
    clearSelection()
    setConfirmOpen(false)
  }, [selectedCardIds, deleteCard, clearSelection])

  return (
    <>
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50
                   flex items-center gap-1 bg-ink rounded-xl px-2 py-1.5
                   shadow-card-hover animate-fade-in"
      >
        {/* Count */}
        <span className="text-card/60 text-xs font-mono px-1">
          {count} карт.
        </span>

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {/* Align left */}
        <ToolbarBtn title="По левому краю" onClick={() => alignCards('left', selectedCardIds)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="4" y="3" width="7" height="3" rx="1" fill="currentColor"/>
            <rect x="4" y="8" width="5" height="3" rx="1" fill="currentColor"/>
          </svg>
        </ToolbarBtn>

        {/* Align center horizontal */}
        <ToolbarBtn title="По центру горизонтально" onClick={() => alignCards('centerH', selectedCardIds)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="3" y="3" width="8" height="3" rx="1" fill="currentColor"/>
            <rect x="4" y="8" width="6" height="3" rx="1" fill="currentColor"/>
          </svg>
        </ToolbarBtn>

        {/* Align right */}
        <ToolbarBtn title="По правому краю" onClick={() => alignCards('right', selectedCardIds)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="3" y="3" width="7" height="3" rx="1" fill="currentColor"/>
            <rect x="5" y="8" width="5" height="3" rx="1" fill="currentColor"/>
          </svg>
        </ToolbarBtn>

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {/* Align top */}
        <ToolbarBtn title="По верхнему краю" onClick={() => alignCards('top', selectedCardIds)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="2" x2="12" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="3" y="4" width="3" height="7" rx="1" fill="currentColor"/>
            <rect x="8" y="4" width="3" height="5" rx="1" fill="currentColor"/>
          </svg>
        </ToolbarBtn>

        {/* Align middle vertical */}
        <ToolbarBtn title="По центру вертикально" onClick={() => alignCards('centerV', selectedCardIds)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="3" y="3" width="3" height="8" rx="1" fill="currentColor"/>
            <rect x="8" y="4" width="3" height="6" rx="1" fill="currentColor"/>
          </svg>
        </ToolbarBtn>

        {/* Align bottom */}
        <ToolbarBtn title="По нижнему краю" onClick={() => alignCards('bottom', selectedCardIds)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="3" y="3" width="3" height="7" rx="1" fill="currentColor"/>
            <rect x="8" y="5" width="3" height="5" rx="1" fill="currentColor"/>
          </svg>
        </ToolbarBtn>

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {/* Distribute horizontal */}
        <ToolbarBtn title="Расставить горизонтально" onClick={() => distributeCards('horizontal', selectedCardIds)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="5" y="4" width="4" height="6" rx="1" fill="currentColor"/>
          </svg>
        </ToolbarBtn>

        {/* Distribute vertical */}
        <ToolbarBtn title="Расставить вертикально" onClick={() => distributeCards('vertical', selectedCardIds)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="2" x2="12" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="4" y="5" width="6" height="4" rx="1" fill="currentColor"/>
          </svg>
        </ToolbarBtn>

          {/* Auto arrange */}
          <ToolbarBtn title="Расставить по сетке" onClick={() => arrangeCards(selectedCardIds)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor"/>
            <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor"/>
            <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor"/>
            <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor"/>
          </svg>
        </ToolbarBtn>

        

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {/* Delete */}
        <ToolbarBtn title="Удалить все" danger onClick={() => setConfirmOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 3.5H11M5 3.5V2.5H8V3.5M4.5 3.5V10.5H8.5V3.5"
                  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </ToolbarBtn>

        {/* Deselect */}
        <ToolbarBtn title="Снять выделение (Esc)" onClick={clearSelection}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </ToolbarBtn>
      </div>

      {/* Confirm delete */}
      {confirmOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(26,24,20,0.3)',
          }}
          onMouseDown={e => { if (e.target === e.currentTarget) setConfirmOpen(false) }}
        >
          <div
            className="bg-card rounded-2xl border border-ink-10
                       shadow-card-hover p-6 w-80 animate-pop-in"
            onMouseDown={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-ink text-base mb-1">
              Удалить {count} карточек?
            </h3>
            <p className="text-sm text-ink-60 mb-5">Это действие нельзя отменить.</p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-sm text-ink-60
                           hover:text-ink hover:bg-ink-10 transition-colors"
                onClick={() => setConfirmOpen(false)}
              >
                Отмена
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white
                           text-sm font-medium hover:bg-red-600 transition-colors"
                onClick={handleDeleteAll}
              >
                Удалить всё
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function ToolbarBtn({ children, title, onClick, danger }: {
  children: React.ReactNode
  title: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      className={`w-7 h-7 flex items-center justify-center rounded-md
                  text-white/70 hover:text-white transition-colors duration-100
                  ${danger ? 'hover:bg-red-500/80' : 'hover:bg-white/15'}`}
      title={title}
      onClick={e => { e.stopPropagation(); onClick() }}
    >
      {children}
    </button>
  )
}

// ─── Align helpers ────────────────────────────────────────────────────────────

function alignCards(direction: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom', ids: string[]) {
  const store = useCardsStore.getState()
  const cards = ids.map(id => store.cards.find(c => c.id === id)).filter(Boolean) as any[]
  if (cards.length < 2) return

  let targetValue: number

  switch (direction) {
    case 'left':    targetValue = Math.min(...cards.map(c => c.x)); break
    case 'right':   targetValue = Math.max(...cards.map(c => c.x + c.width)); break
    case 'top':     targetValue = Math.min(...cards.map(c => c.y)); break
    case 'bottom':  targetValue = Math.max(...cards.map(c => c.y + c.height)); break
    case 'centerH': targetValue = (Math.min(...cards.map(c => c.x)) + Math.max(...cards.map(c => c.x + c.width))) / 2; break
    case 'centerV': targetValue = (Math.min(...cards.map(c => c.y)) + Math.max(...cards.map(c => c.y + c.height))) / 2; break
  }

  cards.forEach(card => {
    let newX = card.x
    let newY = card.y
    switch (direction) {
      case 'left':    newX = targetValue; break
      case 'right':   newX = targetValue - card.width; break
      case 'top':     newY = targetValue; break
      case 'bottom':  newY = targetValue - card.height; break
      case 'centerH': newX = targetValue - card.width / 2; break
      case 'centerV': newY = targetValue - card.height / 2; break
    }
    store.setDragPosition(card.id, newX, newY)
    setTimeout(() => store.commitDrag(card.id), 0)
  })
}

// ─── Distribute helpers ───────────────────────────────────────────────────────

function distributeCards(direction: 'horizontal' | 'vertical', ids: string[]) {
  const store = useCardsStore.getState()
  const cards = ids.map(id => store.cards.find(c => c.id === id)).filter(Boolean) as any[]
  if (cards.length < 3) return

  const GAP = 16

  if (direction === 'horizontal') {
    const sorted = [...cards].sort((a, b) => a.x - b.x)
    let currentX = sorted[0].x
    sorted.forEach(card => {
      store.setDragPosition(card.id, currentX, card.y)
      setTimeout(() => store.commitDrag(card.id), 0)
      currentX += card.width + GAP
    })
  } else {
    const sorted = [...cards].sort((a, b) => a.y - b.y)
    let currentY = sorted[0].y
    sorted.forEach(card => {
      store.setDragPosition(card.id, card.x, currentY)
      setTimeout(() => store.commitDrag(card.id), 0)
      currentY += card.height + GAP
    })
  }
}

function arrangeCards(ids: string[], cols = 3, gap = 24) {
  const store = useCardsStore.getState()
  const cards = ids.map(id => store.cards.find(c => c.id === id)).filter(Boolean) as any[]
  if (cards.length === 0) return

  const startX = Math.min(...cards.map(c => c.x))
  const startY = Math.min(...cards.map(c => c.y))

  cards.forEach((card, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = startX + col * (card.width + gap)
    const y = startY + row * (card.height + gap)
    store.setDragPosition(card.id, x, y)
    setTimeout(() => store.commitDrag(card.id), 0)
  })
}