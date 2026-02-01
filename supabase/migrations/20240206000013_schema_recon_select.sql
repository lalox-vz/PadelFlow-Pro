-- ==============================================================================
-- PROTOCOLO DE VISIBILIDAD: SCHEMA RECONNAISSANCE (SELECT MODE)
-- Description: Returns the schema structure as a standard query result set.
-- ==============================================================================

SELECT 
    table_name, 
    column_name, 
    udt_name as exact_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
