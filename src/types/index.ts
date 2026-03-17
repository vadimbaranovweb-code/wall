// ─── Card ────────────────────────────────────────────────────────────────────

export type CardType = 'text' | 'image' | 'link' | 'voice'

export interface CardPosition {
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  rotation: number
}

export interface CardBase extends CardPosition {
  id: string
  wallId: string
  type: CardType
  colorHex?: string
  createdAt: number
  updatedAt: number
}

// ── text ──────────────────────────────────────────────────────────────────────
export interface TextCard extends CardBase {
  type: 'text'
  content: string
}

// ── image ─────────────────────────────────────────────────────────────────────
// dataUrl: base64 preview stored locally (MVP — no cloud storage yet)
// originalName: shown in card footer
export interface ImageCard extends CardBase {
  type: 'image'
  dataUrl: string        // base64, max ~800px, quality 0.75
  originalName: string
  naturalWidth: number
  naturalHeight: number
}

// ── link ──────────────────────────────────────────────────────────────────────
// Meta is fetched client-side via a CORS proxy (allorigins.win in MVP)
// and stored on the card so it survives offline
export interface LinkCard extends CardBase {
  type: 'link'
  url: string
  linkType: 'website' | 'youtube'  // detected on create
  videoId?: string                  // YouTube only
  title?: string
  description?: string
  ogImageUrl?: string
  faviconUrl?: string
  domain: string
  fetchState: 'idle' | 'loading' | 'done' | 'error'
}

// ── voice ─────────────────────────────────────────────────────────────────────
// audioDataUrl: base64 webm/opus (or mp4 on Safari), stored locally for MVP
// transcript: optional, filled later by Whisper or Web Speech API
export interface VoiceCard extends CardBase {
  type: 'voice'
  audioDataUrl: string   // base64 audio blob
  durationSeconds: number
  mimeType: string       // 'audio/webm;codecs=opus' | 'audio/mp4'
  transcript?: string
  recordingState: 'idle' | 'recorded'
}

// ── union ─────────────────────────────────────────────────────────────────────
export type Card = TextCard | ImageCard | LinkCard | VoiceCard

// ── type guards ───────────────────────────────────────────────────────────────
export const isTextCard  = (c: Card): c is TextCard  => c.type === 'text'
export const isImageCard = (c: Card): c is ImageCard => c.type === 'image'
export const isLinkCard  = (c: Card): c is LinkCard  => c.type === 'link'
export const isVoiceCard = (c: Card): c is VoiceCard => c.type === 'voice'

// ─── Wall ────────────────────────────────────────────────────────────────────

export type WallColor = 'teal' | 'amber' | 'violet' | 'rose' | 'sky' | 'lime'

export interface Wall {
  id: string
  name: string
  color: WallColor
  createdAt: number
  updatedAt: number
}

// ─── Board ───────────────────────────────────────────────────────────────────

export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface DragState {
  cardId: string
  startScreenX: number
  startScreenY: number
  startCardX: number
  startCardY: number
}

export interface ResizeState {
  cardId: string
  startScreenX: number
  startScreenY: number
  startWidth: number
  startHeight: number
}
