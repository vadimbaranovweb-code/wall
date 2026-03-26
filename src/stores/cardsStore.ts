import { create } from 'zustand'
import type { Card, TextCard, ImageCard, LinkCard, VoiceCard } from '@/types'
import { newId } from '@/lib/id'

const MIN_CARD_WIDTH  = 120
const MIN_CARD_HEIGHT = 60

const DEFAULTS = {
  text:  { width: 240, height: 120 },
  image: { width: 280, height: 220 },
  link:  { width: 280, height: 160 },
  voice: { width: 240, height: 100 },
}

// ─── Safe Map helpers (typed to avoid TS2345) ────────────────────────────────
type DragMap   = Map<string, { x: number; y: number; zIndex: number }>
type ResizeMap = Map<string, { width: number; height: number }>

function safeDragMap(v: unknown): DragMap {
  return v instanceof Map ? (v as DragMap) : new Map()
}
function safeResizeMap(v: unknown): ResizeMap {
  return v instanceof Map ? (v as ResizeMap) : new Map()
}

// ─── Base card builder ────────────────────────────────────────────────────────
function makeBase(wallId: string, x: number, y: number, type: Card['type'], maxZ: number) {
  const d = DEFAULTS[type]
  return {
    id: newId(), wallId, type,
    x, y, width: d.width, height: d.height,
    zIndex: maxZ + 1,
    rotation: (Math.random() * 4 - 2),
    createdAt: Date.now(), updatedAt: Date.now(),
  }
}


// ─── YouTube ID extractor ─────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null
    const m = u.pathname.match(/\/(embed|shorts|v)\/([^/?]+)/)
    return m?.[2] ?? null
  } catch { return null }
}

// ─── Store interface ──────────────────────────────────────────────────────────
interface CardsState {
  cards: Card[]
  dragPositions:   Map<string, { x: number; y: number; zIndex: number }>
  resizePositions: Map<string, { width: number; height: number }>

  // Called by useCardsSync after fetching from Supabase
  setCards: (wallId: string, cards: Card[]) => void

  // Queries
  getCard:          (id: string) => Card | undefined
  getCardsForWall:  (wallId: string) => Card[]
  maxZIndex:        (wallId: string) => number

  // Creators — return the card so caller can persist it
  createTextCard:   (wallId: string, x: number, y: number, content?: string) => Card
  createImageCard:  (wallId: string, x: number, y: number, dataUrl: string, name: string, nw: number, nh: number) => Card
  createLinkCard:   (wallId: string, x: number, y: number, url: string) => Card
  createVoiceCard:  (wallId: string, x: number, y: number, audioDataUrl: string, duration: number, mime: string) => Card

  // Updates
  updateContent:    (id: string, content: string) => void
  updateColor:      (id: string, colorHex: string | null) => void
  updateLinkMeta:   (id: string, meta: Partial<Pick<LinkCard, 'title' | 'description' | 'ogImageUrl' | 'faviconUrl' | 'fetchState'>>) => void
  updateTranscript: (id: string, transcript: string) => void
  deleteCard:       (id: string) => void

  // Drag (live, not persisted)
  setDragPosition:  (id: string, x: number, y: number) => void
  commitDrag:       (id: string) => void
  cancelDrag:       (id: string) => void

