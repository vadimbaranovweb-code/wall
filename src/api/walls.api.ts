import { supabase } from '@/lib/supabase'
import { wallFromRow, wallToInsert, wallToPatch } from '@/lib/mappers'
import type { Wall, WallColor } from '@/types'

async function getUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return user.id
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function fetchWalls(): Promise<Wall[]> {
  const { data, error } = await supabase
    .from('walls')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []).map(wallFromRow)
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function insertWall(wall: Wall): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase
    .from('walls')
    .insert(wallToInsert(wall, userId))

  if (error) throw error
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function patchWall(
  id: string,
  patch: Partial<Pick<Wall, 'name' | 'color'>>
): Promise<void> {
  const { error } = await supabase
    .from('walls')
    .update(wallToPatch(patch))
    .eq('id', id)

  if (error) throw error
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function removeWall(id: string): Promise<void> {
  const { error } = await supabase
    .from('walls')
    .delete()
    .eq('id', id)

  if (error) throw error
}
