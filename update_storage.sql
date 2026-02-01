-- Create the storage bucket for payment proofs if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

-- Policy to allow users to view their own files (or anyone if public, but better to restrict if sensitive)
-- Since we set public=true above, anyone with the URL can read. 
-- If strict privacy is needed, set public=false and use signed URLs. 
-- For now, consistent with "public read", we allow reading.

CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');
