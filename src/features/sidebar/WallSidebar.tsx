import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWallsStore } from '@/stores/wallsStore'
import { useWallsSync }  from '@/hooks/useWallsSync'
import { cn } from '@/lib/cn'
import type { WallColor } from '@/types'

const colorBg: Record<WallColor, string> = {
  teal:   '#2DD4BF',
  amber:  '#F59E0B',
  violet: '#8B5CF6',
  rose:   '#F43F5E',
  sky:    '#0EA5E9',
  lime:   '#84CC16',
}

const WALL_COLORS: { value: WallColor; bg: string }[] = [
  { value: 'teal',   bg: '#2DD4BF' },
  { value: 'amber',  bg: '#F59E0B' },
  { value: 'violet', bg: '#8B5CF6' },
  { value: 'rose',   bg: '#F43F5E' },
  { value: 'sky',    bg: '#0EA5E9' },
  { value: 'lime',   bg: '#84CC16' },
]

interface Props {
  isOpen: boolean
  onToggle: () => void
}

export function WallSidebar({ isOpen, onToggle }: Props) {
  const navigate   = useNavigate()
  const { wallId } = useParams<{ wallId: string }>()
  const walls      = useWallsStore(s => s.walls)

  const { createWall } = useWallsSync()

  const [isCreating, setIsCreating] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newColor,   setNewColor]   = useState<WallColor>('teal')

  const handleCreate = async () => {
    if (!newName.trim()) return
    const wall = await createWall(newName.trim(), newColor)
    setIsCreating(false)
    setNewName('')
    setNewColor('teal')
    navigate(`/walls/${wall.id}`)
  }

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col h-full bg-card border-r border-ink-10',
          'transition-all duration-200 ease-in-out flex-shrink-0 overflow-hidden',
          isOpen ? 'w-56' : 'w-0'
        )}
      >
        <div className="w-56 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-ink-10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-ink flex items-center justify-center">
                <span className="text-card font-bold text-[10px]">С</span>
              </div>
              <span className="font-semibold text-ink text-sm">Стена</span>
            </div>
            <button
              className="w-6 h-6 flex items-center justify-center rounded-md
                         text-ink-30 hover:text-ink hover:bg-ink-10 transition-colors"
              onClick={onToggle}
              title="Скрыть sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Walls list */}
          <div className="flex-1 overflow-y-auto py-2">
            {walls.map(wall => (
              <button
                key={wall.id}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left',
                  'hover:bg-ink-10 transition-colors duration-100 rounded-lg mx-1',
                  'text-sm truncate',
                  wallId === wall.id
                    ? 'bg-ink-10 text-ink font-medium'
                    : 'text-ink-60'
                )}
                style={{ width: 'calc(100% - 8px)' }}
                onClick={() => navigate(`/walls/${wall.id}`)}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: colorBg[wall.color] }}
                />
                <span className="truncate">{wall.name}</span>
              </button>
            ))}
          </div>

          {/* Create new wall */}
          <div className="p-2 border-t border-ink-10">
            {isCreating ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  className="w-full px-2.5 py-1.5 rounded-lg border border-ink-10
                             bg-canvas text-ink text-xs placeholder:text-ink-30
                             focus:outline-none focus:border-ink-30 transition-colors"
                  placeholder="Название стены..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') { setIsCreating(false); setNewName('') }
                  }}
                />
                {/* Color picker */}
                <div className="flex gap-1.5 px-1">
                  {WALL_COLORS.map(c => (
                    <button
                      key={c.value}
                      className={cn(
                        'w-4 h-4 rounded-full transition-all duration-100',
                        newColor === c.value ? 'ring-2 ring-offset-1 ring-ink scale-110' : 'hover:scale-110'
                      )}
                      style={{ background: c.bg }}
                      onClick={() => setNewColor(c.value)}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    className="flex-1 py-1 rounded-md text-xs text-ink-30
                               hover:bg-ink-10 transition-colors"
                    onClick={() => { setIsCreating(false); setNewName('') }}
                  >
                    Отмена
                  </button>
                  <button
                    className="flex-1 py-1 rounded-md bg-ink text-card text-xs
                               font-medium hover:opacity-90 disabled:opacity-40"
                    disabled={!newName.trim()}
                    onClick={handleCreate}
                  >
                    Создать
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg
                           text-ink-30 hover:text-ink hover:bg-ink-10
                           transition-colors duration-100 text-xs"
                onClick={() => setIsCreating(true)}
              >
                <span className="text-base leading-none">+</span>
                Новая стена
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <button
          className="absolute left-3 top-3 z-10 w-7 h-7 flex items-center justify-center
                     rounded-lg bg-card border border-ink-10 shadow-card
                     text-ink-30 hover:text-ink hover:border-ink-30
                     transition-all duration-150"
          onClick={onToggle}
          title="Открыть sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </>
  )
}