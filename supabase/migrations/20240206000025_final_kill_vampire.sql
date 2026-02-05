-- Definitive Kill for the Vampire Trigger (tr_after_entity_insert)
-- This ensures that NO automation modifies the user profile during the entities creation Step 1.
-- The User must remain a 'player' (business_type: null) until they explicitly Graduate in Step 3.

DROP TRIGGER IF EXISTS tr_after_entity_insert ON public.entities;
DROP FUNCTION IF EXISTS public.fn_sync_user_on_entity_creation();
