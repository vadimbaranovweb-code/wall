import { useState, useRef, useCallback } from 'react'
import { useCardsStore } from '@/stores/cardsStore'
import { useWallsStore } from '@/stores/wallsStore'
import { useAuthStore }  from '@/stores/authStore'
import { useNavigate }   from 'react-router-dom'
import { useShallow }    from 'zustand/react/shallow'
import { supabase }      from '@/lib/supabase'
import { looksLikeUrl, normaliseUrl } from '@/lib/imageUtils'
import type { Card, WallColor } from '@/types'

const colorBg: Record<WallColor, string> = {
  teal: '#2DD4BF', amber: '#F59E0B', violet: '#8B5CF6',
  rose: '#F43F5E', sky: '#0EA5E9',   lime: '#84CC16',
}

interface Props {
  wallId: string
  onSwitchToDesktop: () => void
}

export function MobileBoard({ wallId, onSwitchToDesktop }: Props) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const cards = useCardsStore(useShallow(s => s.cards.filter(c => c.wallId === wallId)))
  const walls = useWallsStore(useShallow(s => s.walls))
  const wall  = walls.find(w => w.id === wallId)
  const { user, signOut } = useAuthStore()
  const isAnonymous = user?.is_anonymous ?? true
  const navigate = useNavigate()

  const createTextCard = useCardsStore(s => s.createTextCard)
  const createLinkCard = useCardsStore(s => s.createLinkCard)

  const sorted = [...cards].sort((a, b) => b.createdAt - a.createdAt)

  const handleSubmit = useCallback(() => {
    const text = input.trim()
    if (!text) return
    const x = 100 + Math.random() * 200
    const y = 100 + Math.random() * 200
    if (looksLikeUrl(text)) {
      createLinkCard(wallId, x, y, normaliseUrl(text))
    } else {
      createTextCard(wallId, x, y, text)
    }
    setInput('')
    inputRef.current?.focus()
  }, [input, wallId, createTextCard, createLinkCard])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) setInput(text.trim())
    } catch {}
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-canvas">
      <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-ink-10 flex-shrink-0">
        <button
          className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-30 hover:text-ink hover:bg-ink-10 transition-colors"
          onClick={() => navigate('/')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: wall ? colorBg[wall.color] : '#ccc' }}/>
        <h1 className="font-semibold text-ink text-sm flex-1 truncate">{wall?.name ?? 'Стена'}</h1>
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ink-10 text-xs text-ink-60 hover:text-ink hover:bg-ink-10 transition-colors"
          onClick={onSwitchToDesktop}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1" y="1" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 12h5M6.5 9v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Десктоп
        </button>
        {isAnonymous ? (
          <button
            className="px-2.5 py-1.5 rounded-lg bg-ink text-card text-xs font-medium"
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
          >
            Войти
          </button>
        ) : (
          <button
            className="w-7 h-7 rounded-full bg-ink flex items-center justify-center text-card text-xs font-semibold"
            onClick={signOut}
          >
            {user?.email?.slice(0, 1).toUpperCase() ?? 'U'}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-20">
            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-ink-20 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink-30">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm text-ink-60 font-medium">Пока пусто</p>
            <p className="text-xs text-ink-30 mt-1">Напишите что-нибудь внизу</p>
          </div>
        ) : (
          sorted.map(card => <MobileCard key={card.id} card={card} />)
        )}
      </div>

      <div
        className="flex-shrink-0 bg-card border-t border-ink-10 px-3 py-3 flex items-end gap-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <button
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-ink-10 text-ink-30 hover:text-ink hover:bg-ink-10 transition-colors flex-shrink-0"
          onClick={handlePaste}
          title="Вставить из буфера"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="2" width="6" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M5 3H3a1 1 0 00-1 1v9a1 1 0 001 1h10a1 1 0 001-1V4a1 1 0 00-1-1h-2" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </button>
        <textarea
          ref={inputRef}
          className="flex-1 resize-none bg-ink-10/50 rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-30 focus:outline-none focus:bg-ink-10 transition-colors min-h-[40px] max-h-[120px]"
          placeholder="Заметка, ссылка..."
          value={input}
          rows={1}
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-ink text-card hover:opacity-90 active:scale-95 transition-all flex-shrink-0 disabled:opacity-40"
          disabled={!input.trim()}
          onClick={handleSubmit}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function MobileCard({ card }: { card: Card }) {
  const deleteCard = useCardsStore(s => s.deleteCard)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const bgColor = card.colorHex ?? '#FFFFFF'

  return (
    <div className="rounded-2xl border border-ink-10 overflow-hidden shadow-sm" style={{ backgroundColor: bgColor }}>
      <div className="p-3">
        {card.type === 'text' && (
          <div>
            <p className="text-[10px] font-mono text-ink-30 uppercase tracking-wider mb-1">Заметка</p>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {card.content || <span className="text-ink-30 italic">Пусто</span>}
            </p>
          </div>
        )}
        {card.type === 'link' && (
          <a href={card.url} target="_blank" rel="noopener noreferrer" className="block">
            {card.ogImageUrl && (
              <img src={card.ogImageUrl} alt="" className="w-full h-32 object-cover rounded-xl mb-2"/>
            )}
            <p className="text-sm font-medium text-ink leading-snug">{card.title ?? card.url}</p>
            <p className="text-xs text-ink-30 mt-0.5">{card.domain}</p>
          </a>
        )}
        {card.type === 'image' && (
          <img src={card.dataUrl} alt={card.originalName} className="w-full rounded-xl"/>
        )}
        {card.type === 'voice' && (
          <div className="flex items-center gap-2">
            <span className="text-base">🎙</span>
            <div>
              <p className="text-xs text-ink-60">
                {Math.floor(card.durationSeconds / 60)}:{String(card.durationSeconds % 60).padStart(2, '0')}
              </p>
              {card.transcript && <p className="text-sm text-ink mt-0.5">{card.transcript}</p>}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 pb-2.5">
        <span className="text-[10px] text-ink-20 font-mono">
          {new Date(card.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
        </span>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button className="text-xs text-ink-30 hover:text-ink" onClick={() => setConfirmDelete(false)}>Отмена</button>
            <button className="text-xs text-red-500 font-medium" onClick={() => deleteCard(card.id)}>Удалить</button>
          </div>
        ) : (
          <button className="text-ink-20 hover:text-red-400 transition-colors" onClick={() => setConfirmDelete(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4H12M5 4V3H9V4M4.5 4V11H9.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
