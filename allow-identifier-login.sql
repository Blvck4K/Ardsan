-- allow-identifier-login.sql
-- Create a secure RPC function that allows unauthenticated users to look up
-- their email address using their username or member_id so they can log in.
-- This bypasses RLS securely by running as SECURITY DEFINER.

CREATE OR REPLACE FUNCTION get_email_by_identifier(identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_email TEXT;
BEGIN
    SELECT email INTO found_email
    FROM public.users
    WHERE username = identifier OR member_id = identifier
    LIMIT 1;
    
    RETURN found_email;
END;
$$;

-- Grant execution to anonymous users (for login screen)
GRANT EXECUTE ON FUNCTION get_email_by_identifier(TEXT) TO anon, authenticated;
