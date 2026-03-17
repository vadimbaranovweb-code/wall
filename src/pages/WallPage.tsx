import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useWallsStore } from '@/stores/wallsStore'
import { useBoardStore } from '@/stores/boardStore'
import { useCardsStore } from '@/stores/cardsStore'
import { useCardsSync }  from '@/hooks/useCardsSync'
import { Board } from '@/features/board/Board'
import type { WallColor } from '@/types'

const colorBg: Record<WallColor, string> = {
  teal:   '#2DD4BF',
  amber:  '#F59E0B',
  violet: '#8B5CF6',
  rose:   '#F43F5E',
  sky:    '#0EA5E9',
  lime:   '#84CC16',
}

export function WallPage() {
  const { wallId } = useParams<{ wallId: string }>()
  const navigate   = useNavigate()
  const wall       = useWallsStore(s => s.getWall(wallId ?? ''))
  const cardCount  = useCardsStore(s => s.cards.filter(c => c.wallId === (wallId ?? '')).length)
  const resetCamera = useBoardStore(s => s.resetCamera)
  const selectCard  = useBoardStore(s => s.selectCard)

  // Load cards from Supabase and set up autosave
  const { loading: cardsLoading } = useCardsSync(wallId ?? '')

  // Reset board state when navigating to a new wall
  useEffect(() => {
    resetCamera()
    selectCard(null)
  }, [wallId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Global keyboard shortcuts for the wall
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return

      // Escape = deselect
      if (e.key === 'Escape') {
        selectCard(null)
        useBoardStore.getState().stopEditing()
      }

      // 0 = reset camera
      if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        resetCamera()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectCard, resetCamera])

  if (!wall) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-60 text-lg font-medium mb-2">Стена не найдена</p>
          <Link to="/" className="text-sm text-ink-30 hover:text-ink underline">
            ← К списку стен
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-4 py-2.5 border-b border-ink-10 bg-card
                   flex-shrink-0 h-12"
      >
        {/* Back */}
        <Link
          to="/"
          className="w-7 h-7 rounded-lg flex items-center justify-center
                     text-ink-30 hover:text-ink hover:bg-ink-10
                     transition-colors text-lg"
          title="Все стены"
        >
          ‹
        </Link>

        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: colorBg[wall.color] }}
        />

        {/* Wall name */}
        <h1 className="font-semibold text-ink text-sm flex-1 truncate">
          {wall.name}
        </h1>

        {/* Card count */}
        <span className="text-xs text-ink-30 font-mono flex-shrink-0">
          {cardCount} карт.
        </span>

        {/* Hint */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-ink-30 flex-shrink-0">
          <span><kbd className="px-1 py-0.5 rounded bg-ink-10 font-mono">N</kbd> новая</span>
          <span><kbd className="px-1 py-0.5 rounded bg-ink-10 font-mono">Dbl</kbd> создать</span>
          <span><kbd className="px-1 py-0.5 rounded bg-ink-10 font-mono">Del</kbd> удалить</span>
        </div>
      </header>

      {/* ── Board ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <Board wallId={wall.id} />
      </div>
    </div>
  )
}
