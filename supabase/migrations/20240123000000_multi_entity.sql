-- Create entities table to support multiple entities per user
create type entity_type as enum ('CLUB', 'ACADEMY');

create table public.entities (
    id uuid not null default gen_random_uuid(),
    owner_id uuid references auth.users(id) on delete cascade not null,
    type entity_type not null,
    name text not null,
    slug text, -- for URL friendly names
    
    -- Specific details can be jsonb or columns, leveraging jsonb for flexibility 
    -- merging club/academy specifics into one 'details' or keeping separate
    details jsonb default '{}'::jsonb, 
    -- Example details:
    -- Club: { court_count: 5, surface: 'blue', hours: {...} }
    -- Academy: { specialty: 'Pro', programs: [...] }

    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    constraint entities_pkey primary key (id)
);

-- Business Links for Host/Academy relationships
create table public.business_links (
    id uuid not null default gen_random_uuid(),
    academy_id uuid references public.entities(id) on delete cascade not null,
    host_club_id uuid references public.entities(id) on delete cascade not null,
    status text default 'pending', -- pending, active, rejected
    created_at timestamptz default now(),
    
    constraint business_links_pkey primary key (id)
    -- Add unique constraint to prevent duplicate links if needed
);

-- RLS for Entities
alter table public.entities enable row level security;

create policy "Users can view their own entities"
on public.entities for select
using (auth.uid() = owner_id);

create policy "Users can insert their own entities"
on public.entities for insert
with check (auth.uid() = owner_id);

create policy "Users can update their own entities"
on public.entities for update
using (auth.uid() = owner_id);

-- RLS for Links
alter table public.business_links enable row level security;

create policy "Users can view links for their entities"
on public.business_links for select
using (
    exists (select 1 from public.entities where id = business_links.academy_id and owner_id = auth.uid())
    or
    exists (select 1 from public.entities where id = business_links.host_club_id and owner_id = auth.uid())
);
