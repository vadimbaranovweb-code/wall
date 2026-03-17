import React, { useState } from 'react'
import { useBoardStore } from '@/stores/boardStore'
import { useCardsStore } from '@/stores/cardsStore'
import { useDrag }       from '@/hooks/useDrag'
import { useResize }     from '@/hooks/useResize'
import { cn }            from '@/lib/cn'

import { TextCard }  from './TextCard'
import { ImageCard } from './ImageCard'
import { LinkCard }  from './LinkCard'
import { VoiceCard } from './VoiceCard'

import type { Card } from '@/types'

interface Props { cardId: string }

type DragMap   = Map<string, { x: number; y: number; zIndex: number }>
type ResizeMap = Map<string, { width: number; height: number }>

export const CardShell = React.memo(({ cardId }: Props) => {
  const [isHovered, setIsHovered] = useState(false)

  const x = useCardsStore(s => {
    const dp = s.dragPositions instanceof Map
      ? (s.dragPositions as DragMap).get(cardId) : undefined
    return dp?.x ?? s.cards.find(c => c.id === cardId)?.x ?? 0
  })
  const y = useCardsStore(s => {
    const dp = s.dragPositions instanceof Map
      ? (s.dragPositions as DragMap).get(cardId) : undefined
    return dp?.y ?? s.cards.find(c => c.id === cardId)?.y ?? 0
  })
  const width = useCardsStore(s => {
    const rp = s.resizePositions instanceof Map
      ? (s.resizePositions as ResizeMap).get(cardId) : undefined
    return rp?.width ?? s.cards.find(c => c.id === cardId)?.width ?? 240
  })
  const height = useCardsStore(s => {
    const rp = s.resizePositions instanceof Map
      ? (s.resizePositions as ResizeMap).get(cardId) : undefined
    return rp?.height ?? s.cards.find(c => c.id === cardId)?.height ?? 120
  })
  const zIndex = useCardsStore(s => {
    const dp = s.dragPositions instanceof Map
      ? (s.dragPositions as DragMap).get(cardId) : undefined
    return dp?.zIndex ?? s.cards.find(c => c.id === cardId)?.zIndex ?? 1000
  })
  const rotation   = useCardsStore(s => s.cards.find(c => c.id === cardId)?.rotation ?? 0)
  const isDragging = useCardsStore(s =>
    s.dragPositions instanceof Map &&
    (s.dragPositions as Map<string, unknown>).has(cardId)
  )
  const card       = useCardsStore(s => s.cards.find(c => c.id === cardId))

  const isSelected = useBoardStore(s => s.selectedCardId === cardId)
  const isEditing  = useBoardStore(s => s.editingCardId  === cardId)
  const selectCard = useBoardStore(s => s.selectCard)
  const deleteCard = useCardsStore(s => s.deleteCard)

  const { onMouseDown }       = useDrag(cardId)
  const { onResizeMouseDown } = useResize(cardId)

  if (!card) return null

  const showToolbar = (isHovered || isSelected) && !isEditing && !isDragging

  return (
    <div
      data-card
      tabIndex={0}
      className={cn('absolute focus:outline-none rounded-card')}
      style={{
        left:    x,
        top:     y,
        width,
        height,
        zIndex,
        // Smooth rotation snap when selected
        transform: isSelected ? 'none' : `rotate(${rotation}deg)`,
        transition: isDragging
          ? 'none'
          : 'transform 0.15s ease, box-shadow 0.2s ease',
        // Layered shadows for depth
        boxShadow: isDragging
          ? '0 20px 60px rgba(26,24,20,0.22), 0 8px 20px rgba(26,24,20,0.14), 0 2px 6px rgba(26,24,20,0.10)'
          : isSelected
          ? '0 0 0 2px #FF5733, 0 8px 24px rgba(26,24,20,0.12), 0 2px 6px rgba(26,24,20,0.08)'
          : isHovered
          ? '0 8px 24px rgba(26,24,20,0.10), 0 2px 8px rgba(26,24,20,0.07)'
          : '0 2px 8px rgba(26,24,20,0.07), 0 1px 3px rgba(26,24,20,0.05)',
        contain:   'layout paint',
        willChange: isDragging ? 'transform, left, top' : 'auto',
        cursor: isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={isEditing ? undefined : onMouseDown}
      onClick={e => { e.stopPropagation(); selectCard(cardId) }}
      onKeyDown={e => {
        if (!isEditing && (e.key === 'Delete' || e.key === 'Backspace')) deleteCard(cardId)
        if (e.key === 'Escape') selectCard(null)
      }}
    >
      {/* Card background */}
      <div className="absolute inset-0 rounded-card bg-card border border-ink-10 overflow-hidden">
        <CardContent card={card} />
      </div>

      {/* Hover / selected toolbar */}
      {showToolbar && (
        <div
          className="absolute -top-9 left-0 flex items-center gap-0.5
                     bg-ink rounded-lg px-1 py-1 z-10 shadow-card-hover
                     animate-fade-in"
          onMouseDown={e => e.stopPropagation()}
        >
          <ToolbarBtn
            title="Редактировать"
            onClick={() => useBoardStore.getState().startEditing(cardId)}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M9.5 1.5L11.5 3.5L4.5 10.5H2.5V8.5L9.5 1.5Z"
                    stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </ToolbarBtn>

          <ToolbarBtn
            title="Дублировать"
            onClick={() => duplicateCard(card)}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1.5" y="3.5" width="7" height="8" rx="1.5"
                    stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4.5 3.5V2.5C4.5 1.95 4.95 1.5 5.5 1.5H10.5C11.05 1.5 11.5 1.95 11.5 2.5V7.5C11.5 8.05 11.05 8.5 10.5 8.5H9.5"
                    stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </ToolbarBtn>

          <div className="w-px h-4 bg-white/20 mx-0.5" />

          <ToolbarBtn
            title="Удалить (Del)"
            danger
            onClick={() => deleteCard(cardId)}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3.5H11M5 3.5V2.5H8V3.5M4.5 3.5V10.5H8.5V3.5"
                    stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
                    strokeLinejoin="round"/>
            </svg>
          </ToolbarBtn>
        </div>
      )}

      {/* Resize handle */}
      {isSelected && !isEditing && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 z-10
                     cursor-nwse-resize flex items-end justify-end p-1.5"
          onMouseDown={onResizeMouseDown}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M7 1L1 7M7 4L4 7"
                  stroke="rgba(26,24,20,0.3)" strokeWidth="1.5"
                  strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  )
})

CardShell.displayName = 'CardShell'

// ─── Toolbar button ────────────────────────────────────────────────────────────
function ToolbarBtn({ children, title, onClick, danger }: {
  children: React.ReactNode
  title: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-md',
        'text-white/70 hover:text-white transition-colors duration-100',
        danger && 'hover:bg-red-500/80 hover:text-white',
        !danger && 'hover:bg-white/15',
      )}
      title={title}
      onClick={e => { e.stopPropagation(); onClick() }}
    >
      {children}
    </button>
  )
}

// ─── Duplicate card ────────────────────────────────────────────────────────────
function duplicateCard(card: Card) {
  const store = useCardsStore.getState()
  const offset = 24
  switch (card.type) {
    case 'text':
      store.createTextCard(card.wallId, card.x + offset, card.y + offset, card.content)
      break
    case 'image':
      store.createImageCard(card.wallId, card.x + offset, card.y + offset,
        card.dataUrl, card.originalName, card.naturalWidth, card.naturalHeight)
      break
    case 'link':
      store.createLinkCard(card.wallId, card.x + offset, card.y + offset, card.url)
      break
    case 'voice':
      store.createVoiceCard(card.wallId, card.x + offset, card.y + offset,
        card.audioDataUrl, card.durationSeconds, card.mimeType)
      break
  }
}

// ─── Content router ────────────────────────────────────────────────────────────
function CardContent({ card }: { card: Card }) {
  switch (card.type) {
    case 'text':  return <TextCard  card={card} />
    case 'image': return <ImageCard card={card} />
    case 'link':  return <LinkCard  card={card} />
    case 'voice': return <VoiceCard card={card} />
  }
}
