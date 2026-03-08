-- 1. Create the shop_items table
CREATE TABLE IF NOT EXISTS public.shop_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Setup RLS for shop_items
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read shop items
CREATE POLICY "Public can view shop items" ON public.shop_items
    FOR SELECT USING (true);

-- Allow only admins to insert
CREATE POLICY "Admins can insert shop items" ON public.shop_items
    FOR INSERT WITH CHECK ((SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);

-- Allow only admins to update
CREATE POLICY "Admins can update shop items" ON public.shop_items
    FOR UPDATE USING ((SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);

-- Allow only admins to delete
CREATE POLICY "Admins can delete shop items" ON public.shop_items
    FOR DELETE USING ((SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true);

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_items TO authenticated, anon;


-- 3. Set up Storage Bucket for shop items' images
-- Insert the bucket but ignore if it already exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shop-items', 'shop-items', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for shop-items bucket
-- Allow public to select/read images
CREATE POLICY "Public can view shop images" ON storage.objects
    FOR SELECT USING (bucket_id = 'shop-items');

-- Allow admins to insert new images
CREATE POLICY "Admins can upload shop images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'shop-items' AND
        (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true
    );

-- Allow admins to update images
CREATE POLICY "Admins can update shop images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'shop-items' AND
        (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true
    );

-- Allow admins to delete images
CREATE POLICY "Admins can delete shop images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'shop-items' AND
        (SELECT is_admin FROM public.users WHERE email = (auth.jwt() ->> 'email')) = true
    );