  // Resize (live, not persisted)
  setResizePosition:(id: string, width: number, height: number) => void
  commitResize:     (id: string) => void
  cancelResize:     (id: string) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useCardsStore = create<CardsState>()((set, get) => ({
  cards:           [],
  dragPositions:   new Map(),
  resizePositions: new Map(),

  // Replace cards for a wall (called on load / refresh)
  setCards: (wallId, incoming) =>
    set(s => ({
      cards: [
        ...s.cards.filter(c => c.wallId !== wallId),
        ...incoming,
      ],
    })),

  getCard: (id) => get().cards.find(c => c.id === id),
  getCardsForWall: (wallId) => get().cards.filter(c => c.wallId === wallId),

  maxZIndex: (wallId) => {
    const cards = get().getCardsForWall(wallId)
    return cards.length === 0 ? 1000 : Math.max(...cards.map(c => c.zIndex))
  },

  // ── Creators ──────────────────────────────────────────────────────────────
  createTextCard: (wallId, x, y, content = '') => {
    const card: TextCard = {
      ...makeBase(wallId, x, y, 'text', get().maxZIndex(wallId)),
      type: 'text', content,
    }
    set(s => ({ cards: [...s.cards, card] }))
    return card
  },

  createImageCard: (wallId, x, y, dataUrl, originalName, naturalWidth, naturalHeight) => {
    const ratio = naturalHeight / naturalWidth
    const w = Math.min(naturalWidth, 300)
    const h = Math.round(w * ratio)
    const card: ImageCard = {
      ...makeBase(wallId, x, y, 'image', get().maxZIndex(wallId)),
      type: 'image', dataUrl, originalName, naturalWidth, naturalHeight,
      width: w, height: h,
      rotation: (Math.random() * 3 - 1.5),
    }
    set(s => ({ cards: [...s.cards, card] }))
    return card
  },

  createLinkCard: (wallId, x, y, url) => {
    const domain = (() => {
      try { return new URL(url).hostname.replace(/^www\./, '') }
      catch { return url }
    })()
    const ytId = extractYouTubeId(url)
    const card: LinkCard = {
      ...makeBase(wallId, x, y, 'link', get().maxZIndex(wallId)),
      type: 'link', url, domain,
      linkType:   ytId ? 'youtube' : 'website',
      videoId:    ytId ?? undefined,
      ogImageUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined,
      faviconUrl: ytId ? 'https://www.google.com/s2/favicons?domain=youtube.com&sz=32' : undefined,
      fetchState: ytId ? 'done' : 'idle',
    }
    set(s => ({ cards: [...s.cards, card] }))
    return card
  },

  createVoiceCard: (wallId, x, y, audioDataUrl, durationSeconds, mimeType) => {
    const card: VoiceCard = {
      ...makeBase(wallId, x, y, 'voice', get().maxZIndex(wallId)),
      type: 'voice', audioDataUrl, durationSeconds, mimeType,
      recordingState: 'recorded', rotation: 0,
    }
    set(s => ({ cards: [...s.cards, card] }))
    return card
  },

  // ── Updates ───────────────────────────────────────────────────────────────
  updateContent: (id, content) =>
    set(s => ({
      cards: s.cards.map(c =>
        c.id === id ? { ...c, content, updatedAt: Date.now() } : c
      ),
    })),
    updateColor: (id, colorHex) =>
      set(s => ({
        cards: s.cards.map(c =>
          c.id === id ? { ...c, colorHex: colorHex ?? undefined, updatedAt: Date.now() } : c
        ),
      })),

  updateLinkMeta: (id, meta) =>
    set(s => ({
      cards: s.cards.map(c =>
        c.id === id && c.type === 'link' ? { ...c, ...meta, updatedAt: Date.now() } : c
      ),
    })),

  updateTranscript: (id, transcript) =>
    set(s => ({
      cards: s.cards.map(c =>
        c.id === id && c.type === 'voice' ? { ...c, transcript, updatedAt: Date.now() } : c
      ),
    })),

  deleteCard: (id) =>
    set(s => ({ cards: s.cards.filter(c => c.id !== id) })),

  // ── Drag ──────────────────────────────────────────────────────────────────
  setDragPosition: (id, x, y) => {
    const card = get().getCard(id)
    if (!card) return
    set(s => {
      const map = new Map(safeDragMap(s.dragPositions))
      map.set(id, { x, y, zIndex: get().maxZIndex(card.wallId) + 1 })
      return { dragPositions: map }
    })
  },

  commitDrag: (id) => {
    const drag = safeDragMap(get().dragPositions).get(id)
    if (!drag) return
    set(s => {
      const cards = s.cards.map(c =>
        c.id === id ? { ...c, x: drag.x, y: drag.y, zIndex: drag.zIndex, updatedAt: Date.now() } : c
      )
      const map = new Map(safeDragMap(s.dragPositions))
      map.delete(id)
      return { cards, dragPositions: map }
    })
  },

  cancelDrag: (id) =>
    set(s => {
      const map = new Map(safeDragMap(s.dragPositions))
      map.delete(id)
      return { dragPositions: map }
    }),

  // ── Resize ────────────────────────────────────────────────────────────────
  setResizePosition: (id, width, height) => {
    const w = Math.max(MIN_CARD_WIDTH,  width)
    const h = Math.max(MIN_CARD_HEIGHT, height)
    set(s => {
      const map = new Map(safeResizeMap(s.resizePositions))
      map.set(id, { width: w, height: h })
      return { resizePositions: map }
    })
  },

  commitResize: (id) => {
    const resize = safeResizeMap(get().resizePositions).get(id)
    if (!resize) return
    set(s => {
      const cards = s.cards.map(c =>
        c.id === id ? { ...c, ...resize, updatedAt: Date.now() } : c
      )
      const map = new Map(safeResizeMap(s.resizePositions))
      map.delete(id)
      return { cards, resizePositions: map }
    })
  },

  cancelResize: (id) =>
    set(s => {
      const map = new Map(safeResizeMap(s.resizePositions))
      map.delete(id)
      return { resizePositions: map }
    }),
}))
