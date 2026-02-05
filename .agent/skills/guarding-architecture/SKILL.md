---
name: guarding-architecture
description: Handles database migrations, schema changes, and strict type enforcement (UUIDs). Prevents data loss and ensures referential integrity. Triggers include "database", "migration", "schema", "sql", "booking logic", "relations".
---

# Guarding Architecture

## When to use this skill
- database
- migration
- schema
- sql
- booking logic
- relations

## Workflow
1. Read CORE_ARCHITECTURE.md as the Absolute Source of Truth.
2. Analyze current schema state using `list_dir` on `supabase/migrations`.
3. Plan the migration or schema change.
4. Verify strict type enforcement (UUIDs).
5. Check for "ON DELETE CASCADE" risks.
6. Generate SQL or code changes.
7. Update CORE_ARCHITECTURE.md if structure changed.

## Instructions
- **Referential Integrity**: Ensure `member_id` linkage is enforced where applicable.
- **Data Protection**: Never allow `ON DELETE CASCADE` on financial data (invoices, payments, bookings).
- **Type Safety**: Strictly enforce UUIDs for primary and foreign keys.
- **Migration creation**: When creating migrations, ensure they are idempotent and safe to run.

## Output Standards
Header Protocol (The Shield):

You MUST start your response with: "🛡️ [Skill Name] Active."

Example: "🛡️ Analyzing UI Active."

Pre-computation:

Explicitly confirm you have read CORE_ARCHITECTURE.md before answering.

Footer Protocol (The Log):

You MUST end every response with a documentation status status using the 📝 emoji.

Option A (If changed): "📝 Documentación actualizada: [Breve resumen del cambio]."

Option B (If no change): "📝 Sin cambios en doc requeridos ([Razón])."
