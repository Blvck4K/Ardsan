-- Sync missing users from Supabase Auth to Public Users

-- 1. Automatically copy any existing registered users into the public table
INSERT INTO public.users (email, username)
SELECT email, split_part(email, '@', 1) 
FROM auth.users
WHERE email IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE public.users.email = auth.users.email
);

-- 2. Create a secure bypass function for frontend Sign Ups
-- By making this SECURITY DEFINER, new users bypass RLS when creating their very first profile row
CREATE OR REPLACE FUNCTION create_new_user(user_email TEXT, requested_username TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (email, username)
    VALUES (user_email, requested_username)
    ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username;
END;
$$;

GRANT EXECUTE ON FUNCTION create_new_user(TEXT, TEXT) TO anon, authenticated;
