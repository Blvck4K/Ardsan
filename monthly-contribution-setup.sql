-- Supabase Setup Script for Monthly Automated Contributions

-- 1. Add 'monthly_contribution_amount' column to 'users' table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS monthly_contribution_amount NUMERIC DEFAULT 0.00;

-- 2. Create RPC Function for Users to update their own automated amount
CREATE OR REPLACE FUNCTION set_monthly_contribution(user_email_param TEXT, amount_param NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE public.users
    SET monthly_contribution_amount = amount_param
    WHERE email = user_email_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Create RPC Function for Admins to trigger Monthly Processing
CREATE OR REPLACE FUNCTION process_monthly_contributions()
RETURNS void AS $$
DECLARE
    user_rec RECORD;
BEGIN
    -- Only process users who have a monthly contribution set and have enough balance
    FOR user_rec IN 
        SELECT email, balance, monthly_contribution_amount 
        FROM public.users 
        WHERE monthly_contribution_amount > 0 AND balance >= monthly_contribution_amount
    LOOP
        -- Deduct from balance, add to contributions
        UPDATE public.users
        SET balance = balance - user_rec.monthly_contribution_amount,
            contributions = contributions + user_rec.monthly_contribution_amount
        WHERE email = user_rec.email;

        -- Log transaction
        INSERT INTO public.transactions (user_email, type, amount, status, reference)
        VALUES (
            user_rec.email, 
            'contribution', 
            user_rec.monthly_contribution_amount, 
            'completed',
            'AUTO_' || floor(random() * 1000000000)
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
