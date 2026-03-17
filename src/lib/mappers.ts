/**
 * Mappers between Supabase DB rows (snake_case) and app domain types (camelCase).
 * All DB ↔ app conversions go through here — nowhere else.
 */

import type { Wall, Card, WallColor } from '@/types'
import type { WallRow, CardRow } from '@/lib/supabase'

// ─── Wall ─────────────────────────────────────────────────────────────────────

export function wallFromRow(row: WallRow): Wall {
  return {
    id:        row.id,
    name:      row.name,
    color:     row.color as WallColor,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

export function wallToInsert(wall: Wall, userId: string) {
  return {
    id:         wall.id,
    user_id:    userId,
    name:       wall.name,
    color:      wall.color,
    sort_order: 1000,
  }
}

export function wallToPatch(patch: Partial<Pick<Wall, 'name' | 'color'>>) {
  return {
    ...(patch.name  !== undefined && { name:  patch.name }),
    ...(patch.color !== undefined && { color: patch.color }),
  }
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function cardFromRow(row: CardRow): Card {
  const base = {
    id:        row.id,
    wallId:    row.wall_id,
    type:      row.type as Card['type'],
    x:         row.x,
    y:         row.y,
    width:     row.width,
    height:    row.height,
    zIndex:    row.z_index,
    rotation:  row.rotation,
    colorHex:  row.color_hex ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }

  const c = row.content as Record<string, unknown>

  switch (row.type) {
    case 'text':
      return { ...base, type: 'text', content: (c.content as string) ?? '' }

    case 'image':
      return {
        ...base, type: 'image',
        dataUrl:       (c.dataUrl       as string) ?? '',
        originalName:  (c.originalName  as string) ?? '',
        naturalWidth:  (c.naturalWidth  as number) ?? 0,
        naturalHeight: (c.naturalHeight as number) ?? 0,
      }

    case 'link':
      return {
        ...base, type: 'link',
        url:         (c.url         as string) ?? '',
        domain:      (c.domain      as string) ?? '',
        fetchState:  (c.fetchState  as 'idle' | 'loading' | 'done' | 'error') ?? 'done',
        title:       c.title       as string | undefined,
        description: c.description as string | undefined,
        ogImageUrl:  c.ogImageUrl  as string | undefined,
        faviconUrl:  c.faviconUrl  as string | undefined,
      }

    case 'voice':
      return {
        ...base, type: 'voice',
        audioDataUrl:    (c.audioDataUrl    as string) ?? '',
        durationSeconds: (c.durationSeconds as number) ?? 0,
        mimeType:        (c.mimeType        as string) ?? 'audio/webm',
        recordingState:  'recorded' as const,
        transcript:      c.transcript as string | undefined,
      }

    default:
      // Fallback — treat unknown type as empty text card
      return { ...base, type: 'text', content: '' }
  }
}

export function cardToInsert(card: Card, userId: string) {
  return {
    id:        card.id,
    wall_id:   card.wallId,
    user_id:   userId,
    type:      card.type,
    x:         card.x,
    y:         card.y,
    width:     card.width,
    height:    card.height,
    z_index:   card.zIndex,
    rotation:  card.rotation,
    color_hex: card.colorHex ?? null,
    content:   cardContent(card),
  }
}

export function cardPositionPatch(card: Pick<Card, 'x' | 'y' | 'zIndex'>) {
  return { x: card.x, y: card.y, z_index: card.zIndex }
}

export function cardSizePatch(card: Pick<Card, 'width' | 'height'>) {
  return { width: card.width, height: card.height }
}

export function cardContentPatch(card: Card) {
  return { content: cardContent(card) }
}

// ─── Content extractor ────────────────────────────────────────────────────────

function cardContent(card: Card): Record<string, unknown> {
  switch (card.type) {
    case 'text':
      return { content: card.content }
    case 'image':
      return {
        dataUrl:       card.dataUrl,
        originalName:  card.originalName,
        naturalWidth:  card.naturalWidth,
        naturalHeight: card.naturalHeight,
      }
    case 'link':
      return {
        url:         card.url,
        domain:      card.domain,
        fetchState:  card.fetchState,
        title:       card.title,
        description: card.description,
        ogImageUrl:  card.ogImageUrl,
        faviconUrl:  card.faviconUrl,
      }
    case 'voice':
      return {
        audioDataUrl:    card.audioDataUrl,
        durationSeconds: card.durationSeconds,
        mimeType:        card.mimeType,
        transcript:      card.transcript,
      }
  }
}
