
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON if service not avail).');
    process.exit(1);
}

// Use Service Role Key to bypass CAPTCHA/Rate limits if possible, or Anon key if testing public flow
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Using Admin key to test raw insertion
);

async function testSignup() {
    const email = `test_pedro_${Date.now()}@gmail.com`; // Unique email
    const password = 'Password123!';

    console.log(`Attempting to create user: ${email}`);

    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: 'Test Pedro' }
    });

    if (error) {
        console.error('ERROR:', error);
    } else {
        console.log('SUCCESS:', data);
    }
}

testSignup();
