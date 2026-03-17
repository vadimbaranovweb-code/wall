/**
 * useCapture — central pipeline for all capture flows:
 *   paste text    → TextCard
 *   paste image   → ImageCard
 *   paste URL     → LinkCard
 *   drop image    → ImageCard (at drop coords)
 *   drop any file → plain notification (files not stored as binary yet)
 *   voice result  → VoiceCard
 *
 * Returns handlers to attach to the board viewport.
 */

import { useCallback, useEffect } from 'react'
import { useBoardStore }    from '@/stores/boardStore'
import { useCardsStore }    from '@/stores/cardsStore'
import { useToastStore }    from '@/stores/toastStore'
import { resizeImageToDataUrl, looksLikeUrl, normaliseUrl } from '@/lib/imageUtils'

interface UseCaptureOptions {
  wallId:      string
  viewportRef: React.RefObject<HTMLDivElement | null>
}

export function useCapture({ wallId, viewportRef }: UseCaptureOptions) {
  const screenToCanvas = useBoardStore(s => s.screenToCanvas)
  const startEditing   = useBoardStore(s => s.startEditing)
  const toast          = useToastStore(s => s.push)

  const store = useCardsStore.getState   // get fresh state on every call — no stale closure

  // ── Shared helpers ─────────────────────────────────────────────────────────

  /** Convert viewport-relative screen coords → canvas coords */
  const toCanvas = useCallback((screenX: number, screenY: number) => {
    const vp = viewportRef.current
    if (!vp) return screenToCanvas(screenX, screenY)
    const rect = vp.getBoundingClientRect()
    return screenToCanvas(screenX - rect.left, screenY - rect.top)
  }, [screenToCanvas, viewportRef])

  /** Random scatter around center of viewport */
  const centerPos = useCallback((offW = 120, offH = 60) => {
    const vp = viewportRef.current
    if (!vp) return { x: 100, y: 100 }
    const r  = vp.getBoundingClientRect()
    const jx = (Math.random() - 0.5) * 220
    const jy = (Math.random() - 0.5) * 130
    const p  = screenToCanvas(r.width / 2 + jx, r.height / 2 + jy)
    return { x: p.x - offW, y: p.y - offH }
  }, [screenToCanvas, viewportRef])

  // ── Individual capture actions ─────────────────────────────────────────────

  const captureText = useCallback((text: string) => {
    const pos  = centerPos(120, 60)
    const card = store().createTextCard(wallId, pos.x, pos.y, text)
    setTimeout(() => startEditing(card.id), 50)
    toast('Текстовая карточка добавлена')
  }, [wallId, centerPos, startEditing, toast, store])

  const captureUrl = useCallback((url: string) => {
    const full = normaliseUrl(url)
    const pos  = centerPos(140, 80)
    store().createLinkCard(wallId, pos.x, pos.y, full)
    toast('Ссылка добавлена')
  }, [wallId, centerPos, toast, store])

  const captureImageFile = useCallback(async (
    file: File | Blob,
    name: string,
    dropX?: number,
    dropY?: number,
  ) => {
    try {
      const { dataUrl, naturalWidth, naturalHeight } = await resizeImageToDataUrl(file)
      const pos = dropX !== undefined && dropY !== undefined
        ? toCanvas(dropX, dropY)
        : centerPos(140, 110)

      store().createImageCard(
        wallId,
        pos.x - 140, pos.y - 110,
        dataUrl, name, naturalWidth, naturalHeight,
      )
      toast('Изображение добавлено')
    } catch {
      toast('Не удалось обработать изображение', 'error')
    }
  }, [wallId, centerPos, toCanvas, toast, store])

  const captureVoice = useCallback((
    audioDataUrl: string,
    durationSeconds: number,
    mimeType: string,
  ) => {
    const pos = centerPos(120, 50)
    store().createVoiceCard(wallId, pos.x, pos.y, audioDataUrl, durationSeconds, mimeType)
    toast('Голосовая заметка добавлена')
  }, [wallId, centerPos, toast, store])

  // ── Paste handler ──────────────────────────────────────────────────────────

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // Don't intercept paste inside text inputs
    const tag = (document.activeElement as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return

    const items = Array.from(e.clipboardData?.items ?? [])

    // 1. Image in clipboard (screenshot, copy image)
    const imageItem = items.find(i => i.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const blob = imageItem.getAsFile()
      if (blob) await captureImageFile(blob, 'вставленное изображение')
      return
    }

    // 2. Text content
    const textItem = items.find(i => i.type === 'text/plain')
    if (textItem) {
      e.preventDefault()
      textItem.getAsString(async (text) => {
        const trimmed = text.trim()
        if (!trimmed) return

        // 2a. URL → link card
        if (looksLikeUrl(trimmed)) {
          captureUrl(trimmed)
          return
        }

        // 2b. Plain text → text card
        captureText(trimmed)
      })
    }
  }, [captureImageFile, captureUrl, captureText])

  // ── Drag and drop handler ──────────────────────────────────────────────────

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    // Show copy cursor
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault()
    const dt = e.dataTransfer
    if (!dt) return

    // 1. Files dropped from Finder / Explorer
    const files = Array.from(dt.files)
    if (files.length > 0) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          await captureImageFile(file, file.name, e.clientX, e.clientY)
        } else {
          // Non-image files: show toast (full file support is post-MVP)
          toast(`Файл «${file.name}» — скоро добавим поддержку файлов`, 'info')
        }
      }
      return
    }

    // 2. URL dragged from browser address bar or link
    const url = dt.getData('text/uri-list') || dt.getData('text/plain')
    if (url && looksLikeUrl(url)) {
      const full = normaliseUrl(url)
      const pos  = toCanvas(e.clientX, e.clientY)
      useCardsStore.getState().createLinkCard(wallId, pos.x - 140, pos.y - 80, full)
      toast('Ссылка добавлена')
      return
    }

    // 3. Plain text dropped
    const text = dt.getData('text/plain')
    if (text?.trim()) {
      captureText(text.trim())
    }
  }, [wallId, captureImageFile, captureUrl, captureText, toCanvas, toast])

  // ── Attach / detach listeners ──────────────────────────────────────────────

  useEffect(() => {
    const vp = viewportRef.current
    window.addEventListener('paste', handlePaste)
    vp?.addEventListener('dragover', handleDragOver)
    vp?.addEventListener('drop',     handleDrop)

    return () => {
      window.removeEventListener('paste', handlePaste)
      vp?.removeEventListener('dragover', handleDragOver)
      vp?.removeEventListener('drop',     handleDrop)
    }
  }, [handlePaste, handleDragOver, handleDrop, viewportRef])

  // ── Drop zone visual state ─────────────────────────────────────────────────

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return

    const onEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.some(t => t === 'Files' || t === 'text/uri-list')) {
        vp.setAttribute('data-drop-active', 'true')
      }
    }
    const onLeave = (e: DragEvent) => {
      // Only clear if leaving the viewport itself, not a child
      if (!vp.contains(e.relatedTarget as Node)) {
        vp.removeAttribute('data-drop-active')
      }
    }
    const onDropClear = () => vp.removeAttribute('data-drop-active')

    vp.addEventListener('dragenter', onEnter)
    vp.addEventListener('dragleave', onLeave)
    vp.addEventListener('drop',      onDropClear)

    return () => {
      vp.removeEventListener('dragenter', onEnter)
      vp.removeEventListener('dragleave', onLeave)
      vp.removeEventListener('drop',      onDropClear)
    }
  }, [viewportRef])

  return { captureText, captureUrl, captureImageFile, captureVoice }
}
