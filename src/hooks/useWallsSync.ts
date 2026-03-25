import { useEffect, useState, useCallback } from 'react'
import { useWallsStore } from '@/stores/wallsStore'
import { useAuthStore }  from '@/stores/authStore'
import { fetchWalls, insertWall, patchWall, removeWall } from '@/api/walls.api'
import { localGetWalls, localSaveWalls } from '@/lib/localStore'
import type { Wall, WallColor } from '@/types'

function getIsAnon(): boolean {
  const user = useAuthStore.getState().user
  return !user || (user.is_anonymous ?? false)
}

export function useWallsSync() {
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const setWalls      = useWallsStore(s => s.setWalls)
  const _createLocal  = useWallsStore(s => s.createWall)
  const _updateLocal  = useWallsStore(s => s.updateWall)
  const _deleteLocal  = useWallsStore(s => s.deleteWall)
  const authLoading   = useAuthStore(s => s.loading)

  // ── Initial load — ждём пока auth готов ───────────────────────────────────
  useEffect(() => {
    if (authLoading) return // ждём пока Supabase проверит сессию

    let cancelled = false
    setLoading(true)
    setError(null)

    const isAnon = getIsAnon()

    if (isAnon) {
      const walls = localGetWalls()
      if (!cancelled) {
        setWalls(walls)
        setLoading(false)
      }
    } else {
      fetchWalls()
        .then(walls => { if (!cancelled) { setWalls(walls); setLoading(false) } })
        .catch(err  => { if (!cancelled) { setError(err.message); setLoading(false) } })
    }

    return () => { cancelled = true }
  }, [authLoading, setWalls])

  // ── Синк стора в localStorage для анонима ────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!getIsAnon()) return

    const unsub = useWallsStore.subscribe(state => {
      localSaveWalls(state.walls)
    })
    return unsub
  }, [authLoading])

  // ── Synced actions ────────────────────────────────────────────────────────
  const createWall = useCallback(async (name: string, color: WallColor): Promise<Wall> => {
    const wall = _createLocal(name, color)
    if (!getIsAnon()) {
      insertWall(wall).catch(console.error)
    }
    return wall
  }, [_createLocal])

  const updateWall = useCallback(async (
    id: string,
    patch: Partial<Pick<Wall, 'name' | 'color'>>
  ): Promise<void> => {
    _updateLocal(id, patch)
    if (!getIsAnon()) {
      patchWall(id, patch).catch(console.error)
    }
  }, [_updateLocal])

  const deleteWall = useCallback(async (id: string): Promise<void> => {
    _deleteLocal(id)
    if (!getIsAnon()) {
      removeWall(id).catch(console.error)
    }
  }, [_deleteLocal])

  return { loading, error, createWall, updateWall, deleteWall }
}