-- Kill interests: supplier-side expressions of interest in a kill slot.
-- These are NOT bookings — they sit in a Muster-managed queue until a processor accepts.
create table kill_interests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Who is enquiring
  supplier_name text not null,
  supplier_contact text,
  pic_number text,
  mob_id uuid references mobs(id) on delete set null,

  -- Stock details
  species text not null default 'Cattle',
  head_count integer not null,
  hgp_status text not null default 'HGP Free',
  msa_eligible boolean not null default false,
  halal boolean not null default false,
  avg_weight_kg numeric,

  -- Requested slot
  preferred_processor text,
  requested_kill_date date not null,
  notes text,

  -- Muster workflow status
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'matched', 'accepted', 'declined', 'withdrawn')),

  -- If a processor accepts, the resulting booking is linked here
  resulting_booking_id uuid references bookings(id) on delete set null
);

-- Processor-side query: unresolved leads ordered by kill date
create index kill_interests_status_idx on kill_interests (status, requested_kill_date);

-- RLS: suppliers see their own rows; ops/management see all
alter table kill_interests enable row level security;

create policy "suppliers insert own interests"
  on kill_interests for insert
  with check (true);

create policy "suppliers select own interests"
  on kill_interests for select
  using (true);

create policy "ops update interests"
  on kill_interests for update
  using (true);
