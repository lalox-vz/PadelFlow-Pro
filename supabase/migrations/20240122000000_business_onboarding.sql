-- Create businesses table
create type business_type as enum ('club', 'academy');

create table public.businesses (
    id uuid not null default gen_random_uuid(),
    owner_id uuid references auth.users(id) on delete cascade not null,
    type business_type not null,
    name text not null,
    fiscal_id text, -- RIF
    city text,
    state text,
    logo_url text,
    phone text,
    email text,
    
    -- Club Specifics
    court_count int,
    surface_type text,
    is_covered boolean default false,
    hourly_rate numeric(10, 2),
    lighting_cost numeric(10, 2) default 0,
    
    -- Academy Specifics
    specialty text, -- Junior, Adults, Pro
    monthly_fee numeric(10, 2),
    registration_fee numeric(10, 2),
    
    -- Settings / Configs (JSONB for flexibility)
    operating_hours jsonb, -- { start: '07:00', end: '22:00' }
    payment_methods jsonb, -- ['cash', 'zelle', 'pago_movil']
    booking_rules jsonb, -- { min_time: 60, max_time: 120 }
    coaches jsonb, -- Stores academy coaches list
    programs jsonb, -- Stores academy programs list

    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    constraint businesses_pkey primary key (id),
    constraint businesses_owner_id_key unique (owner_id) -- One business per owner for now
);

-- Update users table for onboarding tracking
alter table public.users add column if not exists onboarding_status text default 'not_started'; -- 'not_started', 'in_progress', 'completed'
alter table public.users add column if not exists onboarding_step int default 1;

-- RLS
alter table public.businesses enable row level security;

create policy "Users can view their own business"
on public.businesses for select
using (auth.uid() = owner_id);

create policy "Users can insert their own business"
on public.businesses for insert
with check (auth.uid() = owner_id);

create policy "Users can update their own business"
on public.businesses for update
using (auth.uid() = owner_id);
