const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rpulgzbhilmwkzlxqvml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwdWxnemJoaWxtd2t6bHhxdm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDYzNjUsImV4cCI6MjA4ODEyMjM2NX0.aUqFAVTb5Tw5AU1H8XXcE4dfydg118KYgNFPlsD54MM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.from('deposit_requests').select('*');
    if (error) {
        console.error("TEST ERROR:", error.message, error.code);
    } else {
        console.log("TEST SUCCESS! Fetched records:", data.length);
    }
}
test();
