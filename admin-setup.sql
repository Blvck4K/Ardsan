-- Admin capabilities and account status update

-- 1. Add new columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- 'active', 'banned', 'deactivated'

-- 2. Update RLS policies to give admins global access
-- First, drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

-- Recreate them with an OR condition for admins
CREATE POLICY "Users can view own data or admin view all" ON public.users 
    FOR SELECT USING (email = (auth.jwt() ->> 'email') OR (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);

CREATE POLICY "Users can update own data or admin update all" ON public.users 
    FOR UPDATE USING (email = (auth.jwt() ->> 'email') OR (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);

-- Allow admins to see and update all loans
DROP POLICY IF EXISTS "Users can view own loans" ON public.loans;

CREATE POLICY "Users can view own loans or admin view all" ON public.loans 
    FOR SELECT USING (user_email = (auth.jwt() ->> 'email') OR (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);

CREATE POLICY "Admins can update loans" ON public.loans 
    FOR UPDATE USING ((SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);


-- 3. Create a SECURITY DEFINER RPC function for Admins to easily change user statuses
CREATE OR REPLACE FUNCTION admin_update_user_status(target_email TEXT, new_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Basic sanity check: only 'active', 'banned', or 'deactivated' are allowed
    IF new_status NOT IN ('active', 'banned', 'deactivated') THEN
        RAISE EXCEPTION 'Invalid status';
    END IF;

    UPDATE public.users SET status = new_status WHERE email = target_email;
END;
$$;

-- Allow anon and authenticated to execute, but we enforce admin check in JS
GRANT EXECUTE ON FUNCTION admin_update_user_status(TEXT, TEXT) TO authenticated, anon;

-- 4. Create an RPC to update loan status and assign funds if approved (admin only)
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS approved_by TEXT[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION admin_resolve_loan(loan_id UUID, user_email_param TEXT, amount_param NUMERIC, resolution TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_admin_email TEXT;
    current_approved_by TEXT[];
BEGIN
    IF resolution NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid resolution';
    END IF;

    current_admin_email := auth.jwt() ->> 'email';

    IF current_admin_email IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify the caller is an admin
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = current_admin_email AND is_admin = true) THEN
        RAISE EXCEPTION 'Not an admin';
    END IF;

    IF resolution = 'rejected' THEN
        UPDATE public.loans SET status = 'rejected' WHERE id = loan_id;
        RETURN;
    END IF;

    IF resolution = 'approved' THEN
        -- Get current approved_by
        SELECT COALESCE(approved_by, '{}') INTO current_approved_by FROM public.loans WHERE id = loan_id;

        -- Add admin if not already in array
        IF NOT (current_admin_email = ANY(current_approved_by)) THEN
            current_approved_by := array_append(current_approved_by, current_admin_email);

            -- Update the array
            UPDATE public.loans SET approved_by = current_approved_by WHERE id = loan_id;

            -- Check if we hit 4 approvals
            IF array_length(current_approved_by, 1) >= 4 THEN
                -- Really approve it
                UPDATE public.loans SET status = 'approved' WHERE id = loan_id;
                UPDATE public.users SET balance = balance + amount_param WHERE email = user_email_param;
            END IF;
        END IF;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_resolve_loan(UUID, TEXT, NUMERIC, TEXT) TO authenticated, anon;
