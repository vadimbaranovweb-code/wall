import { useEffect } from 'react'
import { useCardsStore } from '@/stores/cardsStore'
import type { LinkCard as LinkCardType } from '@/types'

interface Props { card: LinkCardType }

// Fetch OG meta — uses Vite proxy in dev to avoid CORS, direct in prod
async function fetchOgMeta(url: string) {
  const encoded = encodeURIComponent(url)

  // In dev: route through Vite proxy (/og-proxy → api.allorigins.win)
  // In prod: call allorigins directly (same origin from deployed server)
  const isDev = import.meta.env.DEV
  const proxyUrl = isDev
    ? `/og-proxy/get?url=${encoded}`
    : `https://api.allorigins.win/get?url=${encoded}`

  try {
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const html: string = data.contents ?? ''
    if (!html) throw new Error('Empty response')

    const get = (prop: string) => {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
           ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
      return m?.[1]
    }
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

    return {
      title:       get('og:title')       ?? get('twitter:title') ?? titleMatch?.[1]?.trim(),
      description: get('og:description') ?? get('description'),
      ogImageUrl:  get('og:image')       ?? get('twitter:image'),
      faviconUrl:  `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
    }
  } catch (err) {
    // Fallback: at minimum return favicon and domain as title
    const domain = new URL(url).hostname.replace(/^www\./, '')
    return {
      title: domain,
      description: undefined,
      ogImageUrl:  undefined,
      faviconUrl:  `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
    }
  }
}

export function LinkCard({ card }: Props) {
  const updateLinkMeta = useCardsStore(s => s.updateLinkMeta)

  // Fetch meta once when card is first created
  useEffect(() => {
    if (card.fetchState !== 'idle') return
    updateLinkMeta(card.id, { fetchState: 'loading' })

    fetchOgMeta(card.url)
      .then(meta => updateLinkMeta(card.id, { ...meta, fetchState: 'done' }))
      .catch(() => updateLinkMeta(card.id, { fetchState: 'error' }))
  }, [card.id, card.fetchState, card.url, updateLinkMeta])

  const handleOpen = () => window.open(card.url, '_blank', 'noopener,noreferrer')

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden rounded-card
                 cursor-pointer group"
      onDoubleClick={handleOpen}
    >
      {/* OG image */}
      {card.ogImageUrl && (
        <div className="flex-shrink-0 h-24 overflow-hidden bg-ink-10">
          <img
            src={card.ogImageUrl}
            alt=""
            draggable={false}
            className="w-full h-full object-cover select-none"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex flex-col p-2.5 gap-1 min-h-0">
        {/* Loading / error state */}
        {card.fetchState === 'loading' && (
          <div className="flex items-center gap-1.5 text-ink-30 text-xs">
            <Spinner />
            <span>Загрузка превью…</span>
          </div>
        )}
        {card.fetchState === 'error' && (
          <p className="text-xs text-ink-30 italic">Не удалось загрузить превью</p>
        )}

        {/* Title */}
        {card.title ? (
          <p className="text-sm font-medium text-ink leading-snug line-clamp-2">
            {card.title}
          </p>
        ) : (
          <p className="text-sm font-medium text-ink leading-snug line-clamp-2
                        break-all opacity-60">
            {card.url}
          </p>
        )}

        {/* Description */}
        {card.description && (
          <p className="text-[11px] text-ink-60 leading-snug line-clamp-2">
            {card.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5
                      border-t border-ink-10 flex-shrink-0">
        {card.faviconUrl && (
          <img
            src={card.faviconUrl}
            alt=""
            className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <span className="text-[10px] font-mono text-ink-30 truncate flex-1">
          {card.domain}
        </span>
        {/* Open arrow — visible on hover */}
        <span className="text-[10px] text-ink-30 opacity-0 group-hover:opacity-100
                         transition-opacity flex-shrink-0">
          ↗
        </span>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"
              strokeDasharray="14 8" strokeLinecap="round"/>
    </svg>
  )
}
