-- Run this in your Supabase SQL Editor to add the KYC fields

-- 1. Add the new KYC columns to the existing users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS ippis_number TEXT,
ADD COLUMN IF NOT EXISTS member_id TEXT;

-- 2. Update our secure sign-up function to accept and save these new fields
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

-- Grant execution permissions for the updated function
GRANT EXECUTE ON FUNCTION create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
