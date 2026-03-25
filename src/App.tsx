import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { WallPage }      from '@/pages/WallPage'
import { useAuthStore }  from '@/stores/authStore'
import { useWallsStore } from '@/stores/wallsStore'
import { useWallsSync }  from '@/hooks/useWallsSync'
import { supabase }      from '@/lib/supabase'

function HomeRedirect() {
  const navigate   = useNavigate()
  const walls      = useWallsStore(s => s.walls)
  const isLoaded   = useWallsStore(s => s.isLoaded)
  const { createWall } = useWallsSync()

  useEffect(() => {
    if (!isLoaded) return
    if (walls.length > 0) {
      const last = [...walls].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      navigate(`/walls/${last.id}`, { replace: true })
    } else {
      createWall('Моя стена', 'teal').then(wall => {
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
    // Сначала проверяем есть ли сессия
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session)
        setLoading(false)
        return
      }

      // Нет сессии — пробуем анонимный вход
      try {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) throw error
        setSession(data.session)
      } catch (e) {
        console.error('Anonymous sign-in failed:', e)
        // Если анонимный вход не работает — просто снимаем loading
        // пользователь увидит пустой экран с возможностью войти
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

  // Нет юзера даже после анонимного входа — показываем логин
  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={
            <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
              <div className="w-full max-w-sm">
                <div className="flex items-center gap-3 justify-center mb-10">
                  <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center">
                    <span className="text-card font-bold text-lg">С</span>
                  </div>
                  <span className="font-semibold text-ink text-2xl tracking-tight">Стена</span>
                </div>
                <div className="bg-card border border-ink-10 rounded-2xl p-8 shadow-card text-center">
                  <p className="text-sm text-ink-60 mb-4">Не удалось загрузить приложение</p>
                  <button
                    className="px-4 py-2 rounded-xl bg-ink text-card text-sm font-medium"
                    onClick={() => window.location.reload()}
                  >
                    Попробовать снова
                  </button>
                </div>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
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