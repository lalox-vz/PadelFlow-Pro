DO $$
DECLARE
    tbl RECORD;
    col RECORD;
    fk RECORD;
BEGIN
    RAISE NOTICE ' ';
    RAISE NOTICE '👇 COPIA DESDE AQUÍ 👇';
    RAISE NOTICE '================================================================================';
    RAISE NOTICE '💀 RADIOGRAFÍA ESTRUCTURAL - PADELFLOW DB';
    RAISE NOTICE 'Date: %', now();
    RAISE NOTICE '================================================================================';

    -- 1. LISTADO MAESTRO DE TABLAS Y COLUMNAS
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        RAISE NOTICE ' ';
        RAISE NOTICE '📦 TABLA: [public.%]', tbl.table_name;
        RAISE NOTICE '   -----------------------------------------------------------------------';
        RAISE NOTICE '   %-30s | %-15s | %s', 'Columna', 'Tipo', 'Nullable?';
        RAISE NOTICE '   -----------------------------------------------------------------------';
        
        FOR col IN 
            SELECT column_name, data_type, is_nullable, udt_name
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = tbl.table_name
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '   %-30s | %-15s | %s', 
                col.column_name, 
                col.udt_name, 
                col.is_nullable;
        END LOOP;
    END LOOP;

    -- 2. MAPA DE RELACIONES (FOREIGN KEYS)
    RAISE NOTICE ' ';
    RAISE NOTICE '================================================================================';
    RAISE NOTICE '🔗 MAPA DE CONEXIONES (Relaciones Activas)';
    RAISE NOTICE '================================================================================';
    
    FOR fk IN 
        SELECT
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
        ORDER BY tc.table_name, kcu.column_name
    LOOP
        RAISE NOTICE ' 👉 [public.%].%  --->  [public.%].%', 
            fk.table_name, fk.column_name, 
            fk.foreign_table_name, fk.foreign_column_name;
    END LOOP;
    
    RAISE NOTICE '================================================================================';
    RAISE NOTICE '👆 COPIA HASTA AQUÍ 👆';
    RAISE NOTICE ' ';
END $$;
