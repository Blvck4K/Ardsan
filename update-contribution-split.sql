-- Add account_number to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS account_number TEXT;

-- Update add_contribution RPC to split 50/50 to savings and shares (investment)
CREATE OR REPLACE FUNCTION add_contribution(user_email_param TEXT, amount_param NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
    UPDATE public.users
    SET balance = COALESCE(balance, 0) + amount_param,
        contributions = COALESCE(contributions, 0) + amount_param,
        savings = COALESCE(savings, 0) + (amount_param / 2),
        shares = COALESCE(shares, 0) + (amount_param / 2)
    WHERE email = user_email_param;
END;
$$;

-- Update process_monthly_loan_repayments RPC to split 50/50 to savings and shares (investment)
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
        IF COALESCE(user_rec.balance, 0) >= loan_rec.monthly_repayment_amount THEN
            
            -- Deduct from user's balance and ADD to their contributions, savings, and shares
            UPDATE public.users
            SET balance = balance - loan_rec.monthly_repayment_amount,
                contributions = COALESCE(contributions, 0) + loan_rec.monthly_repayment_amount,
                savings = COALESCE(savings, 0) + (loan_rec.monthly_repayment_amount / 2),
                shares = COALESCE(shares, 0) + (loan_rec.monthly_repayment_amount / 2)
            WHERE email = loan_rec.user_email;

            -- Reduce loan remaining balance
            UPDATE public.loans
            SET remaining_balance = GREATEST(COALESCE(remaining_balance, 0) - loan_rec.monthly_repayment_amount, 0)
            WHERE id = loan_rec.id;

            -- Check if loan is clear after deduction
            IF (COALESCE(loan_rec.remaining_balance, 0) - loan_rec.monthly_repayment_amount) <= 0 THEN
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

-- Update process_monthly_contributions RPC for automated contribution deductions
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
        -- Deduct from balance, add to contributions, savings, and shares
        UPDATE public.users
        SET balance = balance - user_rec.monthly_contribution_amount,
            contributions = COALESCE(contributions, 0) + user_rec.monthly_contribution_amount,
            savings = COALESCE(savings, 0) + (user_rec.monthly_contribution_amount / 2),
            shares = COALESCE(shares, 0) + (user_rec.monthly_contribution_amount / 2)
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
