import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user:        User | null
  session:     Session | null
  loading:     boolean
  isAnonymous: boolean

  setSession:   (session: Session | null) => void
  setLoading:   (v: boolean) => void
  setAnonymous: (v: boolean) => void
  signOut:      () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user:        null,
  session:     null,
  loading:     true,
  isAnonymous: true, // По умолчанию аноним пока не проверили сессию

  setSession: (session) => set({
    session,
    user:        session?.user ?? null,
    isAnonymous: !session?.user || (session?.user?.is_anonymous ?? false),
  }),

  setLoading:   (loading)     => set({ loading }),
  setAnonymous: (isAnonymous) => set({ isAnonymous }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, isAnonymous: true })
  },
}))