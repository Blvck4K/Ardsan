-- 1. Add Auto-Save tracking columns to the users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auto_save_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auto_save_amount NUMERIC DEFAULT 0.00;

-- 2. Create RPC Function to Handle Savings explicitly
-- This adds the amount to BOTH the user's total balance and their specific 'savings' bucket
CREATE OR REPLACE FUNCTION add_savings(user_email_param TEXT, amount_param NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE public.users
    SET balance = balance + amount_param,
        savings = savings + amount_param
    WHERE email = user_email_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
