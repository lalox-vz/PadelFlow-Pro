---
name: analyzing-ui
description: strict frontend inspector. Forces reading actual .tsx files/Tailwind classes before suggesting changes. Prevents hallucinating styles. Triggers include "visual bug", "css", "tailwind", "layout", "color wrong", "button style".
---

# Analyzing UI

## When to use this skill
- visual bug
- css
- tailwind
- layout
- color wrong
- button style

## Workflow
1. Read CORE_ARCHITECTURE.md as the Absolute Source of Truth.
2. Locate the relevant component or page file.
3. **READ THE FILE**: Use `view_file` to see the actual code and Tailwind classes.
4. Detect conditional rendering logic that might affect display.
5. Plan the style or layout update.
6. Apply changes.
7. Update CORE_ARCHITECTURE.md if structure changed.

## Instructions
- **No Hallucinations**: DO NOT GUESS CLASSES. Read the file first.
- **Consistency**: Ensure new styles match the existing design system tokens.
- **Conditional Logic**: Pay close attention to ternary operators and conditional rendering that might be hiding/showing elements unexpected.

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
