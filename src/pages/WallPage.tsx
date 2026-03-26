import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallsStore } from '@/stores/wallsStore'
import { useAuthStore }  from '@/stores/authStore'
import { useBoardStore } from '@/stores/boardStore'
import { useCardsSync }  from '@/hooks/useCardsSync'
import { useWallsSync }  from '@/hooks/useWallsSync'
import { Board }         from '@/features/board/Board'
import { AnonBanner }    from '@/components/AnonBanner'
import { GlobalSearch }  from '@/features/search/GlobalSearch'
import { WallSidebar }   from '@/features/sidebar/WallSidebar'

export function WallPage() {
  const { wallId }  = useParams<{ wallId: string }>()
  const navigate    = useNavigate()
  const wall        = useWallsStore(s => s.getWall(wallId ?? ''))
  const isLoaded    = useWallsStore(s => s.isLoaded)
  const authLoading = useAuthStore(s => s.loading)
  const resetCamera = useBoardStore(s => s.resetCamera)
  const selectCard  = useBoardStore(s => s.selectCard)

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchOpen,  setSearchOpen]  = useState(false)

  useWallsSync()
  useCardsSync(wallId ?? '')

  useEffect(() => {
    resetCamera()
    selectCard(null)
    if (wallId) localStorage.setItem('stena:lastWallId', wallId)
  }, [wallId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authLoading) return
    if (!isLoaded) return
    if (!wall) navigate('/', { replace: true })
  }, [authLoading, isLoaded, wall, navigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return

      if (e.key === 'Escape') {
        if (searchOpen) { setSearchOpen(false); return }
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
      if ((e.key === 'f' || e.key === 'k') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectCard, resetCamera, searchOpen])

  if (authLoading || !isLoaded || !wall) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-ink-10 border-t-ink-60
                        rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AnonBanner />
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <WallSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
        onSearchOpen={() => setSearchOpen(true)}
      />
      <div className="flex-1 overflow-hidden">
        <Board wallId={wall.id} />
      </div>
    </div>
  )
}