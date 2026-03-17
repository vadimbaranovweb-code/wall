import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user:        User | null
  session:     Session | null
  loading:     boolean   // true while checking initial session

  setSession:  (session: Session | null) => void
  setLoading:  (v: boolean) => void
  signOut:     () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  session: null,
  loading: true,

  setSession: (session) => set({
    session,
    user: session?.user ?? null,
  }),

  setLoading: (loading) => set({ loading }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
