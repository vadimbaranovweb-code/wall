import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWallsStore } from '@/stores/wallsStore'
import { useAuthStore }  from '@/stores/authStore'
import { useWallsSync }  from '@/hooks/useWallsSync'
import { cn } from '@/lib/cn'
import { createPortal } from 'react-dom'
import type { WallColor } from '@/types'

const colorBg: Record<WallColor, string> = {
  teal:   '#2DD4BF',
  amber:  '#F59E0B',
  violet: '#8B5CF6',
  rose:   '#F43F5E',
  sky:    '#0EA5E9',
  lime:   '#84CC16',
}

const WALL_COLORS: { value: WallColor; bg: string; label: string }[] = [
  { value: 'teal',   bg: '#2DD4BF', label: 'Бирюзовый'  },
  { value: 'amber',  bg: '#F59E0B', label: 'Янтарный'   },
  { value: 'violet', bg: '#8B5CF6', label: 'Фиолетовый' },
  { value: 'rose',   bg: '#F43F5E', label: 'Розовый'    },
  { value: 'sky',    bg: '#0EA5E9', label: 'Голубой'    },
  { value: 'lime',   bg: '#84CC16', label: 'Лаймовый'   },
]

interface Props {
  isOpen:   boolean
  onToggle: () => void
}

export function WallSidebar({ isOpen, onToggle }: Props) {
  const navigate    = useNavigate()
  const { wallId }  = useParams<{ wallId: string }>()
  const walls       = useWallsStore(s => s.walls)
  const { user, signOut } = useAuthStore()
  const { createWall }    = useWallsSync()

  const [search,      setSearch]      = useState('')
  const [createOpen,  setCreateOpen]  = useState(false)
  const [newName,     setNewName]     = useState('')
  const [newColor,    setNewColor]    = useState<WallColor>('teal')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Закрывать profile меню при клике снаружи
  useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [profileOpen])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const wall = await createWall(newName.trim(), newColor)
    setCreateOpen(false)
    setNewName('')
    setNewColor('teal')
    navigate(`/walls/${wall.id}`)
  }

  const filtered = walls.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase())
  )

  // Инициалы пользователя
  const initials = user?.email?.slice(0, 1).toUpperCase() ?? 'U'
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? ''
  const email = user?.email ?? ''

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col h-full bg-canvas border-r border-ink-10',
          'transition-all duration-200 ease-in-out flex-shrink-0 overflow-hidden',
          isOpen ? 'w-60' : 'w-0'
        )}
      >
        <div className="w-60 flex flex-col h-full overflow-hidden">

          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-ink flex items-center justify-center flex-shrink-0">
                <span className="text-card font-bold text-[11px]">С</span>
              </div>
              <span className="font-semibold text-ink text-sm">Стена</span>
            </div>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         text-ink-30 hover:text-ink hover:bg-ink-10
                         transition-colors"
              onClick={onToggle}
              title="Скрыть (Cmd+\)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2"
                      stroke="currentColor" strokeWidth="1.3"/>
                <line x1="6" y1="2" x2="6" y2="14"
                      stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            </button>
          </div>

          {/* ── New wall button ──────────────────────────────────── */}
          <div className="px-3 mb-2">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                         text-ink-60 hover:text-ink hover:bg-ink-10
                         transition-colors duration-100 text-sm"
              onClick={() => setCreateOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Новая стена
            </button>
          </div>

          {/* ── Search ──────────────────────────────────────────── */}
          <div className="px-3 mb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                            bg-ink-10/60 text-ink-30">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M9 9L12 12" stroke="currentColor"
                      strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                className="flex-1 bg-transparent text-sm text-ink
                           placeholder:text-ink-30 focus:outline-none"
                placeholder="Поиск стен..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="hover:text-ink transition-colors"
                  onClick={() => setSearch('')}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor"
                          strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Walls list ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-3">
            {filtered.length > 0 && (
              <p className="text-[10px] font-medium text-ink-30 uppercase
                            tracking-wider px-2 mb-1">
                Мои стены
              </p>
            )}
            {filtered.map(wall => (
              <button
                key={wall.id}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg',
                  'text-sm transition-colors duration-100 text-left',
                  wallId === wall.id
                    ? 'bg-ink-10 text-ink font-medium'
                    : 'text-ink-60 hover:bg-ink-10 hover:text-ink'
                )}
                onClick={() => navigate(`/walls/${wall.id}`)}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: colorBg[wall.color] }}
                />
                <span className="truncate flex-1">{wall.name}</span>
              </button>
            ))}

            {search && filtered.length === 0 && (
              <p className="text-xs text-ink-30 px-2 py-4 text-center">
                Ничего не найдено
              </p>
            )}
          </div>

          {/* ── Profile ─────────────────────────────────────────── */}
          <div className="p-3 border-t border-ink-10" ref={profileRef}>
            <button
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg
                         hover:bg-ink-10 transition-colors duration-100"
              onClick={() => setProfileOpen(v => !v)}
            >
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-ink flex items-center
                              justify-center flex-shrink-0">
                <span className="text-card text-xs font-semibold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-ink truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-ink-30 truncate">{email}</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                   className="text-ink-30 flex-shrink-0">
                <path d="M2 4l4 4 4-4" stroke="currentColor"
                      strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Profile dropdown */}
            {profileOpen && (
              <div className="absolute bottom-16 left-3 right-3 z-50
                              bg-card border border-ink-10 rounded-xl
                              shadow-card-hover py-1 animate-fade-in">
                <div className="px-3 py-2 border-b border-ink-10">
                  <p className="text-xs text-ink-30 truncate">{email}</p>
                </div>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2
                             text-sm text-ink-60 hover:bg-ink-10
                             transition-colors duration-100 text-left"
                  onClick={() => {
                    setProfileOpen(false)
                    signOut()
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 12H3a1 1 0 01-1-1V3a1 1 0 011-1h2M9 10l3-3-3-3M12 7H5"
                          stroke="currentColor" strokeWidth="1.3"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Toggle button when sidebar closed ───────────────────── */}
      {!isOpen && (
        <button
          className="absolute left-3 top-3 z-10 w-7 h-7 flex items-center
                     justify-center rounded-lg bg-card border border-ink-10
                     shadow-card text-ink-30 hover:text-ink hover:border-ink-30
                     transition-all duration-150"
          onClick={onToggle}
          title="Открыть sidebar (Cmd+\)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2"
                  stroke="currentColor" strokeWidth="1.3"/>
            <line x1="6" y1="2" x2="6" y2="14"
                  stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </button>
      )}

      {/* ── Create wall modal ────────────────────────────────────── */}
      {createOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(26,24,20,0.4)',
          }}
          onMouseDown={e => {
            if (e.target === e.currentTarget) {
              setCreateOpen(false)
              setNewName('')
            }
          }}
        >
          <div
            className="bg-card rounded-2xl border border-ink-10
                       shadow-card-hover p-6 w-96 animate-pop-in"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-ink text-lg">Новая стена</h2>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg
                           text-ink-30 hover:text-ink hover:bg-ink-10
                           transition-colors"
                onClick={() => { setCreateOpen(false); setNewName('') }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor"
                        strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Name input */}
            <label className="block text-xs font-medium text-ink-60 mb-1.5">
              Название
            </label>
            <input
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-ink-10
                         bg-canvas text-ink text-sm placeholder:text-ink-30
                         focus:outline-none focus:border-ink-30 transition-colors mb-4"
              placeholder="Например: Design refs"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') { setCreateOpen(false); setNewName('') }
              }}
            />

            {/* Color picker */}
            <label className="block text-xs font-medium text-ink-60 mb-2">
              Цвет
            </label>
            <div className="flex gap-2 mb-6">
              {WALL_COLORS.map(c => (
                <button
                  key={c.value}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all duration-150',
                    newColor === c.value
                      ? 'ring-2 ring-offset-2 ring-ink scale-110'
                      : 'hover:scale-110'
                  )}
                  style={{ background: c.bg }}
                  onClick={() => setNewColor(c.value)}
                  title={c.label}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-sm text-ink-60
                           hover:text-ink hover:bg-ink-10 transition-colors"
                onClick={() => { setCreateOpen(false); setNewName('') }}
              >
                Отмена
              </button>
              <button
                className="px-5 py-2 rounded-lg bg-ink text-card text-sm
                           font-medium hover:opacity-90 active:scale-95
                           transition-all disabled:opacity-40"
                disabled={!newName.trim()}
                onClick={handleCreate}
              >
                Создать
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}