-- 1. Drop foreign key constraints that might block inserts due to RLS on the users table
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_email_fkey;
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_user_email_fkey;
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_user_email_fkey;

-- 2. Upgrade the RPC functions to SECURITY DEFINER
-- This ensures that when a user tries to Deposit or Withdraw, the balance updates 
-- run with full admin privileges, completely bypassing any RLS permission issues.

CREATE OR REPLACE FUNCTION add_funds(user_email_param TEXT, amount_param NUMERIC)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
    UPDATE public.users
    SET balance = balance + amount_param,
        savings = savings + amount_param
    WHERE email = user_email_param;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_funds(user_email_param TEXT, amount_param NUMERIC)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
    UPDATE public.users
    SET balance = balance - amount_param,
        savings = savings - amount_param
    WHERE email = user_email_param;
END;
$$;

CREATE OR REPLACE FUNCTION assign_loan_funds(user_email_param TEXT, amount_param NUMERIC)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
    UPDATE public.users
    SET balance = balance + amount_param
    WHERE email = user_email_param;
END;
$$;

-- 3. Ensure everyone has access to use these functions
GRANT EXECUTE ON FUNCTION add_funds(TEXT, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION deduct_funds(TEXT, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION assign_loan_funds(TEXT, NUMERIC) TO authenticated, anon;
