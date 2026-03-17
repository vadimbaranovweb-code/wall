import { useCallback, useRef, useEffect } from 'react'
import { useBoardStore } from '@/stores/boardStore'

/**
 * Navigation rules (cross-platform):
 *
 * Mac trackpad:
 *   - Two-finger scroll     → pan (deltaMode=0, small deltas, ctrlKey=false)
 *   - Pinch                 → zoom (ctrlKey=true, browser sends as wheel)
 *   - Space + drag          → pan
 *
 * Mac mouse:
 *   - Scroll wheel          → pan vertical
 *   - Alt/Option + scroll   → zoom
 *   - Middle button drag    → pan
 *   - Space + drag          → pan
 *
 * Windows / Linux mouse:
 *   - Scroll wheel          → pan vertical
 *   - Ctrl + scroll         → zoom
 *   - Middle button drag    → pan
 *   - Space + drag          → pan
 */
export function useBoard(viewportRef: React.RefObject<HTMLDivElement | null>) {
  const zoomBy         = useBoardStore(s => s.zoomBy)
  const panBy          = useBoardStore(s => s.panBy)
  const selectCard     = useBoardStore(s => s.selectCard)
  const screenToCanvas = useBoardStore(s => s.screenToCanvas)

  const isPanning  = useRef(false)
  const isSpaceDown = useRef(false)
  const lastPan    = useRef({ x: 0, y: 0 })

  // ── Space key for pan mode ────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (document.activeElement as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        isSpaceDown.current = true
        document.body.style.cursor = 'grab'
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDown.current = false
        document.body.style.cursor = ''
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  }, [])

  // ── Wheel handler (zoom + pan) ────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const vp = viewportRef.current
    if (!vp) return
    const rect   = vp.getBoundingClientRect()
    const originX = e.clientX - rect.left
    const originY = e.clientY - rect.top

    // Pinch-to-zoom (Mac trackpad) or Ctrl/Cmd + scroll → zoom
    if (e.ctrlKey || e.metaKey) {
      // Pinch gives deltaY in range -30..+30 typically
      const factor = 1 - e.deltaY * 0.01
      const delta  = Math.max(0.5, Math.min(2, factor))
      zoomBy(delta, originX, originY)
      return
    }

    // Alt + scroll → zoom (Windows/Mac mouse)
    if (e.altKey) {
      const delta = e.deltaY > 0 ? 0.92 : 1.08
      zoomBy(delta, originX, originY)
      return
    }

    // Plain scroll → pan (trackpad two-finger, or mouse wheel)
    // deltaMode=0 is pixels (trackpad), deltaMode=1 is lines (mouse)
    const multiplier = e.deltaMode === 1 ? 20 : 1
    panBy(-e.deltaX * multiplier, -e.deltaY * multiplier)
  }, [zoomBy, panBy, viewportRef])

  // Attach wheel as non-passive so we can preventDefault
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    vp.addEventListener('wheel', handleWheel, { passive: false })
    return () => vp.removeEventListener('wheel', handleWheel)
  }, [handleWheel, viewportRef])

  // ── Mouse down → pan (space+drag, middle button, alt+drag) ───────────────
  const handleViewportMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-card]')) return

    const isPanTrigger =
      e.button === 1 ||                        // middle mouse
      (e.button === 0 && isSpaceDown.current) || // space + left
      (e.button === 0 && e.altKey)             // alt + left

    if (!isPanTrigger) {
      selectCard(null)
      return
    }

    e.preventDefault()
    isPanning.current = true
    lastPan.current   = { x: e.clientX, y: e.clientY }
    document.body.style.cursor = 'grabbing'

    const onMouseMove = (me: MouseEvent) => {
      if (!isPanning.current) return
      panBy(me.clientX - lastPan.current.x, me.clientY - lastPan.current.y)
      lastPan.current = { x: me.clientX, y: me.clientY }
    }
    const onMouseUp = () => {
      isPanning.current = false
      document.body.style.cursor = isSpaceDown.current ? 'grab' : ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }, [panBy, selectCard])

  return { handleViewportMouseDown, screenToCanvas }
}
