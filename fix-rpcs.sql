-- fix-rpcs.sql
-- Updates RPCs for contributions, savings, deposits, investments to properly add to balances using COALESCE
-- and updates the refund RPC to automatically credit the user's balance.

-- 1. add_contribution
CREATE OR REPLACE FUNCTION add_contribution(user_email_param TEXT, amount_param NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
    UPDATE public.users
    SET balance = COALESCE(balance, 0) + amount_param,
        contributions = COALESCE(contributions, 0) + amount_param
    WHERE email = user_email_param;
END;
$$;

-- 2. add_investment
CREATE OR REPLACE FUNCTION add_investment(user_email_param TEXT, amount_param NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
    UPDATE public.users
    SET balance = COALESCE(balance, 0) + amount_param,
        shares = COALESCE(shares, 0) + amount_param
    WHERE email = user_email_param;
END;
$$;

-- 3. add_savings
CREATE OR REPLACE FUNCTION add_savings(user_email_param TEXT, amount_param NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
    UPDATE public.users
    SET balance = COALESCE(balance, 0) + amount_param,
        savings = COALESCE(savings, 0) + amount_param
    WHERE email = user_email_param;
END;
$$;

-- 4. add_funds (Deposits)
CREATE OR REPLACE FUNCTION add_funds(user_email_param TEXT, amount_param NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
    UPDATE public.users
    SET balance = COALESCE(balance, 0) + amount_param
    WHERE email = user_email_param;
END;
$$;

-- 5. admin_resolve_refund (Admin Refund Resolution with Balance Update)
CREATE OR REPLACE FUNCTION admin_resolve_refund(
    refund_id UUID,
    amount_param NUMERIC
) RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
    target_email TEXT;
BEGIN
    -- Get the user email that requested the refund
    SELECT user_email INTO target_email FROM public.refunds WHERE id = refund_id;

    -- Update the refund status
    UPDATE public.refunds
    SET status = 'resolved'
    WHERE id = refund_id;

    -- Add funds back to the user's balance
    UPDATE public.users
    SET balance = COALESCE(balance, 0) + amount_param
    WHERE email = target_email;
END;
$$;

-- Grant EXECUTE to anon/authenticated just in case
GRANT EXECUTE ON FUNCTION add_contribution(TEXT, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION add_investment(TEXT, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION add_savings(TEXT, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION add_funds(TEXT, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION admin_resolve_refund(UUID, NUMERIC) TO authenticated, anon;
