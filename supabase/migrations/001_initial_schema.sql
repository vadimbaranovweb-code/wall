-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Walls ───────────────────────────────────────────────────────────────────
create table public.walls (
  id          text        primary key default gen_random_uuid()::text,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null default 'Без названия',
  color       text        not null default 'teal'
                          check (color in ('teal','amber','violet','rose','sky','lime')),
  sort_order  integer     not null default 1000,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Cards ───────────────────────────────────────────────────────────────────
-- All card types live in one table.
-- Type-specific content is stored as JSONB in the `content` column.
-- This is simpler than 5 separate tables and works well at MVP scale.
create table public.cards (
  id          text        primary key default gen_random_uuid()::text,
  wall_id     text        not null references public.walls(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  type        text        not null
                          check (type in ('text','image','link','voice')),

  -- Position on the canvas
  x           float       not null default 100,
  y           float       not null default 100,
  width       float       not null default 240,
  height      float       not null default 120,
  z_index     integer     not null default 1000,
  rotation    float       not null default 0,

  -- Type-specific content (JSONB — see per-type shape below)
  --
  -- text:  { content: string }
  -- image: { dataUrl: string, originalName: string, naturalWidth: number, naturalHeight: number }
  -- link:  { url: string, title?: string, description?: string,
  --          ogImageUrl?: string, faviconUrl?: string, domain: string, fetchState: string }
  -- voice: { audioDataUrl: string, durationSeconds: number,
  --          mimeType: string, transcript?: string }
  content     jsonb       not null default '{}',

  color_hex   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index cards_wall_id_idx   on public.cards(wall_id);
create index cards_user_id_idx   on public.cards(user_id);
create index walls_user_id_idx   on public.walls(user_id);
create index walls_sort_idx      on public.walls(user_id, sort_order);

-- ─── Updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger walls_updated_at
  before update on public.walls
  for each row execute function public.set_updated_at();

create trigger cards_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.walls enable row level security;
alter table public.cards enable row level security;

-- Walls: users see and modify only their own
create policy "walls_select" on public.walls for select
  using (auth.uid() = user_id);

create policy "walls_insert" on public.walls for insert
  with check (auth.uid() = user_id);

create policy "walls_update" on public.walls for update
  using (auth.uid() = user_id);

create policy "walls_delete" on public.walls for delete
  using (auth.uid() = user_id);

-- Cards: users see and modify only their own
create policy "cards_select" on public.cards for select
  using (auth.uid() = user_id);

create policy "cards_insert" on public.cards for insert
  with check (auth.uid() = user_id);

create policy "cards_update" on public.cards for update
  using (auth.uid() = user_id);

create policy "cards_delete" on public.cards for delete
  using (auth.uid() = user_id);
