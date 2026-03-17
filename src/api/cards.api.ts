import { supabase } from '@/lib/supabase'
import {
  cardFromRow, cardToInsert,
  cardPositionPatch, cardSizePatch, cardContentPatch,
} from '@/lib/mappers'
import type { Card } from '@/types'

async function getUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return user.id
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function fetchCards(wallId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('wall_id', wallId)
    .order('z_index', { ascending: true })

  if (error) throw error
  return (data ?? []).map(cardFromRow)
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function insertCard(card: Card): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('cards')
    .insert(cardToInsert(card, userId))

  if (error) throw error
}

// ─── Position update (called on drag end, debounced) ─────────────────────────

export async function patchCardPosition(
  id: string,
  x: number, y: number, zIndex: number
): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update(cardPositionPatch({ x, y, zIndex }))
    .eq('id', id)

  if (error) throw error
}

// ─── Size update (called on resize end, debounced) ────────────────────────────

export async function patchCardSize(
  id: string,
  width: number, height: number
): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update(cardSizePatch({ width, height }))
    .eq('id', id)

  if (error) throw error
}

// ─── Content update (text edits, link meta, transcript) ──────────────────────

export async function patchCardContent(card: Card): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update(cardContentPatch(card))
    .eq('id', card.id)

  if (error) throw error
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function removeCard(id: string): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id)

  if (error) throw error
}
