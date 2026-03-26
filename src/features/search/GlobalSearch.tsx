import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useCardsStore } from '@/stores/cardsStore'
import { useWallsStore } from '@/stores/wallsStore'
import { useBoardStore } from '@/stores/boardStore'
import type { Card, WallColor } from '@/types'

const colorBg: Record<WallColor, string> = {
  teal:   '#2DD4BF',
  amber:  '#F59E0B',
  violet: '#8B5CF6',
  rose:   '#F43F5E',
  sky:    '#0EA5E9',
  lime:   '#84CC16',
}

function getCardText(card: Card): string {
  switch (card.type) {
    case 'text':  return card.content
    case 'link':  return [card.title, card.url, card.domain].filter(Boolean).join(' ')
    case 'voice': return card.transcript ?? ''
    case 'image': return card.originalName
  }
}

function getCardIcon(card: Card): string {
  switch (card.type) {
    case 'text':  return '📝'
    case 'link':  return '🔗'
    case 'voice': return '🎙'
    case 'image': return '🖼'
  }
}

function getCardPreview(card: Card): string {
  const text = getCardText(card)
  return text.length > 60 ? text.slice(0, 60) + '...' : text
}

interface SearchResult {
  card:      Card
  wallName:  string
  wallId:    string
  wallColor: WallColor
}

interface Props {
  isOpen:  boolean
  onClose: () => void
}

export function GlobalSearch({ isOpen, onClose }: Props) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate   = useNavigate()

  const cards      = useCardsStore(s => s.cards)
  const walls      = useWallsStore(s => s.walls)
  const selectCard = useBoardStore(s => s.selectCard)

  // Фокус при открытии
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Поиск
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const q = query.toLowerCase()
    const found: SearchResult[] = []

    for (const card of cards) {
      const text = getCardText(card).toLowerCase()
      if (!text.includes(q)) continue

      const wall = walls.find(w => w.id === card.wallId)
      if (!wall) continue

      found.push({
        card,
        wallName:  wall.name,
        wallId:    wall.id,
        wallColor: wall.color,
      })

      if (found.length >= 20) break
    }

    setResults(found)
    setSelected(0)
  }, [query, cards, walls])

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(`/walls/${result.wallId}`)
    setTimeout(() => {
      selectCard(result.card.id)

      // Зумим камеру на карточку
      const card = useCardsStore.getState().cards.find(c => c.id === result.card.id)
      if (!card) return

      const vpW = window.innerWidth
      const vpH = window.innerHeight
      const zoom = 1
      const x = vpW / 2 - (card.x + card.width  / 2) * zoom
      const y = vpH / 2 - (card.y + card.height / 2) * zoom

      useBoardStore.getState().setCamera({ x, y, zoom })
    }, 150)
    onClose()
  }, [navigate, selectCard, onClose])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(v => Math.min(v + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(v => Math.max(v - 1, 0))
      }
      if (e.key === 'Enter' && results[selected]) {
        handleSelect(results[selected])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, results, selected, handleSelect, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        backgroundColor: 'rgba(26,24,20,0.4)',
      }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-card rounded-2xl border border-ink-10
                   shadow-card-hover w-full max-w-lg mx-4
                   overflow-hidden animate-pop-in"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-10">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
               className="text-ink-30 flex-shrink-0">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11L14 14" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-ink text-sm
                       placeholder:text-ink-30 focus:outline-none"
            placeholder="Поиск по всем стенам..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="text-ink-30 hover:text-ink transition-colors"
              onClick={() => setQuery('')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <kbd className="text-[10px] font-mono text-ink-30 bg-ink-10
                          px-1.5 py-0.5 rounded">
            esc
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-1">
            {results.map((r, i) => (
              <button
                key={r.card.id}
                className={`w-full flex items-center gap-3 px-4 py-2.5
                           text-left transition-colors duration-100
                           ${i === selected ? 'bg-ink-10' : 'hover:bg-ink-10'}`}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setSelected(i)}
              >
                <span className="text-base flex-shrink-0">
                  {getCardIcon(r.card)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">
                    {getCardPreview(r.card) || 'Без текста'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: colorBg[r.wallColor] }}
                    />
                    <span className="text-[11px] text-ink-30 truncate">
                      {r.wallName}
                    </span>
                  </div>
                </div>
                {i === selected && (
                  <kbd className="text-[10px] font-mono text-ink-30
                                  bg-ink-10 px-1.5 py-0.5 rounded flex-shrink-0">
                    ↵
                  </kbd>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-ink-30">Ничего не найдено</p>
          </div>
        )}

        {/* Hint */}
        {!query && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-ink-30">
              Поиск по тексту, ссылкам и голосовым заметкам
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}