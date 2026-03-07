-- Supabase Setup Script for Ardsan Co-op Investment and Contribution Features

-- 1. Add 'contributions' column to 'users' table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS contributions NUMERIC DEFAULT 0.00;

-- 2. Create RPC Function to Handle Contributions safely
-- This adds the amount to BOTH the user's total balance and their specific 'contributions' bucket
CREATE OR REPLACE FUNCTION add_contribution(user_email_param TEXT, amount_param NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE public.users
    SET balance = balance + amount_param,
        contributions = contributions + amount_param
    WHERE email = user_email_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create RPC Function to Handle Investments safely
-- This adds the amount to BOTH the user's total balance and their specific 'shares' bucket (My Investment)
-- Adjust this if Investment deposits should not increase the "Total Balance" shown on the Home screen
CREATE OR REPLACE FUNCTION add_investment(user_email_param TEXT, amount_param NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE public.users
    SET balance = balance + amount_param,
        shares = shares + amount_param
    WHERE email = user_email_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
