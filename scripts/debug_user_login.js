
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
    const email = 'definanceoracle@gmail.com';
    console.log(`Checking for user: ${email}`);

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const found = users.find(u => u.email === email);
    if (found) {
        console.log('FOUND USER:', {
            id: found.id,
            email: found.email,
            email_confirmed_at: found.email_confirmed_at,
            last_sign_in: found.last_sign_in_at,
            created_at: found.created_at,
            metadata: found.user_metadata
        });

        // If not confirmed, try to confirm it to see if that fixes login
        if (!found.email_confirmed_at) {
            console.log("User not confirmed. Attempting to manual confirm...");
            // This isn't a function in all versions, usually we update the user
            const { data, error: updateError } = await supabase.auth.admin.updateUserById(
                found.id,
                { email_confirm: true }
            );
            if (updateError) console.error("Confirm error:", updateError);
            else console.log("User confirmed manually via admin.");
        }

    } else {
        console.log('User NOT found.');
    }
}

checkUser();
