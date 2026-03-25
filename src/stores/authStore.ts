import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user:        User | null
  session:     Session | null
  loading:     boolean
  isAnonymous: boolean

  setSession:  (session: Session | null) => void
  setLoading:  (v: boolean) => void
  signOut:     () => Promise<void>
  signInAnonymously: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:        null,
  session:     null,
  loading:     true,
  isAnonymous: false,

  setSession: (session) => set({
    session,
    user: session?.user ?? null,
    isAnonymous: session?.user?.is_anonymous ?? false,
  }),

  setLoading: (loading) => set({ loading }),

  signInAnonymously: async () => {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    set({
      session:     data.session,
      user:        data.user,
      isAnonymous: true,
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, isAnonymous: false })
  },
}))