import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWallsStore } from '@/stores/wallsStore'
import { useAuthStore }  from '@/stores/authStore'
import { useWallsSync }  from '@/hooks/useWallsSync'
import { supabase }      from '@/lib/supabase'
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
  const navigate   = useNavigate()
  const { wallId } = useParams<{ wallId: string }>()
  const walls      = useWallsStore(s => s.walls)
  const { user, signOut }            = useAuthStore()
  const { createWall, updateWall, deleteWall } = useWallsSync()

  const [search,       setSearch]       = useState('')
  const [createOpen,   setCreateOpen]   = useState(false)
  const [newName,      setNewName]      = useState('')
  const [newColor,     setNewColor]     = useState<WallColor>('teal')
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [hoveredWall,  setHoveredWall]  = useState<string | null>(null)
  const [wallMenuId,   setWallMenuId]   = useState<string | null>(null)
  const [renamingId,   setRenamingId]   = useState<string | null>(null)
  const [renameValue,  setRenameValue]  = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const profileRef = useRef<HTMLDivElement>(null)
  const wallMenuRef = useRef<HTMLDivElement>(null)

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

  // Закрывать wall menu при клике снаружи
  useEffect(() => {
    if (!wallMenuId) return
    const handler = (e: MouseEvent) => {
      if (wallMenuRef.current && !wallMenuRef.current.contains(e.target as Node)) {
        setWallMenuId(null)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [wallMenuId])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const wall = await createWall(newName.trim(), newColor)
    setCreateOpen(false)
    setNewName('')
    setNewColor('teal')
    navigate(`/walls/${wall.id}`)
  }

  const handleRename = (id: string) => {
    if (renameValue.trim()) {
      updateWall(id, { name: renameValue.trim() })
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const filtered = walls.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase())
  )

  const isAnonymous = user?.is_anonymous ?? false
  const initials    = user?.email?.slice(0, 1).toUpperCase() ?? 'U'

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
  }
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? ''
  const email       = user?.email ?? ''

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
                         text-ink-30 hover:text-ink hover:bg-ink-10 transition-colors"
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
                            border border-ink-10 bg-card">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                   className="text-ink-30 flex-shrink-0">
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
                  className="text-ink-30 hover:text-ink transition-colors"
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
              <div
                key={wall.id}
                className="relative"
                onMouseEnter={() => setHoveredWall(wall.id)}
                onMouseLeave={() => { setHoveredWall(null) }}
                ref={wallMenuId === wall.id ? wallMenuRef : undefined}
              >
                {renamingId === wall.id ? (
                  <input
                    autoFocus
                    className="w-full px-2 py-2 rounded-lg border border-ink-30
                               bg-card text-sm text-ink focus:outline-none"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(wall.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(wall.id)
                      if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
                    }}
                  />
                ) : (
                  <button
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

                    {/* Three dots button */}
                    {(hoveredWall === wall.id || wallMenuId === wall.id) && (
                      <button
                        className="w-5 h-5 flex items-center justify-center
                                   rounded-md text-ink-30 hover:text-ink
                                   hover:bg-ink-20 transition-colors flex-shrink-0"
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => {
                          e.stopPropagation()
                          setWallMenuId(v => v === wall.id ? null : wall.id)
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="2" cy="6" r="1.2" fill="currentColor"/>
                          <circle cx="6" cy="6" r="1.2" fill="currentColor"/>
                          <circle cx="10" cy="6" r="1.2" fill="currentColor"/>
                        </svg>
                      </button>
                    )}
                  </button>
                )}

                {/* Wall dropdown menu */}
                {wallMenuId === wall.id && (
                  <div
                    className="absolute left-0 right-0 top-full z-50
                               bg-card border border-ink-10 rounded-xl
                               shadow-card-hover py-1 animate-fade-in"
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-2
                                 text-sm text-ink-60 hover:bg-ink-10
                                 transition-colors duration-100 text-left"
                      onClick={() => {
                        setWallMenuId(null)
                        setRenamingId(wall.id)
                        setRenameValue(wall.name)
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M9.5 1.5L11.5 3.5L4.5 10.5H2.5V8.5L9.5 1.5Z"
                              stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                      Переименовать
                    </button>
                    <div className="h-px bg-ink-10 mx-2 my-1" />
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-2
                                 text-sm text-red-500 hover:bg-red-50
                                 transition-colors duration-100 text-left"
                      onClick={() => {
                        setWallMenuId(null)
                        setConfirmDeleteId(wall.id)
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 3.5H11M5 3.5V2.5H8V3.5M4.5 3.5V10.5H8.5V3.5"
                              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
                              strokeLinejoin="round"/>
                      </svg>
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            ))}

            {search && filtered.length === 0 && (
              <p className="text-xs text-ink-30 px-2 py-4 text-center">
                Ничего не найдено
              </p>
            )}
          </div>

        {/* ── Profile ─────────────────────────────────────────── */}
        <div className="p-3 border-t border-ink-10 relative" ref={profileRef}>
            {isAnonymous ? (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                           bg-ink text-card text-sm font-medium
                           hover:opacity-90 active:scale-95 transition-all"
                onClick={handleGoogleLogin}
              >
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Войти через Google
              </button>
            ) : (
            <button
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg
                         hover:bg-ink-10 transition-colors duration-100"
              onClick={() => setProfileOpen(v => !v)}
            >
              <div className="w-7 h-7 rounded-full bg-ink flex items-center
                              justify-center flex-shrink-0">
                <span className="text-card text-xs font-semibold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-ink truncate">{displayName}</p>
                <p className="text-[10px] text-ink-30 truncate">{email}</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                   className="text-ink-30 flex-shrink-0">
                <path d="M2 4l4 4 4-4" stroke="currentColor"
                      strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            )}

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
                  onClick={() => { setProfileOpen(false); signOut() }}
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

      {/* Toggle button when sidebar closed */}
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

      {/* Create wall modal */}
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
            if (e.target === e.currentTarget) { setCreateOpen(false); setNewName('') }
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
                           text-ink-30 hover:text-ink hover:bg-ink-10 transition-colors"
                onClick={() => { setCreateOpen(false); setNewName('') }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor"
                        strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <label className="block text-xs font-medium text-ink-60 mb-1.5">Название</label>
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
            <label className="block text-xs font-medium text-ink-60 mb-2">Цвет</label>
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

      {/* Confirm delete wall modal */}
      {confirmDeleteId && createPortal(
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
            if (e.target === e.currentTarget) setConfirmDeleteId(null)
          }}
        >
          <div
            className="bg-card rounded-2xl border border-ink-10
                       shadow-card-hover p-6 w-80 animate-pop-in"
            onMouseDown={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-ink text-base mb-1">Удалить стену?</h3>
            <p className="text-sm text-ink-60 mb-5">
              Все карточки тоже удалятся. Это действие нельзя отменить.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-sm text-ink-60
                           hover:text-ink hover:bg-ink-10 transition-colors"
                onClick={() => setConfirmDeleteId(null)}
              >
                Отмена
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white
                           text-sm font-medium hover:bg-red-600
                           transition-colors active:scale-95"
                onClick={() => {
                  deleteWall(confirmDeleteId)
                  setConfirmDeleteId(null)
                  if (wallId === confirmDeleteId) navigate('/')
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}