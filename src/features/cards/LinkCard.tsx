import { useEffect } from 'react'
import { useCardsStore } from '@/stores/cardsStore'
import type { LinkCard as LinkCardType } from '@/types'

interface Props { card: LinkCardType }

// ─── Fetch via Supabase Edge Function ────────────────────────────────────────
async function fetchOgMeta(url: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const endpoint    = `${supabaseUrl}/functions/v1/og-meta?url=${encodeURIComponent(url)}`

  const res = await fetch(endpoint, {
    headers: {
      apikey:        anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LinkCard({ card }: Props) {
  const updateLinkMeta = useCardsStore(s => s.updateLinkMeta)
  const isYouTube      = card.linkType === 'youtube'

  useEffect(() => {
    if (card.fetchState !== 'idle') return
    if (isYouTube) return

    updateLinkMeta(card.id, { fetchState: 'loading' })

    fetchOgMeta(card.url)
      .then((meta: Record<string, string | undefined>) => {
        updateLinkMeta(card.id, {
          title:       meta.title,
          description: meta.description,
          ogImageUrl:  meta.ogImageUrl,
          faviconUrl:  meta.faviconUrl,
          fetchState:  'done',
        })
      })
      .catch(() => updateLinkMeta(card.id, { fetchState: 'error' }))
  }, [card.id, card.fetchState, isYouTube, card.url, updateLinkMeta])

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(card.url, '_blank', 'noopener,noreferrer')
  }

  // ── YouTube layout ─────────────────────────────────────────────────────────
  if (isYouTube) {
    return (
      <div
        className="w-full h-full flex flex-col overflow-hidden rounded-card
                   cursor-pointer group select-none"
        onDoubleClick={handleOpen}
      >
        {/* Thumbnail */}
        <div className="relative flex-1 overflow-hidden bg-black min-h-0">
          {card.ogImageUrl && (
            <img
              src={card.ogImageUrl}
              alt=""
              draggable={false}
              className="w-full h-full object-cover"
            />
          )}
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center
                          bg-black/10 group-hover:bg-black/25 transition-colors">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center
                            justify-center shadow-lg group-hover:scale-110
                            transition-transform">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                <path d="M4 2.5L13 8L4 13.5V2.5Z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-2.5 py-2 flex-shrink-0
                        border-t border-ink-10 bg-card">
          <img
            src="https://www.google.com/s2/favicons?domain=youtube.com&sz=32"
            alt="" className="w-4 h-4 rounded-sm flex-shrink-0"
          />
          <span className="text-[11px] font-medium text-ink-60 truncate flex-1">
            {card.title ?? card.domain}
          </span>
          <button
            className="text-ink-30 opacity-0 group-hover:opacity-100
                       transition-opacity hover:text-ink flex-shrink-0"
            onMouseDown={e => e.stopPropagation()}
            onClick={handleOpen}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 10L10 2M10 2H6M10 2V6"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // ── Regular website layout ─────────────────────────────────────────────────
  const hasImage   = !!card.ogImageUrl
  const isLoading  = card.fetchState === 'loading'

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden rounded-card
                 cursor-pointer group select-none"
      onDoubleClick={handleOpen}
    >
      {/* Horizontal layout when image exists: image left + text right */}
      {hasImage ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Image */}
          <div className="w-24 flex-shrink-0 overflow-hidden bg-ink-10">
            <img
              src={card.ogImageUrl}
              alt=""
              draggable={false}
              className="w-full h-full object-cover"
              onError={e => {
                const el = e.target as HTMLImageElement
                el.parentElement!.style.display = 'none'
              }}
            />
          </div>

          {/* Text */}
          <div className="flex-1 flex flex-col p-2.5 gap-1 min-w-0 overflow-hidden">
            <p className="text-sm font-semibold text-ink leading-snug line-clamp-2">
              {card.title ?? card.domain}
            </p>
            {card.description && (
              <p className="text-[11px] text-ink-60 leading-snug line-clamp-3">
                {card.description}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* No image — vertical layout */
        <div className="flex-1 flex flex-col p-2.5 gap-1.5 min-h-0 overflow-hidden">
          {isLoading ? (
            /* Skeleton */
            <div className="space-y-2">
              <div className="h-3 bg-ink-10 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-ink-10 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-ink-10 rounded animate-pulse w-2/3" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink leading-snug line-clamp-2">
                {card.title ?? card.url}
              </p>
              {card.description && (
                <p className="text-[11px] text-ink-60 leading-snug line-clamp-3">
                  {card.description}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5
                      border-t border-ink-10 flex-shrink-0 bg-card">
        {/* Favicon */}
        {card.faviconUrl && (
          <img
            src={card.faviconUrl}
            alt=""
            className="w-4 h-4 rounded-sm flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}

        <span className="text-[10px] font-mono text-ink-60 truncate flex-1">
          {card.domain}
        </span>

        <button
          className="text-ink-30 opacity-0 group-hover:opacity-100
                     transition-opacity hover:text-ink flex-shrink-0"
          onMouseDown={e => e.stopPropagation()}
          onClick={handleOpen}
          title="Открыть ссылку"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 10L10 2M10 2H6M10 2V6"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
