import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success, Google redirects back — no need to handle here
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center">
            <span className="text-card font-bold text-lg">С</span>
          </div>
          <span className="font-semibold text-ink text-2xl tracking-tight">Стена</span>
        </div>

        {/* Card */}
        <div className="bg-card border border-ink-10 rounded-2xl p-8 shadow-card">
          <h1 className="text-xl font-semibold text-ink mb-2 text-center">
            Добро пожаловать
          </h1>
          <p className="text-sm text-ink-60 text-center mb-8">
            Визуальная доска для захвата идей
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3
                       px-4 py-3 rounded-xl border border-ink-10
                       bg-card hover:bg-canvas hover:border-ink-30
                       text-sm font-medium text-ink
                       transition-all duration-150 active:scale-98
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Spinner />
            ) : (
              <GoogleIcon />
            )}
            {loading ? 'Открываем Google...' : 'Войти через Google'}
          </button>

          {error && (
            <p className="mt-4 text-xs text-center text-red-500">{error}</p>
          )}

          <p className="mt-6 text-xs text-center text-ink-30 leading-relaxed">
            Входя, вы соглашаетесь с тем что это MVP
            и данные могут быть сброшены во время разработки
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"
              strokeDasharray="28 8" strokeLinecap="round" opacity="0.4"/>
    </svg>
  )
}
