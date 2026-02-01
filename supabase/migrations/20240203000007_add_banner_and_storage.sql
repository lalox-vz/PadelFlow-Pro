-- Add banner_url to entities if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entities' AND column_name = 'banner_url') THEN
        ALTER TABLE "public"."entities" ADD COLUMN "banner_url" text;
    END IF;
END $$;

-- Ensure storage bucket 'club-assets' exists (Idempotent insert)
insert into storage.buckets (id, name, public)
values ('club-assets', 'club-assets', true)
on conflict (id) do nothing;

-- Allow public read access to club-assets
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'club-assets' );

-- Allow authenticated users to upload to club-assets
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'club-assets' and auth.role() = 'authenticated' );
