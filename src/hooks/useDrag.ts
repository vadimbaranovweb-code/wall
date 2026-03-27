import { useCallback, useRef } from 'react'
import { useBoardStore } from '@/stores/boardStore'
import { useCardsStore } from '@/stores/cardsStore'

export function useDrag(cardId: string) {
  const camera          = useBoardStore(s => s.camera)
  const selectCard      = useBoardStore(s => s.selectCard)
  const toggleSelectCard = useBoardStore(s => s.toggleSelectCard)
  const setDragPos      = useCardsStore(s => s.setDragPosition)
  const commitDrag      = useCardsStore(s => s.commitDrag)
  const getCard         = useCardsStore(s => s.getCard)

  const cameraRef = useRef(camera)
  cameraRef.current = camera

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()

    // Shift+клик — мультиселект без drag
    if (e.shiftKey) {
      toggleSelectCard(cardId)
      return
    }

    const selectedIds = useBoardStore.getState().selectedCardIds
    const isInSelection = selectedIds.includes(cardId)

    // Если карточка не в выделении — выделяем только её
    if (!isInSelection) {
      selectCard(cardId)
    }

    const card = getCard(cardId)
    if (!card) return

    const startScreenX = e.clientX
    const startScreenY = e.clientY

    // Стартовые позиции всех выделенных карточек
    const dragIds = isInSelection ? selectedIds : [cardId]
    const startPositions = dragIds.map(id => {
      const c = useCardsStore.getState().getCard(id)
      return { id, x: c?.x ?? 0, y: c?.y ?? 0 }
    })

    let hasMoved = false

    const onMouseMove = (me: MouseEvent) => {
      const zoom = cameraRef.current.zoom
      const dx = (me.clientX - startScreenX) / zoom
      const dy = (me.clientY - startScreenY) / zoom

      if (!hasMoved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return
      hasMoved = true

      document.body.classList.add('is-dragging')

      startPositions.forEach(({ id, x, y }) => {
        setDragPos(id, x + dx, y + dy)
      })
    }

    const onMouseUp = () => {
      document.body.classList.remove('is-dragging')
      if (hasMoved) {
        startPositions.forEach(({ id }) => commitDrag(id))
      }
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }, [cardId, selectCard, toggleSelectCard, setDragPos, commitDrag, getCard])

  return { onMouseDown }
}