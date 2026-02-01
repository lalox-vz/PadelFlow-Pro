const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Padelflow123456@db.qqvvrffgxuyljictzfqh.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("✅ Conectado a Postgres");

        // 1. Columnas de 'courts'
        console.log("\n--- Estructura de tabla 'courts' ---");
        const resCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'courts'
      ORDER BY ordinal_position;
    `);
        resCols.rows.forEach(row => console.log(`${row.column_name} (${row.data_type})`));

        // 2. Policies de 'courts'
        console.log("\n--- RLS Policies en 'courts' ---");
        const resPol = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'courts';
    `);
        resPol.rows.forEach(row => console.log(`Policy: ${row.policyname} | Cmd: ${row.cmd} | Qual: ${row.qual}`));

        // 3. Datos de prueba
        console.log("\n--- Datos de muestra en 'courts' (Limit 5) ---");
        const resData = await client.query('SELECT * FROM courts LIMIT 5');
        console.log(resData.rows);

        // 4. Verificación específica del usuario y sus canchas (si se conoce el orgId)
        // Pero primero necesitamos saber cuál es el orgId real de ese usuario.
        const userId = '70e8610d-2c9b-403f-bfd2-21a279251b1b';
        console.log(`\n--- Buscando usuario ${userId} ---`);
        const resUser = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (resUser.rows.length > 0) {
            const user = resUser.rows[0];
            console.log("Usuario encontrado:", user);
            // Usar organization_id del usuario para buscar courts
            const orgId = user.organization_id; // o club_id segun schema que veamos

            console.log(`\n--- Buscando canchas para Org ID calculado: ${orgId} ---`);
            // Intentamos query con organization_id si existe columna, o club_id
            // Para el script seremos dinámicos o probaremos ambas?
            // Mejor ver el output de cols primero, pero en el script podemos intentar hacer query dinamico o 'select *'

            // Haremos un select * filtrando por lo que tenga sentido
            // Pero ya con el dump de 'courts' veremos la columna de link.
        } else {
            console.log("Usuario no encontrado en tabla users");
        }

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.end();
    }
}

run();
