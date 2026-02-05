-- Allow users to delete their own entities (Required for 'Discard Draft' feature)
-- Previously, RLS blocked DELETE operations, causing the 'Descartar y Salir' button to fail silently.

CREATE POLICY "Users can delete their own entities"
ON public.entities
FOR DELETE
USING (auth.uid() = owner_id);
