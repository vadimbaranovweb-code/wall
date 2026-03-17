import { useCallback, useRef } from 'react'
import { useBoardStore } from '@/stores/boardStore'
import { useCardsStore } from '@/stores/cardsStore'

export function useDrag(cardId: string) {
  const camera          = useBoardStore(s => s.camera)
  const selectCard      = useBoardStore(s => s.selectCard)
  const setDragPos      = useCardsStore(s => s.setDragPosition)
  const commitDrag      = useCardsStore(s => s.commitDrag)
  const cancelDrag      = useCardsStore(s => s.cancelDrag)
  const getCard         = useCardsStore(s => s.getCard)

  // Keep fresh camera ref so closures don't stale
  const cameraRef = useRef(camera)
  cameraRef.current = camera

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation() // prevent canvas pan

    selectCard(cardId)
    document.body.classList.add('is-dragging')

    const card = getCard(cardId)
    if (!card) return

    const startScreenX = e.clientX
    const startScreenY = e.clientY
    const startCardX   = card.x
    const startCardY   = card.y

    const onMouseMove = (me: MouseEvent) => {
      const zoom = cameraRef.current.zoom
      const dx = (me.clientX - startScreenX) / zoom
      const dy = (me.clientY - startScreenY) / zoom
      setDragPos(cardId, startCardX + dx, startCardY + dy)
    }

    const onMouseUp = () => {
      document.body.classList.remove('is-dragging')
      commitDrag(cardId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }, [cardId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { onMouseDown }
}
