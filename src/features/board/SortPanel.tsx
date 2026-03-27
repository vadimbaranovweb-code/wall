import { useState } from 'react'
import { useCardsStore } from '@/stores/cardsStore'
import type { Card } from '@/types'

const GAP  = 24
const COLS = 3

interface Props {
  wallId: string
}

export function SortPanel({ wallId }: Props) {
  const [open, setOpen] = useState(false)

  const getCards = () => {
    const store = useCardsStore.getState()
    return store.cards.filter(c => c.wallId === wallId)
  }

  const place = (sorted: Card[]) => {
    const store = useCardsStore.getState()
    const rows: Card[][] = []
    for (let i = 0; i < sorted.length; i += COLS) {
      rows.push(sorted.slice(i, i + COLS))
    }
    let currentY = 100
    rows.forEach(row => {
      const maxHeight = Math.max(...row.map(c => c.height))
      let currentX = 100
      row.forEach(card => {
        store.setDragPosition(card.id, currentX, currentY)
        setTimeout(() => store.commitDrag(card.id), 0)
        currentX += card.width + GAP
      })
      currentY += maxHeight + GAP
    })
    setOpen(false)
  }

  const placeColumn = (sorted: Card[]) => {
    const store = useCardsStore.getState()
    let currentY = 100
    sorted.forEach(card => {
      store.setDragPosition(card.id, 100, currentY)
      setTimeout(() => store.commitDrag(card.id), 0)
      currentY += card.height + GAP
    })
    setOpen(false)
  }

  const placeRow = (sorted: Card[]) => {
    const store = useCardsStore.getState()
    let currentX = 100
    sorted.forEach(card => {
      store.setDragPosition(card.id, currentX, 100)
      setTimeout(() => store.commitDrag(card.id), 0)
      currentX += card.width + GAP
    })
    setOpen(false)
  }

  const placeByTypeColumns = () => {
    // Каждый тип = отдельный столбик рядом
    const store = useCardsStore.getState()
    const cards = getCards()
    const typeOrder = ['text', 'link', 'image', 'voice']
    const groups: Record<string, Card[]> = {}
    typeOrder.forEach(t => { groups[t] = cards.filter(c => c.type === t) })

    let currentX = 100
    typeOrder.forEach(type => {
      const group = groups[type]
      if (group.length === 0) return
      let currentY = 100
      group.forEach(card => {
        store.setDragPosition(card.id, currentX, currentY)
        setTimeout(() => store.commitDrag(card.id), 0)
        currentY += card.height + GAP
      })
      const maxWidth = Math.max(...group.map(c => c.width))
      currentX += maxWidth + GAP * 2
    })
    setOpen(false)
  }

  const placeByTypeRows = () => {
    // Каждый тип = отдельная строка
    const store = useCardsStore.getState()
    const cards = getCards()
    const typeOrder = ['text', 'link', 'image', 'voice']
    const groups: Record<string, Card[]> = {}
    typeOrder.forEach(t => { groups[t] = cards.filter(c => c.type === t) })

    let currentY = 100
    typeOrder.forEach(type => {
      const group = groups[type]
      if (group.length === 0) return
      let currentX = 100
      group.forEach(card => {
        store.setDragPosition(card.id, currentX, currentY)
        setTimeout(() => store.commitDrag(card.id), 0)
        currentX += card.width + GAP
      })
      const maxHeight = Math.max(...group.map(c => c.height))
      currentY += maxHeight + GAP * 2
    })
    setOpen(false)
  }

  const sortBy = (type: 'createdAt-desc' | 'createdAt-asc' | 'updatedAt-desc') => {
    const cards = getCards()
    let sorted = [...cards]
    if (type === 'createdAt-desc') sorted.sort((a, b) => b.createdAt - a.createdAt)
    if (type === 'createdAt-asc')  sorted.sort((a, b) => a.createdAt - b.createdAt)
    if (type === 'updatedAt-desc') sorted.sort((a, b) => b.updatedAt - a.updatedAt)
    place(sorted)
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   bg-card/90 backdrop-blur-sm border border-ink-10
                   shadow-card font-mono text-xs text-ink-60
                   hover:text-ink hover:border-ink-30 transition-all duration-150"
        onClick={() => setOpen(v => !v)}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        Сортировка
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 z-50
                     bg-card border border-ink-10 rounded-xl
                     shadow-card-hover py-1 min-w-[220px] animate-fade-in"
        >
          {/* Сортировка по дате */}
          <p className="text-[10px] font-medium text-ink-30 uppercase tracking-wider px-3 pt-2 pb-1">
            По дате → сетка
          </p>
          <SortBtn icon="🕐" label="Новые сначала"       onClick={() => sortBy('createdAt-desc')} />
          <SortBtn icon="📅" label="Старые сначала"      onClick={() => sortBy('createdAt-asc')}  />
          <SortBtn icon="✏️" label="Недавно изменённые"  onClick={() => sortBy('updatedAt-desc')} />

          <div className="h-px bg-ink-10 mx-2 my-1.5" />

          {/* По типу */}
          <p className="text-[10px] font-medium text-ink-30 uppercase tracking-wider px-3 pb-1">
            По типу
          </p>
          <SortBtn icon="☰" label="Строками (тип = строка)"   onClick={placeByTypeRows}    />
          <SortBtn icon="⬦" label="Столбиками (тип = столбик)" onClick={placeByTypeColumns} />

          <div className="h-px bg-ink-10 mx-2 my-1.5" />

          {/* Расставить всё */}
          <p className="text-[10px] font-medium text-ink-30 uppercase tracking-wider px-3 pb-1">
            Расставить всё
          </p>
          <SortBtn icon="⊞" label="Сетка"       onClick={() => place([...getCards()])}    />
          <SortBtn icon="☰" label="В столбик"   onClick={() => placeColumn([...getCards()])} />
          <SortBtn icon="▤" label="В строку"    onClick={() => placeRow([...getCards()])}    />
        </div>
      )}
    </div>
  )
}

function SortBtn({ label, icon, onClick }: {
  label: string; icon: string; onClick: () => void
}) {
  return (
    <button
      className="w-full flex items-center gap-2.5 px-3 py-2
                 text-sm text-ink-60 hover:bg-ink-10 hover:text-ink
                 transition-colors duration-100 text-left"
      onClick={onClick}
    >
      <span className="w-4 text-center">{icon}</span>
      {label}
    </button>
  )
}
