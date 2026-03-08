-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'contribution', 'investment')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

-- 3. Safely Drop ALL Existing Deposit Policies
DROP POLICY IF EXISTS "Users can view their own deposit requests" ON public.deposit_requests;
DROP POLICY IF EXISTS "Users can insert their own deposit requests" ON public.deposit_requests;
DROP POLICY IF EXISTS "Admins can view all deposit requests" ON public.deposit_requests;
DROP POLICY IF EXISTS "Admins can update all deposit requests" ON public.deposit_requests;

-- 4. Recreate Deposit Policies (USING SECURE JWT CHECK)
-- Using auth.jwt() prevents the "permission denied for table users" error by removing auth.users reference
CREATE POLICY "Users can view their own deposit requests"
    ON public.deposit_requests FOR SELECT
    USING (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert their own deposit requests"
    ON public.deposit_requests FOR INSERT
    WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can view all deposit requests"
    ON public.deposit_requests FOR SELECT
    USING ((SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);

CREATE POLICY "Admins can update all deposit requests"
    ON public.deposit_requests FOR UPDATE
    USING ((SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);

-- 5. Safely Drop ALL Existing Refund Policies
DROP POLICY IF EXISTS "Users can insert own refunds" ON public.refunds;
DROP POLICY IF EXISTS "Users can view own refunds" ON public.refunds;
DROP POLICY IF EXISTS "Admins can view all refunds" ON public.refunds;
DROP POLICY IF EXISTS "Admins can update refunds" ON public.refunds;

-- 6. Recreate Refunds Policies (USING SECURE JWT CHECK)
-- This fixes the identical error happening on the refunds panel
CREATE POLICY "Users can insert own refunds" ON public.refunds
    FOR INSERT WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can view own refunds" ON public.refunds
    FOR SELECT USING (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can view all refunds" ON public.refunds
    FOR SELECT USING ((SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);

CREATE POLICY "Admins can update refunds" ON public.refunds
    FOR UPDATE USING ((SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);

-- 7. Restore Missing Grants universally
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;