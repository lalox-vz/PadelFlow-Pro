-- DIAGNOSTIC QUERY: Check Constraints and Indexes on club_members
-- Run this in your Supabase SQL Editor to verify the current state of the table.

SELECT 
    schemaname, 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'club_members';

SELECT 
    conname AS constraint_name, 
    contype AS constraint_type, 
    pg_get_constraintdef(c.oid) AS constraint_definition 
FROM pg_constraint c 
JOIN pg_namespace n ON n.oid = c.connamespace 
WHERE conrelid = 'public.club_members'::regclass;
