import { useCallback, useRef } from 'react'
import { useBoardStore } from '@/stores/boardStore'
import { useCardsStore } from '@/stores/cardsStore'

export function useResize(cardId: string) {
  const camera          = useBoardStore(s => s.camera)
  const setResizePos    = useCardsStore(s => s.setResizePosition)
  const commitResize    = useCardsStore(s => s.commitResize)
  const getCard         = useCardsStore(s => s.getCard)

  const cameraRef = useRef(camera)
  cameraRef.current = camera

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // prevent drag

    document.body.classList.add('is-resizing')

    const card = getCard(cardId)
    if (!card) return

    const startScreenX = e.clientX
    const startScreenY = e.clientY
    const startWidth   = card.width
    const startHeight  = card.height

    const onMouseMove = (me: MouseEvent) => {
      const zoom = cameraRef.current.zoom
      const dw = (me.clientX - startScreenX) / zoom
      const dh = (me.clientY - startScreenY) / zoom
      setResizePos(cardId, startWidth + dw, startHeight + dh)
    }

    const onMouseUp = () => {
      document.body.classList.remove('is-resizing')
      commitResize(cardId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }, [cardId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { onResizeMouseDown }
}
