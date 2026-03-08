-- Supabase Setup Script for Loan Application Images

-- 1. Add evidence_url column to loans table
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS evidence_url TEXT;

-- 2. Set up Storage Bucket for loan images
-- Insert the bucket but ignore if it already exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('loan-images', 'loan-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for loan-images bucket
-- Allow public or authenticated users to view images (Admins need to see them, users might want to see their own)
CREATE POLICY "Anyone can view loan images" ON storage.objects
    FOR SELECT USING (bucket_id = 'loan-images');

-- Allow authenticated users to upload their own loan images
CREATE POLICY "Authenticated users can upload loan images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'loan-images' AND
        auth.role() = 'authenticated'
    );

-- Allow admins to update or delete images if necessary
CREATE POLICY "Admins can update loan images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'loan-images' AND
        (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true
    );

CREATE POLICY "Admins can delete loan images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'loan-images' AND
        (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true
    );
