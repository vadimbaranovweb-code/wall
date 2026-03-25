import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { WallPage }      from '@/pages/WallPage'
import { useAuthStore }  from '@/stores/authStore'
import { useWallsStore } from '@/stores/wallsStore'
import { useWallsSync }  from '@/hooks/useWallsSync'
import { supabase }      from '@/lib/supabase'

function HomeRedirect() {
  const navigate       = useNavigate()
  const walls          = useWallsStore(s => s.walls)
  const isLoaded       = useWallsStore(s => s.isLoaded)
  const { createWall } = useWallsSync()

  useEffect(() => {
    if (!isLoaded) return

    const savedWallId = localStorage.getItem('stena:lastWallId')
    const savedWall   = savedWallId ? walls.find(w => w.id === savedWallId) : null

    if (savedWall) {
      navigate(`/walls/${savedWall.id}`, { replace: true })
    } else if (walls.length > 0) {
      const last = [...walls].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      navigate(`/walls/${last.id}`, { replace: true })
    } else {
      createWall('Моя стена', 'teal').then(wall => {
        localStorage.setItem('stena:lastWallId', wall.id)
        navigate(`/walls/${wall.id}`, { replace: true })
      })
    }
  }, [isLoaded, walls.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-ink-10 border-t-ink-60
                      rounded-full animate-spin" />
    </div>
  )
}

export function App() {
  const { user, loading, setSession, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-ink-10 border-t-ink-60
                        rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/walls/:wallId" element={
            <ErrorBoundary><WallPage /></ErrorBoundary>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}