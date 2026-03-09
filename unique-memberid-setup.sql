-- unique-memberid-setup.sql
-- Enforce unique member ID and update the user creation logic to throw a clean error.

-- 1. Fix existing data: convert empty strings to NULL so they don't violate the constraint.
--    In PostgreSQL, multiple NULL values are allowed in a UNIQUE constraint, but multiple empty strings ('') are not.
UPDATE public.users 
SET member_id = NULL 
WHERE trim(member_id) = '';

-- 2. Add a unique constraint to member_id if it exists.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_member_id_key;
ALTER TABLE public.users ADD CONSTRAINT users_member_id_key UNIQUE (member_id);

-- 3. Update create_new_user to throw a user-friendly error if the member_id is taken
CREATE OR REPLACE FUNCTION create_new_user(
    user_email TEXT, 
    requested_username TEXT,
    user_phone TEXT DEFAULT NULL,
    user_nok TEXT DEFAULT NULL,
    user_address TEXT DEFAULT NULL,
    user_ippis TEXT DEFAULT NULL,
    user_memberid TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check for member ID uniqueness manually to throw a custom error payload
    IF user_memberid IS NOT NULL 
       AND trim(user_memberid) != '' 
       AND EXISTS (SELECT 1 FROM public.users WHERE member_id = user_memberid AND email != user_email) THEN
        RAISE EXCEPTION 'Member ID % is already taken. Nobody can take this number again.', user_memberid;
    END IF;

    -- Ensure we store NULL instead of an empty string if nothing was provided
    IF trim(user_memberid) = '' THEN
        user_memberid := NULL;
    END IF;

    INSERT INTO public.users (email, username, phone, next_of_kin, address, ippis_number, member_id)
    VALUES (user_email, requested_username, user_phone, user_nok, user_address, user_ippis, user_memberid)
    ON CONFLICT (email) DO UPDATE SET 
        username = COALESCE(EXCLUDED.username, users.username),
        phone = COALESCE(EXCLUDED.phone, users.phone),
        next_of_kin = COALESCE(EXCLUDED.next_of_kin, users.next_of_kin),
        address = COALESCE(EXCLUDED.address, users.address),
        ippis_number = COALESCE(EXCLUDED.ippis_number, users.ippis_number),
        member_id = COALESCE(EXCLUDED.member_id, users.member_id);
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
