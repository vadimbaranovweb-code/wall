/**
 * Resize an image File/Blob to a max dimension, returning a base64 JPEG dataUrl.
 * Used by paste, file-picker, and drag-and-drop flows.
 */
export function resizeImageToDataUrl(
  source: File | Blob,
  maxPx   = 900,
  quality = 0.82,
): Promise<{ dataUrl: string; naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const w = Math.round(img.width  * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', quality),
          naturalWidth:  img.width,
          naturalHeight: img.height,
        })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(source)
  })
}

/** Extract hostname without www. from a URL string, or return the raw string on failure. */
export function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

/** Return true if string looks like an absolute URL */
export function looksLikeUrl(s: string): boolean {
  const trimmed = s.trim()
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.includes('.')) return false
  try { new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`); return true }
  catch { return false }
}

/** Normalise a pasted URL — add https:// if missing */
export function normaliseUrl(s: string): string {
  return s.trim().startsWith('http') ? s.trim() : `https://${s.trim()}`
}
