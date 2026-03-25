/**
 * Local storage для анонимных пользователей.
 * Хранит стены и карточки локально, мигрирует в Supabase при авторизации.
 */

import type { Wall, Card } from '@/types'

const WALLS_KEY    = 'stena:anon:walls'
const CARDS_KEY    = 'stena:anon:cards'
const EXPIRES_KEY  = 'stena:anon:expires'
const TTL_MS       = 3 * 24 * 60 * 60 * 1000 // 3 дня

// ─── Проверка срока хранения ──────────────────────────────────────────────────

function isExpired(): boolean {
  const expires = localStorage.getItem(EXPIRES_KEY)
  if (!expires) return false
  return Date.now() > parseInt(expires)
}

function refreshExpiry() {
  localStorage.setItem(EXPIRES_KEY, String(Date.now() + TTL_MS))
}

function clearIfExpired() {
  if (isExpired()) {
    localStorage.removeItem(WALLS_KEY)
    localStorage.removeItem(CARDS_KEY)
    localStorage.removeItem(EXPIRES_KEY)
  }
}

// ─── Walls ────────────────────────────────────────────────────────────────────

export function localGetWalls(): Wall[] {
  clearIfExpired()
  try {
    const raw = localStorage.getItem(WALLS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function localSaveWalls(walls: Wall[]) {
  refreshExpiry()
  localStorage.setItem(WALLS_KEY, JSON.stringify(walls))
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export function localGetCards(wallId: string): Card[] {
  clearIfExpired()
  try {
    const raw = localStorage.getItem(CARDS_KEY)
    const all: Card[] = raw ? JSON.parse(raw) : []
    return all.filter(c => c.wallId === wallId)
  } catch { return [] }
}

export function localSaveCard(card: Card) {
  refreshExpiry()
  try {
    const raw  = localStorage.getItem(CARDS_KEY)
    const all: Card[] = raw ? JSON.parse(raw) : []
    const idx  = all.findIndex(c => c.id === card.id)
    if (idx >= 0) all[idx] = card
    else all.push(card)
    localStorage.setItem(CARDS_KEY, JSON.stringify(all))
  } catch {}
}

export function localDeleteCard(id: string) {
  try {
    const raw  = localStorage.getItem(CARDS_KEY)
    const all: Card[] = raw ? JSON.parse(raw) : []
    localStorage.setItem(CARDS_KEY, JSON.stringify(all.filter(c => c.id !== id)))
  } catch {}
}

export function localGetAllCards(): Card[] {
  try {
    const raw = localStorage.getItem(CARDS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

// ─── Миграция в Supabase ──────────────────────────────────────────────────────

export function localHasData(): boolean {
  const walls = localGetWalls()
  return walls.length > 0
}

export function localClear() {
  localStorage.removeItem(WALLS_KEY)
  localStorage.removeItem(CARDS_KEY)
  localStorage.removeItem(EXPIRES_KEY)
}