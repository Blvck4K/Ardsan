-- IPPIS Records Table Setup
-- Run this in the Supabase SQL Editor

CREATE TABLE ippis_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL,
    ippis_number TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    step TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    basic_salary NUMERIC(15, 2) DEFAULT 0.00,
    housing_allowance NUMERIC(15, 2) DEFAULT 0.00,
    transport_allowance NUMERIC(15, 2) DEFAULT 0.00,
    medical_allowance NUMERIC(15, 2) DEFAULT 0.00,
    other_allowances NUMERIC(15, 2) DEFAULT 0.00,
    tax NUMERIC(15, 2) DEFAULT 0.00,
    pension NUMERIC(15, 2) DEFAULT 0.00,
    nhf NUMERIC(15, 2) DEFAULT 0.00,
    gross_salary NUMERIC(15, 2) DEFAULT 0.00,
    net_salary NUMERIC(15, 2) DEFAULT 0.00,
    pay_month DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: We intentionally avoid creating standard RLS policies
-- Since this is an internal admin system based on JS connections,
-- and the previous tables operate openly, we will just allow access.
ALTER TABLE ippis_records ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated/anon read/insert access for now
-- (Matching the security context of the provided HTML application)
CREATE POLICY "Enable read access for all users" ON ippis_records FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON ippis_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON ippis_records FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON ippis_records FOR DELETE USING (true);
