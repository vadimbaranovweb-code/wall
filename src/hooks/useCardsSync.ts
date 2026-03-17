import { useEffect, useState, useCallback, useRef } from 'react'
import { useCardsStore } from '@/stores/cardsStore'
import {
  fetchCards, insertCard,
  patchCardPosition, patchCardSize, patchCardContent,
  removeCard,
} from '@/api/cards.api'
import type { Card } from '@/types'

const POSITION_DEBOUNCE_MS = 600
const CONTENT_DEBOUNCE_MS  = 1000

function makeDebouncer() {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  return function debounce(key: string, ms: number, fn: () => void) {
    const prev = timers.get(key)
    if (prev) clearTimeout(prev)
    timers.set(key, setTimeout(() => { timers.delete(key); fn() }, ms))
  }
}

export function useCardsSync(wallId: string) {
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const setCards     = useCardsStore(s => s.setCards)
  const _deleteLocal = useCardsStore(s => s.deleteCard)
  const debounce     = useRef(makeDebouncer()).current

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchCards(wallId)
      .then(cards => { if (!cancelled) { setCards(wallId, cards); setLoading(false) } })
      .catch(err  => { if (!cancelled) { setError(err.message);   setLoading(false) } })

    return () => { cancelled = true }
  }, [wallId, setCards])

  // ── Autosave: subscribe to store changes ──────────────────────────────────
  useEffect(() => {
    // Snapshot of card IDs that are already in Supabase
    // Initially populated from the loaded cards
    const persistedIds = new Set<string>()
    let prevCards: Record<string, Card> = {}
    let initialised = false

    const unsub = useCardsStore.subscribe(state => {
      const wallCards = state.cards.filter(c => c.wallId === wallId)

      // First run after load — populate snapshot, don't save anything
      if (!initialised) {
        wallCards.forEach(c => {
          prevCards[c.id] = c
          persistedIds.add(c.id)
        })
        initialised = true
        return
      }

      for (const card of wallCards) {
        const prev = prevCards[card.id]

        if (!prev) {
          // Brand new card — insert into Supabase immediately
          persistedIds.add(card.id)
          prevCards[card.id] = card
          insertCard(card).catch(console.error)
          continue
        }

        // Position changed (after drag commit)
        if (prev.x !== card.x || prev.y !== card.y || prev.zIndex !== card.zIndex) {
          debounce(`pos:${card.id}`, POSITION_DEBOUNCE_MS, () =>
            patchCardPosition(card.id, card.x, card.y, card.zIndex).catch(console.error)
          )
        }

        // Size changed (after resize commit)
        if (prev.width !== card.width || prev.height !== card.height) {
          debounce(`size:${card.id}`, POSITION_DEBOUNCE_MS, () =>
            patchCardSize(card.id, card.width, card.height).catch(console.error)
          )
        }

        // Content changed (text edit, link meta, transcript)
        if (prev.updatedAt !== card.updatedAt &&
            prev.x === card.x && prev.y === card.y &&
            prev.width === card.width && prev.height === card.height) {
          debounce(`content:${card.id}`, CONTENT_DEBOUNCE_MS, () =>
            patchCardContent(card).catch(console.error)
          )
        }

        prevCards[card.id] = card
      }

      // Rebuild snapshot (handles deletions too)
      prevCards = Object.fromEntries(wallCards.map(c => [c.id, c]))
    })

    return unsub
  }, [wallId, debounce])

  // ── Synced delete ─────────────────────────────────────────────────────────
  const deleteCard = useCallback(async (id: string): Promise<void> => {
    _deleteLocal(id)
    removeCard(id).catch(console.error)
  }, [_deleteLocal])

  return { loading, error, deleteCard }
}
