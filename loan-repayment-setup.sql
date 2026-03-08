-- Add columns to loans table to track repayment
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS monthly_repayment_amount NUMERIC DEFAULT 0;

ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC DEFAULT 0;

-- Update existing loans to have remaining_balance = amount initially if null or zero
UPDATE public.loans SET remaining_balance = amount WHERE remaining_balance = 0 OR remaining_balance IS NULL;

-- Create RPC Function to process monthly loan repayments via cron or admin trigger
CREATE OR REPLACE FUNCTION process_monthly_loan_repayments()
RETURNS void AS $$
DECLARE
    loan_rec RECORD;
    user_rec RECORD;
BEGIN
    FOR loan_rec IN 
        SELECT l.id, l.user_email, l.monthly_repayment_amount, l.remaining_balance
        FROM public.loans l
        WHERE l.status = 'approved' AND l.remaining_balance > 0 AND l.monthly_repayment_amount > 0
    LOOP
        -- Fetch user balance
        SELECT * INTO user_rec FROM public.users WHERE email = loan_rec.user_email;

        -- Only process if user has enough balance to cover the monthly repayment
        IF user_rec.balance >= loan_rec.monthly_repayment_amount THEN
            
            -- Deduct from user's balance and ADD to their contributions (as requested)
            UPDATE public.users
            SET balance = balance - loan_rec.monthly_repayment_amount,
                contributions = contributions + loan_rec.monthly_repayment_amount
            WHERE email = loan_rec.user_email;

            -- Reduce loan remaining balance
            UPDATE public.loans
            SET remaining_balance = GREATEST(remaining_balance - loan_rec.monthly_repayment_amount, 0)
            WHERE id = loan_rec.id;

            -- Check if loan is clear after deduction
            IF (loan_rec.remaining_balance - loan_rec.monthly_repayment_amount) <= 0 THEN
                UPDATE public.loans
                SET status = 'repaid',
                    remaining_balance = 0
                WHERE id = loan_rec.id;
            END IF;

            -- Log transaction (Loan Repayment)
            INSERT INTO public.transactions (user_email, type, amount, status, reference)
            VALUES (
                loan_rec.user_email, 
                'loan_repayment', 
                loan_rec.monthly_repayment_amount, 
                'completed',
                'LOAN_REP_' || floor(random() * 1000000000)
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
