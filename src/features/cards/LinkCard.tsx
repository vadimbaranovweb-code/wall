import { useEffect } from 'react'
import { useCardsStore } from '@/stores/cardsStore'
import type { LinkCard as LinkCardType } from '@/types'

interface Props { card: LinkCardType }

// ─── OG meta fetcher ──────────────────────────────────────────────────────────
// Uses Supabase Edge Function — runs server-side, no CORS issues
async function fetchOgMeta(url: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const endpoint    = `${supabaseUrl}/functions/v1/og-meta?url=${encodeURIComponent(url)}`

  const res = await fetch(endpoint, {
    headers: {
      // anon key for Edge Function auth
      apikey:        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}`,
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LinkCard({ card }: Props) {
  const updateLinkMeta = useCardsStore(s => s.updateLinkMeta)

  useEffect(() => {
    // YouTube cards are resolved immediately in the store — skip fetch
    if (card.fetchState !== 'idle') return
    // Only fetch for regular websites
    if (card.linkType === 'youtube') return

    updateLinkMeta(card.id, { fetchState: 'loading' })

    fetchOgMeta(card.url)
      .then((meta: {
        title?: string; description?: string
        ogImageUrl?: string; faviconUrl?: string
      }) => {
        updateLinkMeta(card.id, {
          title:       meta.title,
          description: meta.description,
          ogImageUrl:  meta.ogImageUrl,
          faviconUrl:  meta.faviconUrl,
          fetchState:  'done',
        })
      })
      .catch(() => {
        // Fallback — show domain, that's enough
        updateLinkMeta(card.id, { fetchState: 'error' })
      })
  }, [card.id, card.fetchState, card.linkType, card.url, updateLinkMeta])

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(card.url, '_blank', 'noopener,noreferrer')
  }

  const isYouTube = card.linkType === 'youtube'

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden rounded-card
                 cursor-pointer group select-none"
      onDoubleClick={handleOpen}
    >
      {/* Preview image */}
      {card.ogImageUrl ? (
        <div className={`flex-shrink-0 overflow-hidden bg-ink-10
                         ${isYouTube ? 'h-32' : 'h-24'}`}>
          <img
            src={card.ogImageUrl}
            alt=""
            draggable={false}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).parentElement!.style.display = 'none'
            }}
          />
          {/* YouTube play button overlay */}
          {isYouTube && (
            <div className="absolute inset-0 flex items-center justify-center
                            bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center
                              justify-center shadow-lg">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                  <path d="M3 2L12 7L3 12V2Z"/>
                </svg>
              </div>
            </div>
          )}
        </div>
      ) : card.fetchState === 'loading' ? (
        /* Skeleton while loading */
        <div className="flex-shrink-0 h-20 bg-ink-10 animate-pulse" />
      ) : null}

      {/* Body */}
      <div className="flex-1 flex flex-col p-2.5 gap-1 min-h-0 overflow-hidden">
        {/* Title */}
        {card.title ? (
          <p className="text-sm font-medium text-ink leading-snug line-clamp-2">
            {card.title}
          </p>
        ) : card.fetchState === 'loading' ? (
          <div className="space-y-1.5">
            <div className="h-3 bg-ink-10 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-ink-10 rounded animate-pulse w-1/2" />
          </div>
        ) : (
          <p className="text-sm font-medium text-ink leading-snug line-clamp-2
                        break-all opacity-50">
            {card.url}
          </p>
        )}

        {/* Description */}
        {card.description && card.fetchState === 'done' && (
          <p className="text-[11px] text-ink-60 leading-snug line-clamp-2">
            {card.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5
                      border-t border-ink-10 flex-shrink-0">
        {/* Favicon */}
        {card.faviconUrl && (
          <img
            src={card.faviconUrl}
            alt=""
            className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}

        {/* Domain */}
        <span className="text-[10px] font-mono text-ink-30 truncate flex-1">
          {card.domain}
        </span>

        {/* Open icon */}
        <button
          className="text-[10px] text-ink-30 opacity-0 group-hover:opacity-100
                     transition-opacity hover:text-ink flex-shrink-0 p-0.5"
          onMouseDown={e => e.stopPropagation()}
          onClick={handleOpen}
          title="Открыть ссылку"
        >
          ↗
        </button>
      </div>
    </div>
  )
}
