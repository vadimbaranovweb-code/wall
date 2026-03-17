// supabase/functions/og-meta/index.ts
// Deploy: supabase functions deploy og-meta

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── YouTube helpers ──────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    // youtube.com/watch?v=ID
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v')
    }
    // youtu.be/ID
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('?')[0] || null
    }
    // youtube.com/embed/ID  or  youtube.com/shorts/ID
    const m = u.pathname.match(/\/(embed|shorts|v)\/([^/?]+)/)
    return m?.[2] ?? null
  } catch {
    return null
  }
}

function youTubeMeta(videoId: string, url: string) {
  return {
    type:        'youtube',
    videoId,
    title:       undefined,  // would need YouTube Data API for title
    description: undefined,
    ogImageUrl:  `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    faviconUrl:  'https://www.google.com/s2/favicons?domain=youtube.com&sz=32',
    domain:      'youtube.com',
  }
}

// ─── OG meta parser ───────────────────────────────────────────────────────────

function parseOg(html: string, url: string) {
  const get = (prop: string): string | undefined => {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m?.[1]) return m[1].trim()
    }
    return undefined
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const hostname   = new URL(url).hostname

  return {
    type:        'website',
    title:       get('og:title') ?? get('twitter:title') ?? titleMatch?.[1]?.trim(),
    description: get('og:description') ?? get('description'),
    ogImageUrl:  get('og:image') ?? get('twitter:image'),
    faviconUrl:  `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
    domain:      hostname.replace(/^www\./, ''),
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Validate URL
    let parsedUrl: URL
    try { parsedUrl = new URL(url) }
    catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // YouTube — no fetch needed
    const ytId = extractYouTubeId(url)
    if (ytId) {
      return new Response(
        JSON.stringify(youTubeMeta(ytId, url)),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Generic site — fetch HTML
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StenaBot/1.0; +https://stena.app)',
        'Accept':     'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    // Read only first 100KB — enough for OG tags which are in <head>
    const reader  = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let totalBytes = 0
    const MAX = 100_000

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done || !value) break
        chunks.push(value)
        totalBytes += value.length
        if (totalBytes >= MAX) { reader.cancel(); break }
      }
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const merged = new Uint8Array(acc.length + c.length)
        merged.set(acc); merged.set(c, acc.length)
        return merged
      }, new Uint8Array(0))
    )

    const meta = parseOg(html, url)

    return new Response(
      JSON.stringify(meta),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
