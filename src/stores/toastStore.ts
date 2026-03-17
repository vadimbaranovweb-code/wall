import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, type?: Toast['type']) => void
  dismiss: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (message, type = 'success') => {
    const id = String(++counter)
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    // Auto-dismiss after 3 s
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, 3000)
  },

  dismiss: (id) =>
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
