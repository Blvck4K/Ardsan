-- Fix RLS Infinite Recursion Bug

-- 1. Create a secure function to check admin status bypassing RLS
CREATE OR REPLACE FUNCTION is_admin_check(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COALESCE((SELECT is_admin FROM public.users WHERE email = check_email), false);
$$;

-- 2. Drop the recursive and buggy policies
DROP POLICY IF EXISTS "Users can view own data or admin view all" ON public.users;
DROP POLICY IF EXISTS "Users can update own data or admin update all" ON public.users;
DROP POLICY IF EXISTS "Users can view own loans or admin view all" ON public.loans;
DROP POLICY IF EXISTS "Admins can update loans" ON public.loans;

-- 3. Recreate the policies safely using the bypass function
CREATE POLICY "Users can view own data or admin view all" ON public.users 
    FOR SELECT USING (
        email = (auth.jwt() ->> 'email') 
        OR is_admin_check(auth.jwt() ->> 'email')
    );

CREATE POLICY "Users can update own data or admin update all" ON public.users 
    FOR UPDATE USING (
        email = (auth.jwt() ->> 'email') 
        OR is_admin_check(auth.jwt() ->> 'email')
    );

CREATE POLICY "Users can view own loans or admin view all" ON public.loans 
    FOR SELECT USING (
        user_email = (auth.jwt() ->> 'email') 
        OR is_admin_check(auth.jwt() ->> 'email')
    );

CREATE POLICY "Admins can update loans" ON public.loans 
    FOR UPDATE USING (
        is_admin_check(auth.jwt() ->> 'email')
    );
