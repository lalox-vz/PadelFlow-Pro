-- Create a secure function to update onboarding status securely
-- bypassing RLS recursion issues by running as SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.update_user_onboarding(
    p_business_type text,
    p_status text,
    p_step int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres), bypassing RLS
SET search_path = public -- Secure search path
AS $$
BEGIN
    -- Update the user's metadata columns
    UPDATE public.users
    SET 
        business_type = p_business_type,
        onboarding_status = p_status,
        onboarding_step = p_step,
        has_business = TRUE -- Implicitly set this if they are starting onboarding
    WHERE id = auth.uid(); -- Securely target the calling user
END;
$$;
