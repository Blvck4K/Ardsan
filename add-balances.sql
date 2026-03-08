-- Fix Missing Financial Columns

-- 1. Add the balance column (used for overall funds and receiving loans)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0.00;

-- 2. Add the savings column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS savings NUMERIC DEFAULT 0.00;

-- 3. Add the shares column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS shares NUMERIC DEFAULT 0.00;
