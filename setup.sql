-- Supabase Setup Script for Ardsan Co-op

-- 1. Update existing 'users' table or create it if not exists
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    profile_photo TEXT,
    balance NUMERIC DEFAULT 0.00,
    savings NUMERIC DEFAULT 0.00,
    shares NUMERIC DEFAULT 10000.00, -- Default initial shares
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create 'transactions' table for deposits, withdrawals, etc.
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT REFERENCES public.users(email) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'purchase', 'loan'
    amount NUMERIC NOT NULL,
    reference TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create 'loans' table
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT REFERENCES public.users(email) ON DELETE CASCADE,
    loan_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    duration_months INT NOT NULL,
    interest_rate NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'repaid'
    approved_by TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create 'purchases' table
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT REFERENCES public.users(email) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 5. RPC Functions for safe balance updates

-- Add Funds (for Deposits)
CREATE OR REPLACE FUNCTION add_funds(user_email_param TEXT, amount_param NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE public.users
    SET balance = balance + amount_param,
        savings = savings + amount_param -- Automatically attribute deposit to savings for now
    WHERE email = user_email_param;
END;
$$ LANGUAGE plpgsql;

-- Deduct Funds (for Withdrawals, Purchases)
CREATE OR REPLACE FUNCTION deduct_funds(user_email_param TEXT, amount_param NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE public.users
    SET balance = balance - amount_param,
        savings = savings - amount_param
    WHERE email = user_email_param;
END;
$$ LANGUAGE plpgsql;

-- Add Loan (for when loan is approved, can also increase balance)
CREATE OR REPLACE FUNCTION assign_loan_funds(user_email_param TEXT, amount_param NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE public.users
    SET balance = balance + amount_param
    WHERE email = user_email_param;
END;
$$ LANGUAGE plpgsql;


-- 6. Basic RLS (Row Level Security) Policies
-- Ensure to enable RLS on tables in the Supabase Dashboard
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Drop any previous buggy policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;

DROP POLICY IF EXISTS "Users can view own loans" ON public.loans;
DROP POLICY IF EXISTS "Users can insert own loans" ON public.loans;

DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.purchases;

-- Allow users to read and write only their own data using JWT claims
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (email = (auth.jwt() ->> 'email'));
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (email = (auth.jwt() ->> 'email'));
CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (user_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can view own loans" ON public.loans FOR SELECT USING (user_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Users can insert own loans" ON public.loans FOR INSERT WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (user_email = (auth.jwt() ->> 'email'));
CREATE POLICY "Users can insert own purchases" ON public.purchases FOR INSERT WITH CHECK (user_email = (auth.jwt() ->> 'email'));

-- Explicitly ensure roles have privileges (helps prevent 'permission denied' errors on the tables themselves)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated, anon;
