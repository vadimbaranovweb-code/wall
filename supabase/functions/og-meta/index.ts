// supabase/functions/og-meta/index.ts
// Fetches OG metadata for any URL, with special handling for YouTube.
// JWT verification is disabled — this is a public endpoint (anon key still required).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── YouTube ──────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null
    const m = u.pathname.match(/\/(embed|shorts|v)\/([^/?]+)/)
    return m?.[2] ?? null
  } catch { return null }
}

// ─── OG parser ────────────────────────────────────────────────────────────────
function parseOg(html: string, originalUrl: string) {
  const attr = (tag: string, attrName: string): string | undefined => {
    // Match both property= and name= variants, handle single/double quotes
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${tag}["'][^>]+content=["']([^"'<>]+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+(?:property|name)=["']${tag}["']`, 'i'),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m?.[1]?.trim()) return m[1].trim()
    }
    return undefined
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const hostname   = (() => {
    try { return new URL(originalUrl).hostname } catch { return '' }
  })()

  // Try multiple image sources
  const ogImage = attr('og:image') ?? attr('twitter:image:src') ?? attr('twitter:image')

  // Resolve relative image URLs
  let resolvedImage = ogImage
  if (ogImage && ogImage.startsWith('/')) {
    try {
      const base = new URL(originalUrl)
      resolvedImage = `${base.protocol}//${base.host}${ogImage}`
    } catch { /* keep as-is */ }
  }

  return {
    type:        'website',
    title:       attr('og:title') ?? attr('twitter:title') ?? titleMatch?.[1]?.trim(),
    description: attr('og:description') ?? attr('twitter:description') ?? attr('description'),
    ogImageUrl:  resolvedImage,
    faviconUrl:  `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
    domain:      hostname.replace(/^www\./, ''),
  }
}

// ─── Fetch HTML (with redirect follow) ───────────────────────────────────────
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':     'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    signal:   AbortSignal.timeout(10000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  // Read first 150KB — OG tags are always in <head>
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No body')

  const chunks: Uint8Array[] = []
  let total = 0
  const MAX = 150_000

  while (true) {
    const { done, value } = await reader.read()
    if (done || !value) break
    chunks.push(value)
    total += value.length
    if (total >= MAX) { reader.cancel(); break }
  }

  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(merged)
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const url = new URL(req.url).searchParams.get('url')

    if (!url) {
      return json({ error: 'Missing url' }, 400)
    }

    // Validate
    try { new URL(url) } catch {
      return json({ error: 'Invalid URL' }, 400)
    }

    // YouTube — no fetch needed
    const ytId = extractYouTubeId(url)
    if (ytId) {
      return json({
        type:       'youtube',
        videoId:    ytId,
        ogImageUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        faviconUrl: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
        domain:     'youtube.com',
      })
    }

    // Generic — fetch HTML
    const html = await fetchHtml(url)
    const meta = parseOg(html, url)
    return json(meta)

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    // Return fallback instead of error — client handles missing fields gracefully
    try {
      const hostname = new URL(new URL(req.url).searchParams.get('url') ?? '').hostname
      return json({
        type:      'website',
        domain:    hostname.replace(/^www\./, ''),
        faviconUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
        error:     message,
      })
    } catch {
      return json({ error: message }, 500)
    }
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
