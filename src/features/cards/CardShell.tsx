import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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

const CARD_COLORS = [
  { hex: null,      label: 'Белый'       },
  { hex: '#FEF9C3', label: 'Жёлтый'     },
  { hex: '#DCFCE7', label: 'Зелёный'    },
  { hex: '#FEE2E2', label: 'Красный'    },
  { hex: '#DBEAFE', label: 'Синий'      },
  { hex: '#EDE9FE', label: 'Фиолетовый' },
  { hex: '#F3F4F6', label: 'Серый'      },
]

export const CardShell = React.memo(({ cardId }: Props) => {
  const [isHovered,   setIsHovered]   = useState(false)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [menuPos,     setMenuPos]     = useState({ top: 0, right: 0 })
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef    = useRef<HTMLDivElement>(null)

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
  const card = useCardsStore(s => s.cards.find(c => c.id === cardId))

  const isSelected  = useBoardStore(s => s.selectedCardId === cardId)
  const isEditing   = useBoardStore(s => s.editingCardId  === cardId)
  const selectCard  = useBoardStore(s => s.selectCard)
  const deleteCard  = useCardsStore(s => s.deleteCard)
  const updateColor = useCardsStore(s => s.updateColor)

  const handleColorChange = useCallback((hex: string | null) => {
    updateColor(cardId, hex)
    setMenuOpen(false)
  }, [cardId, updateColor])

  const { onMouseDown }       = useDrag(cardId)
  const { onResizeMouseDown } = useResize(cardId)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [menuOpen])

  if (!card) return null

  const showControls = (isHovered || isSelected) && !isEditing && !isDragging

  return (
    <>
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
          transform: isSelected ? 'none' : 'rotate(' + rotation + 'deg)',
          transition: isDragging
            ? 'none'
            : 'transform 0.15s ease, box-shadow 0.2s ease',
          boxShadow: isDragging
            ? '0 20px 60px rgba(26,24,20,0.22), 0 8px 20px rgba(26,24,20,0.14), 0 2px 6px rgba(26,24,20,0.10)'
            : isSelected
            ? '0 0 0 2px #FF5733, 0 8px 24px rgba(26,24,20,0.12), 0 2px 6px rgba(26,24,20,0.08)'
            : isHovered
            ? '0 8px 24px rgba(26,24,20,0.10), 0 2px 8px rgba(26,24,20,0.07)'
            : '0 2px 8px rgba(26,24,20,0.07), 0 1px 3px rgba(26,24,20,0.05)',
          contain:    'layout paint',
          willChange: isDragging ? 'transform, left, top' : 'auto',
          cursor: isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={isEditing ? undefined : onMouseDown}
        onClick={e => { e.stopPropagation(); selectCard(cardId) }}
        onKeyDown={e => {
          if (!isEditing && (e.key === 'Delete' || e.key === 'Backspace')) {
            setConfirmOpen(true)
          }
          if (e.key === 'Escape') selectCard(null)
        }}
      >
        <div
          className="absolute inset-0 rounded-card border border-ink-10 overflow-hidden"
          style={{ backgroundColor: card.colorHex ?? '#FFFFFF' }}
        >
          <CardContent card={card} />
        </div>

        {showControls && (
          <div ref={menuRef} className="absolute top-2 right-2 z-20">
           <button
              ref={menuBtnRef}
              className="w-6 h-6 rounded-md flex items-center justify-center
                         bg-white/80 backdrop-blur-sm border border-ink-10
                         text-ink-30 hover:text-ink hover:bg-white
                         transition-all duration-100 shadow-sm"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation()
                if (!menuOpen && menuBtnRef.current) {
                  const rect = menuBtnRef.current.getBoundingClientRect()
                  setMenuPos({
                    top:   rect.bottom + 4,
                    right: window.innerWidth - rect.right,
                  })
                }
                setMenuOpen(v => !v)
              }}
              title="Действия"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="2" cy="6" r="1.2" fill="currentColor"/>
                <circle cx="6" cy="6" r="1.2" fill="currentColor"/>
                <circle cx="10" cy="6" r="1.2" fill="currentColor"/>
              </svg>
            </button>

            {menuOpen && (
              <div
              className="absolute top-8 right-0 z-30
              bg-card border border-ink-10 rounded-xl
              shadow-card-hover py-1 w-[152px]
              animate-fade-in"
                onMouseDown={e => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-ink-10">
                  <p className="text-[10px] text-ink-30 uppercase tracking-wider mb-2">
                    Цвет
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {CARD_COLORS.map(c => (
                      <button
                        key={c.hex ?? 'white'}
                        className="w-5 h-5 rounded-full border border-ink-10
                                   hover:scale-110 transition-transform duration-100
                                   flex items-center justify-center"
                        style={{ background: c.hex ?? '#FFFFFF' }}
                        onClick={e => {
                          e.stopPropagation()
                          handleColorChange(c.hex)
                        }}
                        title={c.label}
                      >
                        {card.colorHex === c.hex && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4l2 2 4-4" stroke="#374151"
                                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2
                             text-sm text-red-500 hover:bg-red-50
                             transition-colors duration-100 text-left"
                  onClick={e => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    setConfirmOpen(true)
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 3.5H11M5 3.5V2.5H8V3.5M4.5 3.5V10.5H8.5V3.5"
                          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
                          strokeLinejoin="round"/>
                  </svg>
                  Удалить
                </button>
              </div>
            )}
          </div>
        )}

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
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top:   menuPos.top,
            right: menuPos.right,
            zIndex: 9998,
          }}
          className="bg-card border border-ink-10 rounded-xl
                     shadow-card-hover py-1 w-[152px]
                     animate-fade-in"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-ink-10">
            <p className="text-[10px] text-ink-30 uppercase tracking-wider mb-2">
              Цвет
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {CARD_COLORS.map(c => (
                <button
                  key={c.hex ?? 'white'}
                  className="w-5 h-5 rounded-full border border-ink-10
                             hover:scale-110 transition-transform duration-100
                             flex items-center justify-center"
                  style={{ background: c.hex ?? '#FFFFFF' }}
                  onClick={e => {
                    e.stopPropagation()
                    handleColorChange(c.hex)
                  }}
                  title={c.label}
                >
                  {card.colorHex === c.hex && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4l2 2 4-4" stroke="#374151"
                            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2
                       text-sm text-red-500 hover:bg-red-50
                       transition-colors duration-100 text-left"
            onClick={e => {
              e.stopPropagation()
              setMenuOpen(false)
              setConfirmOpen(true)
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3.5H11M5 3.5V2.5H8V3.5M4.5 3.5V10.5H8.5V3.5"
                    stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
                    strokeLinejoin="round"/>
            </svg>
            Удалить
          </button>
        </div>,
        document.body
      )}
      
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
          onMouseDown={e => {
            if (e.target === e.currentTarget) setConfirmOpen(false)
          }}
        >
          <div
            className="bg-card rounded-2xl border border-ink-10
                       shadow-card-hover p-6 w-80 animate-pop-in"
            onMouseDown={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-ink text-base mb-1">
              Удалить карточку?
            </h3>
            <p className="text-sm text-ink-60 mb-5">
              Это действие нельзя отменить.
            </p>
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
                           text-sm font-medium hover:bg-red-600
                           transition-colors active:scale-95"
                onClick={() => {
                  deleteCard(cardId)
                  setConfirmOpen(false)
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
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
