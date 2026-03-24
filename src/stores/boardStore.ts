import { create } from 'zustand'
import type { Camera } from '@/types'

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 }
const MIN_ZOOM = 0.2
const MAX_ZOOM = 3
const FIT_PADDING = 80 // px отступ от краёв при fit

interface BoardState {
  camera: Camera
  selectedCardId: string | null
  editingCardId:  string | null

  setCamera:   (c: Partial<Camera>) => void
  resetCamera: () => void
  zoomBy:      (delta: number, originX: number, originY: number) => void
  panBy:       (dx: number, dy: number) => void
  fitCards:    (cards: { x: number; y: number; width: number; height: number }[], viewportW: number, viewportH: number) => void

  selectCard:  (id: string | null) => void
  startEditing:(id: string) => void
  stopEditing: () => void

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

  fitCards: (cards, viewportW, viewportH) => {
    if (cards.length === 0) {
      set({ camera: DEFAULT_CAMERA })
      return
    }

    // Считаем bounding box всех карточек
    const minX = Math.min(...cards.map(c => c.x))
    const minY = Math.min(...cards.map(c => c.y))
    const maxX = Math.max(...cards.map(c => c.x + c.width))
    const maxY = Math.max(...cards.map(c => c.y + c.height))

    const contentW = maxX - minX
    const contentH = maxY - minY

    // Считаем zoom чтобы всё влезло
    const zoomX = (viewportW - FIT_PADDING * 2) / contentW
    const zoomY = (viewportH - FIT_PADDING * 2) / contentH
    const zoom  = Math.min(Math.min(zoomX, zoomY), 1) // не зумим больше 100%
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))

    // Центрируем
    const x = (viewportW - contentW * clampedZoom) / 2 - minX * clampedZoom
    const y = (viewportH - contentH * clampedZoom) / 2 - minY * clampedZoom

    set({ camera: { x, y, zoom: clampedZoom } })
  },

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