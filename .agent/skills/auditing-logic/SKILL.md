---
name: auditing-logic
description: Validates business logic, time-based states (cron/expiration), and financial calculations. Detects "Zombie" states or "Orphan" data. Triggers include "bug logic", "calculation error", "status wrong", "expired", "finance mismatch".
---

# Auditing Logic

## When to use this skill
- bug logic
- calculation error
- status wrong
- expired
- finance mismatch

## Workflow
1. Read CORE_ARCHITECTURE.md as the Absolute Source of Truth.
2. Identify the business logic or calculation in question.
3. Validate time-based states (usage of `NOW()`, timezones).
4. Check for "Zombie" states (entities that should be dead/closed but aren't) or "Orphan" data.
5. Verify logical deletion (soft delete) implementation against strict SQL constraints.
6. Propose fixes or logic updates.
7. Update CORE_ARCHITECTURE.md if structure changed.

## Instructions
- **Time Sensitivity**: Validate `NOW()` usage for time-sensitive data. Ensure consistent timezone handling (UTC-4 preferred based on context).
- **State Consistency**: Ensure invalid states are unreachable.
- **Soft Deletes**: Ensure logical deletion matches strict SQL constraints.

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
