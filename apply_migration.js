const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env' });

// Fallback to manual string if env var fails, but prefer env
const connectionString = 'postgresql://postgres:Padelflow123456@db.qqvvrffgxuyljictzfqh.supabase.co:5432/postgres';

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("✅ Connected to Postgres");

        // List of migrations to run sequentially
        const migrations = [
            '20240205000001_optimize_bookings_index.sql'
        ];

        for (const file of migrations) {
            const sqlPath = path.join(__dirname, 'supabase', 'migrations', file);
            if (fs.existsSync(sqlPath)) {
                const sql = fs.readFileSync(sqlPath, 'utf8');
                console.log(`⚡ Executing Migration: ${file}...`);
                await client.query(sql);
                console.log(`✅ ${file} applied.`);
            } else {
                console.log(`⚠️ Skipping ${file} (Not found)`);
            }
        }

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.end();
    }
}

run();
