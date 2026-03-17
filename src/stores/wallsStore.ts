import { create } from 'zustand'
import type { Wall, WallColor } from '@/types'
import { newId } from '@/lib/id'

interface WallsState {
  walls: Wall[]
  isLoaded: boolean  // true once Supabase has responded

  // Called by useWallsSync after fetching from Supabase
  setWalls:   (walls: Wall[]) => void

  // Local CRUD — called by useWallsSync which also fires the API call
  createWall: (name: string, color: WallColor) => Wall
  updateWall: (id: string, patch: Partial<Pick<Wall, 'name' | 'color'>>) => void
  deleteWall: (id: string) => void
  getWall:    (id: string) => Wall | undefined
}

export const useWallsStore = create<WallsState>()((set, get) => ({
  walls:    [],
  isLoaded: false,

  setWalls: (walls) => set({ walls, isLoaded: true }),

  createWall: (name, color) => {
    const wall: Wall = {
      id: newId(),
      name,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set(s => ({ walls: [...s.walls, wall] }))
    return wall
  },

  updateWall: (id, patch) =>
    set(s => ({
      walls: s.walls.map(w =>
        w.id === id ? { ...w, ...patch, updatedAt: Date.now() } : w
      ),
    })),

  deleteWall: (id) =>
    set(s => ({ walls: s.walls.filter(w => w.id !== id) })),

  getWall: (id) => get().walls.find(w => w.id === id),
}))
