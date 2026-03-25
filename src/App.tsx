import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { WallPage }      from '@/pages/WallPage'
import { LoginPage }     from '@/pages/LoginPage'
import { useAuthStore }  from '@/stores/authStore'
import { useWallsStore } from '@/stores/wallsStore'
import { useWallsSync }  from '@/hooks/useWallsSync'
import { supabase }      from '@/lib/supabase'

// Редирект на последнюю стену или создаём дефолтную
function HomeRedirect() {
  const navigate   = useNavigate()
  const walls      = useWallsStore(s => s.walls)
  const isLoaded   = useWallsStore(s => s.isLoaded)
  const { createWall } = useWallsSync()

  useEffect(() => {
    if (!isLoaded) return

    if (walls.length > 0) {
      // Открываем последнюю по updatedAt
      const last = [...walls].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      navigate(`/walls/${last.id}`, { replace: true })
    } else {
      // Создаём дефолтную стену
      createWall('Моя стена', 'teal').then(wall => {
        navigate(`/walls/${wall.id}`, { replace: true })
      })
    }
  }, [isLoaded, walls.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Показываем спиннер пока грузятся стены
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
  }, [setSession, setLoading])

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
          {/* Public */}
          <Route path="/login" element={
            user ? <Navigate to="/" replace /> : <LoginPage />
          } />

          {/* Protected — главная сразу редиректит на стену */}
          <Route path="/" element={
            user ? <HomeRedirect /> : <Navigate to="/login" replace />
          } />

          <Route path="/walls/:wallId" element={
            user
              ? <ErrorBoundary><WallPage /></ErrorBoundary>
              : <Navigate to="/login" replace />
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}