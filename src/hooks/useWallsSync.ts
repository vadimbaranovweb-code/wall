import { useEffect, useState, useCallback, useRef } from 'react'
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
  const didLoad = useRef(false)

  const setWalls     = useWallsStore(s => s.setWalls)
  const _createLocal = useWallsStore(s => s.createWall)
  const _updateLocal = useWallsStore(s => s.updateWall)
  const _deleteLocal = useWallsStore(s => s.deleteWall)
  const authLoading  = useAuthStore(s => s.loading)

  const doLoad = useCallback(() => {
    if (didLoad.current) return
    didLoad.current = true

    const isAnon = getIsAnon()

    if (isAnon) {
      const walls = localGetWalls()
      setWalls(walls)
      setLoading(false)
    } else {
      fetchWalls()
        .then(walls => { setWalls(walls); setLoading(false) })
        .catch(err  => { setError(err.message); setLoading(false) })
    }
  }, [setWalls])

  // Загружаем когда auth готов
  useEffect(() => {
    if (authLoading) return
    doLoad()
  }, [authLoading, doLoad])

  // Таймаут — если auth завис, грузим через 3 секунды
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!didLoad.current) doLoad()
    }, 3000)
    return () => clearTimeout(timer)
  }, [doLoad])

  // Синк в localStorage для анонима
  useEffect(() => {
    if (authLoading) return
    if (!getIsAnon()) return
    const unsub = useWallsStore.subscribe(state => {
      localSaveWalls(state.walls)
    })
    return unsub
  }, [authLoading])

  const createWall = useCallback(async (name: string, color: WallColor): Promise<Wall> => {
    const wall = _createLocal(name, color)
    if (!getIsAnon()) insertWall(wall).catch(console.error)
    return wall
  }, [_createLocal])

  const updateWall = useCallback(async (
    id: string,
    patch: Partial<Pick<Wall, 'name' | 'color'>>
  ): Promise<void> => {
    _updateLocal(id, patch)
    if (!getIsAnon()) patchWall(id, patch).catch(console.error)
  }, [_updateLocal])

  const deleteWall = useCallback(async (id: string): Promise<void> => {
    _deleteLocal(id)
    if (!getIsAnon()) removeWall(id).catch(console.error)
  }, [_deleteLocal])

  return { loading, error, createWall, updateWall, deleteWall }
}
