const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Fallback to local connection string if env var not set, or use the one from previous attempts
const connectionString = "postgresql://postgres:postgres@localhost:54322/postgres";

const client = new Client({
    connectionString: connectionString,
});

async function extractSchema() {
    try {
        await client.connect();

        const sql = `
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name IN ('bookings', 'courts', 'club_members', 'recurring_plans', 'entities')
        ORDER BY table_name, column_name;
    `;

        const res = await client.query(sql);

        console.table(res.rows);

        // Save to a file for analysis
        fs.writeFileSync('schema_audit.json', JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error('❌ Schema extraction failed:', err);
    } finally {
        await client.end();
    }
}

extractSchema();
