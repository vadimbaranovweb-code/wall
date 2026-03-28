import { useState, useRef, useCallback } from 'react'
import { useCardsStore } from '@/stores/cardsStore'
import { useWallsStore } from '@/stores/wallsStore'
import { useAuthStore }  from '@/stores/authStore'
import { useNavigate }   from 'react-router-dom'
import { useShallow }    from 'zustand/react/shallow'
import { supabase }      from '@/lib/supabase'
import { looksLikeUrl, normaliseUrl, resizeImageToDataUrl } from '@/lib/imageUtils'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import type { Card, WallColor } from '@/types'

const colorBg: Record<WallColor, string> = {
  teal: '#2DD4BF', amber: '#F59E0B', violet: '#8B5CF6',
  rose: '#F43F5E', sky: '#0EA5E9',   lime: '#84CC16',
}

interface Props {
  wallId: string
}

export function MobileBoard({ wallId }: Props) {
  const [input,       setInput]       = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)

  const cards  = useCardsStore(useShallow(s => s.cards.filter(c => c.wallId === wallId)))
  const walls  = useWallsStore(useShallow(s => s.walls))
  const wall   = walls.find(w => w.id === wallId)
  const { user, signOut } = useAuthStore()
  const isAnonymous = user?.is_anonymous ?? true
  const navigate = useNavigate()

  const createTextCard  = useCardsStore(s => s.createTextCard)
  const createLinkCard  = useCardsStore(s => s.createLinkCard)
  const createImageCard = useCardsStore(s => s.createImageCard)
  const createVoiceCard = useCardsStore(s => s.createVoiceCard)

  const voice = useVoiceRecorder()

  const sorted = [...cards].sort((a, b) => b.createdAt - a.createdAt)

  const addCard = useCallback((text: string) => {
    const t = text.trim()
    if (!t) return
    const x = 100 + Math.random() * 200
    const y = 100 + Math.random() * 200
    if (looksLikeUrl(t)) {
      createLinkCard(wallId, x, y, normaliseUrl(t))
    } else {
      createTextCard(wallId, x, y, t)
    }
  }, [wallId, createTextCard, createLinkCard])

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return
    addCard(input)
    setInput('')
  }, [input, addCard])

  const handlePaste = useCallback(async () => {
    setShowActions(false)
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) addCard(text)
    } catch {}
  }, [addCard])

  const handlePhoto = useCallback(() => {
    setShowActions(false)
    fileRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { dataUrl, naturalWidth, naturalHeight } = await resizeImageToDataUrl(file)
      const x = 100 + Math.random() * 200
      const y = 100 + Math.random() * 200
      createImageCard(wallId, x, y, dataUrl, file.name, naturalWidth, naturalHeight)
    } catch {}
    e.target.value = ''
  }, [wallId, createImageCard])

  const handleVoice = useCallback(async () => {
    setShowActions(false)
    if (voice.state === 'recording') {
      const result = await voice.stop()
      if (result && result.durationSeconds >= 1) {
        const x = 100 + Math.random() * 200
        const y = 100 + Math.random() * 200
        createVoiceCard(wallId, x, y, result.audioDataUrl, result.durationSeconds, result.mimeType)
      }
    } else {
      await voice.start()
    }
  }, [voice, wallId, createVoiceCard])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col bg-canvas" style={{ height: '100dvh' }}>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 bg-card border-b border-ink-10 flex-shrink-0"
              style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: '12px' }}>
        {/* Hamburger */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-30 hover:text-ink hover:bg-ink-10"
          onClick={() => setSidebarOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: wall ? colorBg[wall.color] : '#ccc' }}/>
        <h1 className="font-semibold text-ink text-sm flex-1 truncate">{wall?.name ?? 'Стена'}</h1>

        {/* Profile */}
        {isAnonymous ? (
          <button
            className="px-3 py-1.5 rounded-xl bg-ink text-card text-xs font-medium"
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
          >
            Войти
          </button>
        ) : (
          <button
            className="w-8 h-8 rounded-full bg-ink flex items-center justify-center text-card text-xs font-semibold"
            onClick={signOut}
          >
            {user?.email?.slice(0, 1).toUpperCase() ?? 'U'}
          </button>
        )}
      </header>

      {/* ── Cards list ── */}
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

      {/* ── Action sheet ── */}
      {showActions && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowActions(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl border-t border-ink-10 p-4 pb-8 animate-fade-in">
            <div className="grid grid-cols-3 gap-3">
              <ActionBtn icon="📋" label="Вставить" onClick={handlePaste} />
              <ActionBtn icon="🖼" label="Фото" onClick={handlePhoto} />
              <ActionBtn
                icon={voice.state === 'recording' ? '⏹' : '🎙'}
                label={voice.state === 'recording' ? `${voice.durationSeconds}с` : 'Голос'}
                onClick={handleVoice}
                active={voice.state === 'recording'}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Input bar ── */}
      <div
        className="flex-shrink-0 bg-card border-t border-ink-10 px-3 pt-2 pb-4 flex items-end gap-2"
      >
        {/* + button */}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-20 text-ink-40 hover:text-ink hover:border-ink-40 transition-colors flex-shrink-0 mb-0.5"
          onClick={() => setShowActions(v => !v)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          className="flex-1 resize-none bg-ink-10/50 rounded-2xl px-3.5 py-2.5
                     text-sm text-ink placeholder:text-ink-30
                     focus:outline-none focus:bg-ink-10
                     transition-colors min-h-[40px] max-h-[120px]"
          placeholder="Мысль, заметка, ссылка..."
          value={input}
          rows={1}
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={handleKeyDown}
        />

        {/* Send / Voice */}
        {input.trim() ? (
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full bg-ink text-card hover:opacity-90 active:scale-95 transition-all flex-shrink-0 mb-0.5"
            onClick={handleSubmit}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <button
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all flex-shrink-0 mb-0.5
                       ${voice.state === 'recording'
                         ? 'bg-red-500 text-white animate-pulse'
                         : 'border border-ink-20 text-ink-40 hover:text-ink hover:border-ink-40'}`}
            onClick={handleVoice}
          >
            <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
              <rect x="4" y="0" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M1 8C1 11.866 3.686 15 7 15C10.314 15 13 11.866 13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="7" y1="15" x2="7" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Mobile Sidebar ── */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-ink/30"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-card shadow-xl flex flex-col animate-fade-in">
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-ink-10"
                 style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-ink flex items-center justify-center">
                  <span className="text-card font-bold text-[11px]">С</span>
                </div>
                <span className="font-semibold text-ink text-sm">Стена</span>
              </div>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-30 hover:text-ink hover:bg-ink-10"
                onClick={() => setSidebarOpen(false)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Walls list */}
            <div className="flex-1 overflow-y-auto py-2 px-3">
              <p className="text-[10px] font-medium text-ink-30 uppercase tracking-wider px-2 mb-1">
                Мои стены
              </p>
              {walls.map(w => (
                <button
                  key={w.id}
                  className={`w-full flex items-center gap-2.5 px-2 py-2.5 rounded-xl
                             text-sm transition-colors text-left
                             ${wallId === w.id ? 'bg-ink-10 text-ink font-medium' : 'text-ink-60 hover:bg-ink-10 hover:text-ink'}`}
                  onClick={() => { navigate(`/walls/${w.id}`); setSidebarOpen(false) }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colorBg[w.color] }}/>
                  <span className="truncate flex-1">{w.name}</span>
                </button>
              ))}
            </div>

            {/* Profile */}
            <div className="p-3 border-t border-ink-10"
                 style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              {isAnonymous ? (
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-ink-10 text-sm font-medium text-ink hover:bg-ink-10"
                  onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
                >
                  Войти через Google
                </button>
              ) : (
                <div className="flex items-center gap-2.5 px-2">
                  <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center flex-shrink-0">
                    <span className="text-card text-xs font-semibold">{user?.email?.slice(0, 1).toUpperCase() ?? 'U'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{user?.email ?? ''}</p>
                  </div>
                  <button
                    className="text-xs text-ink-30 hover:text-ink"
                    onClick={() => { signOut(); setSidebarOpen(false) }}
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Action button ────────────────────────────────────────────────────────────
function ActionBtn({ icon, label, onClick, active }: {
  icon: string; label: string; onClick: () => void; active?: boolean
}) {
  return (
    <button
      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-colors
                 ${active ? 'bg-red-50' : 'bg-ink-10/50 hover:bg-ink-10'}`}
      onClick={onClick}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs text-ink-60">{label}</span>
    </button>
  )
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────
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
            {card.ogImageUrl && <img src={card.ogImageUrl} alt="" className="w-full h-32 object-cover rounded-xl mb-2"/>}
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
              <p className="text-xs text-ink-60">{Math.floor(card.durationSeconds / 60)}:{String(card.durationSeconds % 60).padStart(2, '0')}</p>
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
            <button className="text-xs text-ink-30" onClick={() => setConfirmDelete(false)}>Отмена</button>
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
