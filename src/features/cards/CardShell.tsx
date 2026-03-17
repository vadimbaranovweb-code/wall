import React from 'react'
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

export const CardShell = React.memo(({ cardId }: Props) => {
  // ✅ Select individual fields — never call functions that return new objects
  const x       = useCardsStore(s => {
    const dp = s.dragPositions instanceof Map ? (s.dragPositions as Map<string, {x:number;y:number;zIndex:number}>).get(cardId) : undefined
    return dp?.x ?? s.cards.find(c => c.id === cardId)?.x ?? 0
  })
  const y       = useCardsStore(s => {
    const dp = s.dragPositions instanceof Map ? (s.dragPositions as Map<string, {x:number;y:number;zIndex:number}>).get(cardId) : undefined
    return dp?.y ?? s.cards.find(c => c.id === cardId)?.y ?? 0
  })
  const width   = useCardsStore(s => {
    const rp = s.resizePositions instanceof Map ? (s.resizePositions as Map<string, {width:number;height:number}>).get(cardId) : undefined
    return rp?.width ?? s.cards.find(c => c.id === cardId)?.width ?? 240
  })
  const height  = useCardsStore(s => {
    const rp = s.resizePositions instanceof Map ? (s.resizePositions as Map<string, {width:number;height:number}>).get(cardId) : undefined
    return rp?.height ?? s.cards.find(c => c.id === cardId)?.height ?? 120
  })
  const zIndex  = useCardsStore(s => {
    const dp = s.dragPositions instanceof Map ? (s.dragPositions as Map<string, {x:number;y:number;zIndex:number}>).get(cardId) : undefined
    return dp?.zIndex ?? s.cards.find(c => c.id === cardId)?.zIndex ?? 1000
  })
  const rotation  = useCardsStore(s => s.cards.find(c => c.id === cardId)?.rotation ?? 0)
  const isDragging = useCardsStore(s => s.dragPositions instanceof Map && s.dragPositions.has(cardId))

  // Read the full card only for rendering content (type + type-specific fields)
  const card = useCardsStore(s => s.cards.find(c => c.id === cardId))

  const isSelected = useBoardStore(s => s.selectedCardId === cardId)
  const isEditing  = useBoardStore(s => s.editingCardId  === cardId)
  const selectCard = useBoardStore(s => s.selectCard)
  const deleteCard = useCardsStore(s => s.deleteCard)

  const { onMouseDown }       = useDrag(cardId)
  const { onResizeMouseDown } = useResize(cardId)

  if (!card) return null

  return (
    <div
      data-card
      tabIndex={0}
      className={cn(
        'absolute group focus:outline-none rounded-card',
        'bg-card border border-ink-10',
        'shadow-card transition-shadow duration-150',
        isSelected && !isDragging && 'shadow-card-selected',
        isDragging  && 'shadow-card-drag opacity-95',
        !isEditing  && 'cursor-grab',
        isEditing   && 'cursor-text',
      )}
      style={{
        left:    x,
        top:     y,
        width,
        height,
        zIndex,
        transform: isSelected ? 'none' : `rotate(${rotation}deg)`,
        transition: isSelected ? 'transform 0.15s ease, box-shadow 0.15s' : undefined,
        contain:    'layout paint',
        willChange: isDragging ? 'transform' : 'auto',
      }}
      onMouseDown={isEditing ? undefined : onMouseDown}
      onClick={e => { e.stopPropagation(); selectCard(cardId) }}
      onKeyDown={e => {
        if (!isEditing && (e.key === 'Delete' || e.key === 'Backspace')) deleteCard(cardId)
        if (e.key === 'Escape') selectCard(null)
      }}
    >
      <CardContent card={card} />

      {isSelected && !isEditing && (
        <button
          className="absolute -top-3 -right-3 w-6 h-6 rounded-full z-10
                     bg-ink text-card flex items-center justify-center
                     text-sm leading-none opacity-0 group-hover:opacity-100
                     hover:bg-accent transition-all duration-150 shadow-card"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); deleteCard(cardId) }}
          title="Удалить (Delete)"
        >
          ×
        </button>
      )}

      {isSelected && !isEditing && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 z-10
                     cursor-nwse-resize flex items-end justify-end p-1
                     opacity-0 group-hover:opacity-60 hover:!opacity-100
                     transition-opacity"
          onMouseDown={onResizeMouseDown}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M7 1L1 7M7 4L4 7" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" className="text-ink-60"/>
          </svg>
        </div>
      )}
    </div>
  )
})

CardShell.displayName = 'CardShell'

function CardContent({ card }: { card: Card }) {
  switch (card.type) {
    case 'text':  return <TextCard  card={card} />
    case 'image': return <ImageCard card={card} />
    case 'link':  return <LinkCard  card={card} />
    case 'voice': return <VoiceCard card={card} />
  }
}
