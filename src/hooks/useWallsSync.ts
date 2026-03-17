/**
 * useWallsSync
 *
 * Loads walls from Supabase on mount and keeps the Zustand store in sync.
 * Also wraps CRUD operations so every action writes to both Supabase and the store.
 *
 * Usage: call once at the top of WallListPage.
 */

import { useEffect, useState, useCallback } from 'react'
import { useWallsStore } from '@/stores/wallsStore'
import { fetchWalls, insertWall, patchWall, removeWall } from '@/api/walls.api'
import type { Wall, WallColor } from '@/types'

export function useWallsSync() {
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const setWalls     = useWallsStore(s => s.setWalls)
  const _createLocal = useWallsStore(s => s.createWall)
  const _updateLocal = useWallsStore(s => s.updateWall)
  const _deleteLocal = useWallsStore(s => s.deleteWall)

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchWalls()
      .then(walls => { if (!cancelled) { setWalls(walls); setLoading(false) } })
      .catch(err  => { if (!cancelled) { setError(err.message); setLoading(false) } })

    return () => { cancelled = true }
  }, [setWalls])

  // ── Synced actions ────────────────────────────────────────────────────────
  const createWall = useCallback(async (name: string, color: WallColor): Promise<Wall> => {
    // 1. Write to local store immediately (optimistic)
    const wall = _createLocal(name, color)
    // 2. Persist to Supabase in background
    insertWall(wall).catch(console.error)
    return wall
  }, [_createLocal])

  const updateWall = useCallback(async (
    id: string,
    patch: Partial<Pick<Wall, 'name' | 'color'>>
  ): Promise<void> => {
    _updateLocal(id, patch)
    patchWall(id, patch).catch(console.error)
  }, [_updateLocal])

  const deleteWall = useCallback(async (id: string): Promise<void> => {
    _deleteLocal(id)
    removeWall(id).catch(console.error)
  }, [_deleteLocal])

  return { loading, error, createWall, updateWall, deleteWall }
}
