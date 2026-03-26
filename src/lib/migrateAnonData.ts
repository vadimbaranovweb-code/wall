/**
 * Миграция данных анонимного пользователя в Supabase после авторизации.
 * Вызывается один раз при успешном логине.
 */

import { supabase } from '@/lib/supabase'
import { localGetWalls, localGetAllCards, localClear } from '@/lib/localStore'
import { wallToInsert, cardToInsert } from '@/lib/mappers'

export async function migrateAnonDataToSupabase(): Promise<{ walls: number; cards: number }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const walls = localGetWalls()
  const cards = localGetAllCards()

  if (walls.length === 0) {
    localClear()
    return { walls: 0, cards: 0 }
  }

  // Вставляем стены
  for (const wall of walls) {
    const { error } = await supabase
      .from('walls')
      .insert(wallToInsert(wall, user.id))

    if (error) {
      // Если стена уже существует — пропускаем
      if (!error.message.includes('duplicate')) {
        console.error('Wall insert error:', error)
      }
    }
  }

  // Вставляем карточки
  for (const card of cards) {
    const { error } = await supabase
      .from('cards')
      .insert(cardToInsert(card, user.id))

    if (error) {
      if (!error.message.includes('duplicate')) {
        console.error('Card insert error:', error)
      }
    }
  }

  // Очищаем localStorage после успешной миграции
  localClear()

  return { walls: walls.length, cards: cards.length }
}