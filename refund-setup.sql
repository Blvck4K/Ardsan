-- Supabase Setup Script for Refunds Feature

-- 1. Create the refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email TEXT NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own refunds
CREATE POLICY "Users can insert own refunds" ON public.refunds
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT id FROM auth.users WHERE email = user_email
    ));

-- Allow users to see their own refunds
CREATE POLICY "Users can view own refunds" ON public.refunds
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE email = user_email
    ));

-- Allow admins to see all refunds
CREATE POLICY "Admins can view all refunds" ON public.refunds
    FOR SELECT USING (
        (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true
    );

-- Allow admins to update refunds (e.g., matching 'resolved' status)
CREATE POLICY "Admins can update refunds" ON public.refunds
    FOR UPDATE USING (
        (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true
    );

-- 2. Set up Storage Bucket for refund images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('refund-images', 'refund-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for refund-images bucket
-- Anyone can view
CREATE POLICY "Anyone can view refund images" ON storage.objects
    FOR SELECT USING (bucket_id = 'refund-images');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload refund images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'refund-images' AND
        auth.role() = 'authenticated'
    );

-- Admins can update/delete
CREATE POLICY "Admins can update refund images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'refund-images' AND
        (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true
    );

CREATE POLICY "Admins can delete refund images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'refund-images' AND
        (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true
    );

-- 4. RPC to resolve refunds
CREATE OR REPLACE FUNCTION admin_resolve_refund(
    refund_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE public.refunds
    SET status = 'resolved'
    WHERE id = refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
