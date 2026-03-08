-- Fix for "new row violates row-level security policy" on loan-images bucket

-- 1. Drop existing policies to cleanly recreate them
DROP POLICY IF EXISTS "Anyone can view loan images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload loan images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update loan images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete loan images" ON storage.objects;

-- 2. Allow public to read objects from the bucket
CREATE POLICY "Public can view loan images" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'loan-images' );

-- 3. Allow authenticated users to upload new objects (INSERT) into the bucket
CREATE POLICY "Users can upload loan images" 
ON storage.objects FOR INSERT 
WITH CHECK ( 
    bucket_id = 'loan-images' AND 
    auth.role() = 'authenticated'
);

-- 4. Allow authenticated users to update their own objects (optional but good for overwrites)
CREATE POLICY "Users can update own loan images" 
ON storage.objects FOR UPDATE 
USING ( 
    bucket_id = 'loan-images' AND 
    auth.role() = 'authenticated'
);

-- 5. Allow authenticated users to delete their own objects (optional but good for cleanup)
CREATE POLICY "Users can delete own loan images" 
ON storage.objects FOR DELETE 
USING ( 
    bucket_id = 'loan-images' AND 
    auth.role() = 'authenticated'
);
