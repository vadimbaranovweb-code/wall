import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { WallListPage }  from '@/pages/WallListPage'
import { WallPage }      from '@/pages/WallPage'
import { LoginPage }     from '@/pages/LoginPage'
import { useAuthStore }  from '@/stores/authStore'
import { supabase }      from '@/lib/supabase'

export function App() {
  const { user, loading, setSession, setLoading } = useAuthStore()

  // Listen for auth state changes (login, logout, token refresh)
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Subscribe to future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [setSession, setLoading])

  // Show nothing while checking session (avoids flash of login page)
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

          {/* Protected */}
          <Route path="/" element={
            user ? <WallListPage /> : <Navigate to="/login" replace />
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
