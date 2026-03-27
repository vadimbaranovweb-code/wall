import { useState } from 'react'
import { useCardsStore } from '@/stores/cardsStore'

type SortType = 'createdAt-desc' | 'createdAt-asc' | 'updatedAt-desc' | 'type'

interface Props {
  wallId: string
}

const GAP  = 24
const COLS = 3

export function SortPanel({ wallId }: Props) {
  const [open, setOpen] = useState(false)

  const handleSort = (sortType: SortType) => {
    const store = useCardsStore.getState()
    const cards = store.cards.filter(c => c.wallId === wallId)

    let sorted = [...cards]

    switch (sortType) {
      case 'createdAt-desc':
        sorted.sort((a, b) => b.createdAt - a.createdAt)
        break
      case 'createdAt-asc':
        sorted.sort((a, b) => a.createdAt - b.createdAt)
        break
      case 'updatedAt-desc':
        sorted.sort((a, b) => b.updatedAt - a.updatedAt)
        break
      case 'type': {
        const typeOrder: Record<string, number> = { text: 0, link: 1, image: 2, voice: 3 }
        sorted.sort((a, b) => (typeOrder[a.type] ?? 0) - (typeOrder[b.type] ?? 0))
        break
      }
    }

    // Расставляем по сетке с учётом высоты строк
    const startX = 100
    const startY = 100
    const rows: typeof sorted[] = []
    for (let i = 0; i < sorted.length; i += COLS) {
      rows.push(sorted.slice(i, i + COLS))
    }

    let currentY = startY
    rows.forEach(row => {
      const maxHeight = Math.max(...row.map(c => c.height))
      let currentX = startX
      row.forEach(card => {
        store.setDragPosition(card.id, currentX, currentY)
        setTimeout(() => store.commitDrag(card.id), 0)
        currentX += card.width + GAP
      })
      currentY += maxHeight + GAP
    })

    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   bg-card/90 backdrop-blur-sm border border-ink-10
                   shadow-card font-mono text-xs text-ink-60
                   hover:text-ink hover:border-ink-30
                   transition-all duration-150"
        onClick={() => setOpen(v => !v)}
        title="Сортировка и расстановка"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor"
                strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        Сортировка
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 z-50
                     bg-card border border-ink-10 rounded-xl
                     shadow-card-hover py-1 min-w-[200px]
                     animate-fade-in"
        >
          <p className="text-[10px] font-medium text-ink-30 uppercase
                        tracking-wider px-3 py-2">
            Сортировать и расставить
          </p>
          <SortBtn label="Новые сначала"        icon="🕐" onClick={() => handleSort('createdAt-desc')} />
          <SortBtn label="Старые сначала"       icon="📅" onClick={() => handleSort('createdAt-asc')}  />
          <SortBtn label="Недавно изменённые"   icon="✏️" onClick={() => handleSort('updatedAt-desc')} />
          <div className="h-px bg-ink-10 mx-2 my-1" />
          <SortBtn label="По типу"              icon="📋" onClick={() => handleSort('type')}           />
        </div>
      )}
    </div>
  )
}

function SortBtn({ label, icon, onClick }: {
  label: string
  icon: string
  onClick: () => void
}) {
  return (
    <button
      className="w-full flex items-center gap-2.5 px-3 py-2
                 text-sm text-ink-60 hover:bg-ink-10 hover:text-ink
                 transition-colors duration-100 text-left"
      onClick={onClick}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}
