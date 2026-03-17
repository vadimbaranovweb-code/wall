import { create } from 'zustand'
import type { Camera } from '@/types'

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 }
const MIN_ZOOM = 0.2
const MAX_ZOOM = 3

interface BoardState {
  camera: Camera
  selectedCardId: string | null
  editingCardId:  string | null

  // Camera
  setCamera:   (c: Partial<Camera>) => void
  resetCamera: () => void
  zoomBy:      (delta: number, originX: number, originY: number) => void
  panBy:       (dx: number, dy: number) => void

  // Selection
  selectCard:  (id: string | null) => void
  startEditing:(id: string) => void
  stopEditing: () => void

  // Coord helpers
  screenToCanvas: (sx: number, sy: number) => { x: number; y: number }
}

export const useBoardStore = create<BoardState>((set, get) => ({
  camera:          DEFAULT_CAMERA,
  selectedCardId:  null,
  editingCardId:   null,

  setCamera: (c) =>
    set(s => ({ camera: { ...s.camera, ...c } })),

  resetCamera: () =>
    set({ camera: DEFAULT_CAMERA }),

  zoomBy: (delta, originX, originY) => {
    const { camera } = get()
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * delta))
    // Zoom toward the cursor point
    set({
      camera: {
        zoom: newZoom,
        x: originX - (originX - camera.x) * (newZoom / camera.zoom),
        y: originY - (originY - camera.y) * (newZoom / camera.zoom),
      },
    })
  },

  panBy: (dx, dy) =>
    set(s => ({ camera: { ...s.camera, x: s.camera.x + dx, y: s.camera.y + dy } })),

  selectCard:   (id) => set({ selectedCardId: id }),
  startEditing: (id) => set({ editingCardId: id, selectedCardId: id }),
  stopEditing:  ()   => set({ editingCardId: null }),

  screenToCanvas: (sx, sy) => {
    const { camera } = get()
    return {
      x: (sx - camera.x) / camera.zoom,
      y: (sy - camera.y) / camera.zoom,
    }
  },
}))
