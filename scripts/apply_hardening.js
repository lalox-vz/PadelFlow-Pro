const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Fallback to local connection string if env var not set, or use the one from previous attempts
const connectionString = "postgresql://postgres:postgres@localhost:54322/postgres";

const client = new Client({
    connectionString: connectionString,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const sqlPath = path.join(__dirname, '../supabase/migrations/20240206000032_hardening_bookings_and_courts.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing migration from:', sqlPath);
        await client.query(sql);

        console.log('✅ Migration executed successfully: 20240206000032_hardening_bookings_and_courts.sql');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
