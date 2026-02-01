
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
    const email = 'pedro@gmail.com';
    console.log(`Checking for user: ${email}`);

    // List users (filtering by email isn't direct in listUsers in some versions, but let's try)
    // Actually listUsers returns pages.
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const found = users.find(u => u.email === email);
    if (found) {
        console.log('FOUND USER:', found);
    } else {
        console.log('User NOT found in list of ' + users.length + ' users.');
    }
}

checkUser();
