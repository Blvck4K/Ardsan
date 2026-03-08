-- Admin RPC to clear an active loan

CREATE OR REPLACE FUNCTION admin_clear_loan(loan_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the loan status to 'cleared'
    -- This stops it from counting towards the user's active loan balance
    UPDATE public.loans SET status = 'cleared' WHERE id = loan_id;
END;
$$;

-- Allow authenticated and anon to call it (JS handles the UI guard, but ideally RLS applies securely)
GRANT EXECUTE ON FUNCTION admin_clear_loan(UUID) TO authenticated, anon;
