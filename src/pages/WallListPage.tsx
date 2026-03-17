import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallsStore } from '@/stores/wallsStore'
import { useAuthStore }  from '@/stores/authStore'
import { useCardsStore } from '@/stores/cardsStore'
import { useWallsSync }  from '@/hooks/useWallsSync'
import { cn } from '@/lib/cn'
import type { Wall, WallColor } from '@/types'

// ─── Color config ─────────────────────────────────────────────────────────────
const WALL_COLORS: { value: WallColor; bg: string; label: string }[] = [
  { value: 'teal',   bg: '#2DD4BF', label: 'Бирюзовый' },
  { value: 'amber',  bg: '#F59E0B', label: 'Янтарный'  },
  { value: 'violet', bg: '#8B5CF6', label: 'Фиолетовый'},
  { value: 'rose',   bg: '#F43F5E', label: 'Розовый'   },
  { value: 'sky',    bg: '#0EA5E9', label: 'Голубой'   },
  { value: 'lime',   bg: '#84CC16', label: 'Лаймовый'  },
]

const colorBg: Record<WallColor, string> = Object.fromEntries(
  WALL_COLORS.map(c => [c.value, c.bg])
) as Record<WallColor, string>

// ─── Relative time helper ─────────────────────────────────────────────────────
function relativeTime(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60_000)      return 'только что'
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)} мин.`
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)} ч.`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} дн.`
  return new Date(ts).toLocaleDateString('ru')
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WallListPage() {
  const navigate     = useNavigate()
  const walls        = useWallsStore(s => s.walls)
  const isLoaded     = useWallsStore(s => s.isLoaded)
  const { loading, createWall, updateWall, deleteWall } = useWallsSync()
  const { user, signOut } = useAuthStore()
  const getCardsForWall = useCardsStore(s => s.getCardsForWall)

  const [isCreating, setIsCreating] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newColor,   setNewColor]   = useState<WallColor>('teal')
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editName,   setEditName]   = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    const wall = await createWall(newName.trim(), newColor)
    setIsCreating(false)
    setNewName('')
    navigate(`/walls/${wall.id}`)
  }

  const handleRename = (wall: Wall) => {
    if (editName.trim() && editName.trim() !== wall.name) {
      updateWall(wall.id, { name: editName.trim() })
    }
    setEditingId(null)
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="border-b border-ink-10 bg-card px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center">
            <span className="text-card font-bold text-sm">С</span>
          </div>
          <span className="font-semibold text-ink text-lg tracking-tight">Стена</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-30 hidden sm:block truncate max-w-[160px]">
            {user?.email}
          </span>
          <button
            className="px-3 py-2 rounded-xl border border-ink-10 text-sm
                       text-ink-60 hover:text-ink hover:bg-ink-10 transition-colors"
            onClick={signOut}
            title="Выйти"
          >
            Выйти
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink text-card
                       text-sm font-medium hover:opacity-90 active:scale-95
                       transition-all duration-150"
            onClick={() => setIsCreating(true)}
          >
            <span className="text-base">+</span> Новая стена
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-8 py-10">
        <h1 className="text-2xl font-semibold text-ink mb-8 tracking-tight">
          Мои стены
        </h1>

        {/* ── Create modal ────────────────────────────────────────── */}
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm"
               onClick={e => { if (e.target === e.currentTarget) setIsCreating(false) }}>
            <div className="bg-card rounded-2xl border border-ink-10 shadow-card-hover
                            p-6 w-96 animate-pop-in">
              <h2 className="font-semibold text-ink text-lg mb-5">Новая стена</h2>

              <label className="block text-xs font-medium text-ink-60 mb-1.5">Название</label>
              <input
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-ink-10
                           bg-canvas text-ink text-sm placeholder:text-ink-30
                           focus:outline-none focus:border-ink-30 transition-colors"
                placeholder="Например: Design refs"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') setIsCreating(false)
                }}
              />

              <label className="block text-xs font-medium text-ink-60 mt-4 mb-2">Цвет</label>
              <div className="flex gap-2 flex-wrap">
                {WALL_COLORS.map(c => (
                  <button
                    key={c.value}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all duration-150',
                      newColor === c.value ? 'ring-2 ring-offset-2 ring-ink scale-110' : 'hover:scale-110'
                    )}
                    style={{ background: c.bg }}
                    onClick={() => setNewColor(c.value)}
                    title={c.label}
                  />
                ))}
              </div>

              <div className="flex gap-2 mt-6 justify-end">
                <button
                  className="px-4 py-2 rounded-lg text-sm text-ink-60 hover:text-ink
                             hover:bg-ink-10 transition-colors"
                  onClick={() => setIsCreating(false)}
                >
                  Отмена
                </button>
                <button
                  className="px-5 py-2 rounded-lg bg-ink text-card text-sm font-medium
                             hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                  disabled={!newName.trim()}
                  onClick={handleCreate}
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Wall grid ───────────────────────────────────────────── */}
        {walls.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4 opacity-30">🧱</div>
            <p className="text-ink-60 font-medium">Стен пока нет</p>
            <p className="text-ink-30 text-sm mt-1">Создайте первую стену выше</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {walls.map((wall, i) => {
              const cardCount = getCardsForWall(wall.id).length
              return (
                <div
                  key={wall.id}
                  className="group bg-card border border-ink-10 rounded-2xl
                             hover:shadow-card-hover hover:border-ink-30
                             transition-all duration-200 cursor-pointer
                             animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => navigate(`/walls/${wall.id}`)}
                >
                  {/* Colour strip */}
                  <div className="h-1.5 w-full" style={{ background: colorBg[wall.color] }} />

                  <div className="p-5">
                    {/* Name row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      {editingId === wall.id ? (
                        <input
                          autoFocus
                          className="flex-1 text-base font-semibold text-ink bg-transparent
                                     border-b border-ink-30 focus:outline-none pb-0.5"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onBlur={() => handleRename(wall)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === 'Escape') handleRename(wall)
                            e.stopPropagation()
                          }}
                        />
                      ) : (
                        <h3
                          className="text-base font-semibold text-ink leading-tight flex-1"
                          onDoubleClick={e => {
                            e.stopPropagation()
                            setEditingId(wall.id)
                            setEditName(wall.name)
                          }}
                          title="Дважды кликните для переименования"
                        >
                          {wall.name}
                        </h3>
                      )}

                      {/* Context menu (delete) */}
                      <button
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg
                                   flex items-center justify-center text-ink-30
                                   hover:text-accent hover:bg-accent-light
                                   transition-all duration-150 flex-shrink-0"
                        onClick={e => {
                          e.stopPropagation()
                          if (confirm(`Удалить стену «${wall.name}»? Все карточки тоже удалятся.`)) {
                            deleteWall(wall.id)
                          }
                        }}
                        title="Удалить стену"
                      >
                        ×
                      </button>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-ink-30">
                      <span>{cardCount} {pluralCards(cardCount)}</span>
                      <span>·</span>
                      <span>{relativeTime(wall.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* New wall card */}
            <button
              className="border-2 border-dashed border-ink-10 rounded-2xl p-5
                         flex flex-col items-center justify-center gap-2 min-h-[110px]
                         text-ink-30 hover:text-ink-60 hover:border-ink-30
                         transition-all duration-200 cursor-pointer"
              onClick={() => setIsCreating(true)}
            >
              <span className="text-2xl">+</span>
              <span className="text-sm font-medium">Новая стена</span>
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function pluralCards(n: number) {
  if (n % 100 >= 11 && n % 100 <= 19) return 'карточек'
  const r = n % 10
  if (r === 1) return 'карточка'
  if (r >= 2 && r <= 4) return 'карточки'
  return 'карточек'
}
