import { create } from 'zustand'
import type { Camera } from '@/types'

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 }
const MIN_ZOOM = 0.2
const MAX_ZOOM = 3
const FIT_PADDING = 80

interface BoardState {
  camera:          Camera
  selectedCardId:  string | null
  selectedCardIds: string[]        // мультиселект
  editingCardId:   string | null

  // Camera
  setCamera:   (c: Partial<Camera>) => void
  resetCamera: () => void
  zoomBy:      (delta: number, originX: number, originY: number) => void
  panBy:       (dx: number, dy: number) => void
  fitCards:    (cards: { x: number; y: number; width: number; height: number }[], viewportW: number, viewportH: number) => void

  // Selection
  selectCard:       (id: string | null) => void
  toggleSelectCard: (id: string) => void      // shift+click
  selectCards:      (ids: string[]) => void   // drag selection
  clearSelection:   () => void
  startEditing:     (id: string) => void
  stopEditing:      () => void

  // Coord helpers
  screenToCanvas: (sx: number, sy: number) => { x: number; y: number }
}

export const useBoardStore = create<BoardState>((set, get) => ({
  camera:          DEFAULT_CAMERA,
  selectedCardId:  null,
  selectedCardIds: [],
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
    const minX = Math.min(...cards.map(c => c.x))
    const minY = Math.min(...cards.map(c => c.y))
    const maxX = Math.max(...cards.map(c => c.x + c.width))
    const maxY = Math.max(...cards.map(c => c.y + c.height))
    const contentW = maxX - minX
    const contentH = maxY - minY
    const zoomX = (viewportW - FIT_PADDING * 2) / contentW
    const zoomY = (viewportH - FIT_PADDING * 2) / contentH
    const zoom  = Math.min(Math.min(zoomX, zoomY), 1)
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    const x = (viewportW - contentW * clampedZoom) / 2 - minX * clampedZoom
    const y = (viewportH - contentH * clampedZoom) / 2 - minY * clampedZoom
    set({ camera: { x, y, zoom: clampedZoom } })
  },

  selectCard: (id) => set({
    selectedCardId:  id,
    selectedCardIds: id ? [id] : [],
  }),

  toggleSelectCard: (id) => set(s => {
    const ids = s.selectedCardIds
    const already = ids.includes(id)
    const newIds = already ? ids.filter(i => i !== id) : [...ids, id]
    return {
      selectedCardIds: newIds,
      selectedCardId:  newIds[newIds.length - 1] ?? null,
    }
  }),

  selectCards: (ids) => set({
    selectedCardIds: ids,
    selectedCardId:  ids[ids.length - 1] ?? null,
  }),

  clearSelection: () => set({
    selectedCardId:  null,
    selectedCardIds: [],
  }),

  startEditing: (id) => set({
    editingCardId:   id,
    selectedCardId:  id,
    selectedCardIds: [id],
  }),

  stopEditing: () => set({ editingCardId: null }),

  screenToCanvas: (sx, sy) => {
    const { camera } = get()
    return {
      x: (sx - camera.x) / camera.zoom,
      y: (sy - camera.y) / camera.zoom,
    }
  },
}))