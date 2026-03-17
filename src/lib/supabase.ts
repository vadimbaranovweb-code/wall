import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL  as string
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    'Copy .env.example to .env.local and fill in your Supabase project values.'
  )
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ─── Typed helpers ────────────────────────────────────────────────────────────
// Raw DB row shapes (snake_case, as Postgres returns them)
export interface WallRow {
  id:         string
  user_id:    string
  name:       string
  color:      string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CardRow {
  id:         string
  wall_id:    string
  user_id:    string
  type:       string
  x:          number
  y:          number
  width:      number
  height:     number
  z_index:    number
  rotation:   number
  content:    Record<string, unknown>
  color_hex:  string | null
  created_at: string
  updated_at: string
}
