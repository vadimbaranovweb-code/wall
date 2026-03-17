import { useCallback, useRef } from 'react'
import { useBoardStore } from '@/stores/boardStore'

export function useBoard(viewportRef: React.RefObject<HTMLDivElement | null>) {
  const zoomBy        = useBoardStore(s => s.zoomBy)
  const panBy         = useBoardStore(s => s.panBy)
  const selectCard    = useBoardStore(s => s.selectCard)
  const screenToCanvas = useBoardStore(s => s.screenToCanvas)

  const isPanning = useRef(false)
  const lastPan   = useRef({ x: 0, y: 0 })

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const vp = viewportRef.current
    if (!vp) return
    const rect = vp.getBoundingClientRect()
    // Zoom toward cursor
    const originX = e.clientX - rect.left
    const originY = e.clientY - rect.top
    const delta   = e.deltaY > 0 ? 0.92 : 1.08
    zoomBy(delta, originX, originY)
  }, [zoomBy, viewportRef])

  const handleViewportMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan on the canvas itself (not on cards)
    if ((e.target as HTMLElement).closest('[data-card]')) return
    if (e.button !== 1 && !(e.button === 0 && e.altKey)) {
      // Left click on canvas = deselect
      selectCard(null)
      return
    }
    e.preventDefault()
    isPanning.current = true
    lastPan.current   = { x: e.clientX, y: e.clientY }
    document.body.classList.add('is-dragging')

    const onMouseMove = (me: MouseEvent) => {
      if (!isPanning.current) return
      panBy(me.clientX - lastPan.current.x, me.clientY - lastPan.current.y)
      lastPan.current = { x: me.clientX, y: me.clientY }
    }
    const onMouseUp = () => {
      isPanning.current = false
      document.body.classList.remove('is-dragging')
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }, [panBy, selectCard])

  return { handleWheel, handleViewportMouseDown, screenToCanvas }
}
