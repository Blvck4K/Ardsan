-- fix-admin-transactions.sql
-- Allow admins to insert transactions on behalf of users (fixes deposit confirmation error)

-- 1. Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;

-- 2. Create the unified policy allowing users to insert their own and admins to insert for anyone
CREATE POLICY "Users can insert own transactions and Admins can insert any" ON public.transactions
    FOR INSERT WITH CHECK (
        user_email = (auth.jwt() ->> 'email') OR 
        (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true
    );
