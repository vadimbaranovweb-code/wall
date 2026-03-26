import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { localHasData } from '@/lib/localStore'

export function AnonBanner() {
  const isAnonymous = useAuthStore(s => s.isAnonymous)
  const [dismissed, setDismissed] = useState(false)
  const [loading,   setLoading]   = useState(false)

  if (!isAnonymous || dismissed) return null

  const hasData = localHasData()

  const handleLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]
                    bg-ink text-card px-4 py-2.5
                    flex items-center justify-center gap-4">
      <p className="text-sm">
        {hasData
          ? '⚡ Войдите — ваши заметки перенесутся в аккаунт автоматически.'
          : '⚡ Ваши заметки хранятся 3 дня. Войдите чтобы сохранить навсегда.'
        }
      </p>
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                   bg-card text-ink text-xs font-medium
                   hover:opacity-90 active:scale-95 transition-all
                   disabled:opacity-50"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? 'Открываем...' : 'Войти через Google'}
      </button>
      <button
        className="text-card/40 hover:text-card transition-colors text-lg leading-none"
        onClick={() => setDismissed(true)}
        title="Закрыть"
      >
        ×
      </button>
    </div>
  )
}