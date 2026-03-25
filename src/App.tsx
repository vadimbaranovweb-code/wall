import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { WallPage }      from '@/pages/WallPage'
import { useAuthStore }  from '@/stores/authStore'
import { useWallsStore } from '@/stores/wallsStore'
import { useWallsSync }  from '@/hooks/useWallsSync'
import { supabase }      from '@/lib/supabase'

const LAST_WALL_KEY = 'stena:lastWallId'

function HomeRedirect() {
  const navigate   = useNavigate()
  const walls      = useWallsStore(s => s.walls)
  const isLoaded   = useWallsStore(s => s.isLoaded)
  const { createWall } = useWallsSync()

  useEffect(() => {
    if (!isLoaded) return

    // Проверяем сохранённый wallId
    const savedWallId = localStorage.getItem(LAST_WALL_KEY)
    const savedWall   = savedWallId ? walls.find(w => w.id === savedWallId) : null

    if (savedWall) {
      // Есть сохранённая стена — открываем её
      navigate(`/walls/${savedWall.id}`, { replace: true })
    } else if (walls.length > 0) {
      // Нет сохранённой но есть другие — открываем последнюю
      const last = [...walls].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      navigate(`/walls/${last.id}`, { replace: true })
    } else {
      // Нет стен — создаём дефолтную
      createWall('Моя стена', 'teal').then(wall => {
        localStorage.setItem(LAST_WALL_KEY, wall.id)
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session)
        setLoading(false)
        return
      }

      // Нет сессии — создаём анонимную
      try {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) throw error
        setSession(data.session)
      } catch (e) {
        console.error('Anonymous sign-in failed:', e)
      } finally {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
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

  if (!user) {
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