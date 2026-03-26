/**
 * Миграция данных анонимного пользователя в Supabase после авторизации.
 * Вызывается один раз при успешном логине.
 */

import { supabase } from '@/lib/supabase'
import { localGetWalls, localGetAllCards, localClear } from '@/lib/localStore'
import { wallToInsert, cardToInsert } from '@/lib/mappers'
import { newId } from '@/lib/id'
import type { Wall } from '@/types'

export async function migrateAnonDataToSupabase(): Promise<{ walls: number; cards: number }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const anonWalls = localGetWalls()
  const anonCards = localGetAllCards()

  if (anonWalls.length === 0) {
    localClear()
    return { walls: 0, cards: 0 }
  }

  // Проверяем есть ли уже стены в аккаунте
  const { data: existingWalls } = await supabase
    .from('walls')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  const hasExistingWalls = existingWalls && existingWalls.length > 0

  if (hasExistingWalls) {
    // Аккаунт не пустой — создаём одну стену "Новые" и кладём туда все карточки
    const newWall: Wall = {
      id:        newId(),
      name:      'Новые',
      color:     'amber',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await supabase.from('walls').insert(wallToInsert(newWall, user.id))

    // Все карточки из всех анонимных стен → в одну стену "Новые"
    for (const card of anonCards) {
      const { error } = await supabase
        .from('cards')
        .insert(cardToInsert({ ...card, wallId: newWall.id }, user.id))

      if (error) console.error('Card insert error:', error)
    }
  } else {
    // Аккаунт пустой — вставляем все стены и карточки как есть
    for (const wall of anonWalls) {
      await supabase.from('walls').insert(wallToInsert(wall, user.id))
    }

    for (const card of anonCards) {
      const { error } = await supabase
        .from('cards')
        .insert(cardToInsert(card, user.id))

      if (error) console.error('Card insert error:', error)
    }
  }

  localClear()
  return { walls: anonWalls.length, cards: anonCards.length }
}