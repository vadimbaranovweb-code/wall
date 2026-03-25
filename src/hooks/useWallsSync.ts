import { useEffect, useState, useCallback } from 'react'
import { useWallsStore } from '@/stores/wallsStore'
import { useAuthStore }  from '@/stores/authStore'
import { fetchWalls, insertWall, patchWall, removeWall } from '@/api/walls.api'
import { localGetWalls, localSaveWalls } from '@/lib/localStore'
import type { Wall, WallColor } from '@/types'

export function useWallsSync() {
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const setWalls     = useWallsStore(s => s.setWalls)
  const _createLocal = useWallsStore(s => s.createWall)
  const _updateLocal = useWallsStore(s => s.updateWall)
  const _deleteLocal = useWallsStore(s => s.deleteWall)
  const isAnonymous  = useAuthStore(s => s.isAnonymous)

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const user = useAuthStore.getState().user
    const isAnon = !user || user.is_anonymous

    if (isAnon) {
      // Аноним — читаем из localStorage
      const walls = localGetWalls()
      if (!cancelled) {
        setWalls(walls)
        setLoading(false)
      }
    } else {
      // Авторизован — читаем из Supabase
      fetchWalls()
        .then(walls => { if (!cancelled) { setWalls(walls); setLoading(false) } })
        .catch(err  => { if (!cancelled) { setError(err.message); setLoading(false) } })
    }

    return () => { cancelled = true }
  }, [isAnonymous, setWalls])

  // ── Синк стора в localStorage для анонима ────────────────────────────────
  useEffect(() => {
    if (!isAnonymous) return
    const unsub = useWallsStore.subscribe(state => {
      localSaveWalls(state.walls)
    })
    return unsub
  }, [isAnonymous])

  // ── Synced actions ────────────────────────────────────────────────────────
  const createWall = useCallback(async (name: string, color: WallColor): Promise<Wall> => {
    const wall = _createLocal(name, color)

    if (!isAnonymous) {
      insertWall(wall).catch(console.error)
    }
    // Для анонима — useEffect выше сохранит через subscribe

    return wall
  }, [_createLocal, isAnonymous])

  const updateWall = useCallback(async (
    id: string,
    patch: Partial<Pick<Wall, 'name' | 'color'>>
  ): Promise<void> => {
    _updateLocal(id, patch)
    if (!isAnonymous) {
      patchWall(id, patch).catch(console.error)
    }
  }, [_updateLocal, isAnonymous])

  const deleteWall = useCallback(async (id: string): Promise<void> => {
    _deleteLocal(id)
    if (!isAnonymous) {
      removeWall(id).catch(console.error)
    }
  }, [_deleteLocal, isAnonymous])

  return { loading, error, createWall, updateWall, deleteWall }
}