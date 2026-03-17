import { useRef, useState, useEffect, useCallback } from 'react'
import { useBoardStore } from '@/stores/boardStore'
import { useCardsStore } from '@/stores/cardsStore'
import type { TextCard as TextCardType } from '@/types'

interface Props { card: TextCardType }

export function TextCard({ card }: Props) {
  const updateContent = useCardsStore(s => s.updateContent)
  const editingId     = useBoardStore(s => s.editingCardId)
  const startEditing  = useBoardStore(s => s.startEditing)
  const stopEditing   = useBoardStore(s => s.stopEditing)
  const isEditing     = editingId === card.id

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState(card.content)

  // Sync draft when editing starts or content changes externally
  useEffect(() => {
    if (isEditing) {
      setDraft(card.content)
      setTimeout(() => {
        const ta = textareaRef.current
        if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length) }
      }, 0)
    }
  }, [isEditing]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    startEditing(card.id)
  }, [card.id, startEditing])

  const handleBlur = useCallback(() => {
    updateContent(card.id, draft)
    stopEditing()
  }, [card.id, draft, updateContent, stopEditing])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Escape') {
      setDraft(card.content)
      stopEditing()
      ;(e.target as HTMLElement).blur()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      updateContent(card.id, draft)
      stopEditing()
      ;(e.target as HTMLElement).blur()
    }
  }, [card.id, card.content, draft, updateContent, stopEditing])

  return (
    <div
      className="w-full h-full flex flex-col p-3"
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex-shrink-0 mb-1.5">
        <span className="font-mono text-[10px] text-ink-30 uppercase tracking-wider">
          заметка
        </span>
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="flex-1 w-full resize-none bg-transparent text-ink
                     text-sm leading-relaxed focus:outline-none
                     placeholder:text-ink-30 cursor-text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onMouseDown={e => e.stopPropagation()}
          placeholder="Напишите что-нибудь..."
        />
      ) : (
        <p
          className="flex-1 text-sm leading-relaxed text-ink break-words overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 8,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties}
        >
          {card.content || (
            <span className="text-ink-30 italic">Двойной клик — редактировать</span>
          )}
        </p>
      )}

      {isEditing && (
        <div className="flex-shrink-0 mt-1 text-[9px] text-ink-30 font-mono text-right">
          esc · ⌘↵
        </div>
      )}
    </div>
  )
}
