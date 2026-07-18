create table if not exists public.user_net_worth (
  google_user_id text primary key,
  email text not null,
  net_worth integer not null default 1000000,
  shorts_watched integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint net_worth_floor check (net_worth >= -500000),
  constraint non_negative_shorts_watched check (shorts_watched >= 0)
);

alter table public.user_net_worth enable row level security;

-- The service-role key is used only in the Edge Function, where the Google
-- token is verified. No browser role is granted direct access to this table.
