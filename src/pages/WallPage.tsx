import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallsStore } from '@/stores/wallsStore'
import { useBoardStore } from '@/stores/boardStore'
import { useCardsStore } from '@/stores/cardsStore'
import { useCardsSync }  from '@/hooks/useCardsSync'
import { Board }         from '@/features/board/Board'
import { WallSidebar }   from '@/features/sidebar/WallSidebar'

export function WallPage() {
  const { wallId }  = useParams<{ wallId: string }>()
  const navigate    = useNavigate()
  const wall        = useWallsStore(s => s.getWall(wallId ?? ''))
  const resetCamera = useBoardStore(s => s.resetCamera)
  const selectCard  = useBoardStore(s => s.selectCard)

  const [sidebarOpen, setSidebarOpen] = useState(true)

  useCardsSync(wallId ?? '')

  useEffect(() => {
    resetCamera()
    selectCard(null)
  }, [wallId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return

      if (e.key === 'Escape') {
        selectCard(null)
        useBoardStore.getState().stopEditing()
      }
      if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        resetCamera()
      }
      if (e.key === '\\' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSidebarOpen(v => !v)
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
          <button
            className="text-sm text-ink-30 hover:text-ink underline"
            onClick={() => navigate('/')}
          >
            ← К списку стен
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <WallSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
      />
      <div className="flex-1 overflow-hidden">
        <Board wallId={wall.id} />
      </div>
    </div>
  )
}