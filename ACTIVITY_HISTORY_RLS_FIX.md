# Activity History Fix - RLS Permissions

## Problem Diagnosis

**Symptom**: Activity history shows "Sin actividad reciente" despite making edits
**Root Cause**: RLS (Row Level Security) policies on `booking_logs` table too restrictive

## Solution Implemented

### 1. New Migration File
**File**: `supabase/migrations/20240202000002_fix_booking_logs_rls.sql`

### 2. RLS Policies Created

#### Policy 1: INSERT Permission
```sql
CREATE POLICY "allow_authenticated_insert_logs" 
ON public.booking_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);
```
**Purpose**: Allow ANY authenticated user to create activity logs
**Rationale**: Staff need to log their actions without complex permission checks

#### Policy 2: SELECT Permission
```sql
CREATE POLICY "allow_org_users_select_logs" 
ON public.booking_logs 
FOR SELECT 
TO authenticated 
USING (
    -- Platform admins see all logs
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'platform_admin'
    OR
    -- Organization members see their org's logs
    EXISTS (
        SELECT 1 
        FROM public.bookings b
        JOIN public.users u ON u.id = auth.uid()
        WHERE b.id = booking_logs.booking_id 
        AND b.entity_id = u.organization_id
    )
);
```
**Purpose**: 
- Organization members can view logs for their organization's bookings
- Platform admins can view all logs

### 3. Enhanced Error Logging

**Location**: `app/(dashboard)/club/calendar/page.tsx` in `handleUpdateBooking`

**What was added**:
```typescript
console.log('📝 Attempting to insert activity log...', {
    booking_id: bookingId,
    user_id: user?.id,
    action: 'updated'
})

const { data: logData, error: logError } = await supabase
    .from('booking_logs')
    .insert({...})
    .select()

if (logError) {
    console.error('❌ Error inserting log:', {
        code: logError.code,
        message: logError.message,
        details: logError.details,
        hint: logError.hint
    })
}
```

## Expected Console Output

### Before Migration (Error):
```
📝 Attempting to insert activity log...
❌ Error inserting log: {
  code: "42501",
  message: "new row violates row-level security policy",
  details: "Policy denied insert on table booking_logs"
}
⚠️ Could not create manual log: [error object]
```

### After Migration (Success):
```
📝 Attempting to insert activity log... {booking_id: "abc", user_id: "123", action: "updated"}
✅ Manual activity log created: [{id: "xyz", booking_id: "abc", ...}]
🔍 Fetching logs from database for booking: abc
✅ Logs fetched successfully: [2 items]
```

## Testing Steps

1. **Run Migration**
   - Migration will auto-apply
   - Or run manually in Supabase SQL Editor

2. **Make a Test Edit**
   - Log in as Carlos (club_owner)
   - Edit a booking (change name, time, or payment status)
   - Click "Guardar Cambios"

3. **Check Console**
   - Should see "📝 Attempting to insert activity log..."
   - Should see "✅ Manual activity log created: [...]"
   - Should NOT see error code 42501 or 403

4. **Verify Activity History**
   - Close and reopen the modal
   - Should see activity feed with your change
   - Should show your name and "hace X minutos"

5. **Test Multiple Users**
   - Carlos should only see his club's logs
   - Eduardo (platform_admin) should see all logs

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `42501` | RLS policy violation | Migration fixes this |
| `403` | Permission denied | Check user authentication |
| `PGRST200` | No relationship | FK migration already applied |
| `23503` | Foreign key violation | Check user_id exists in users table |

## Rollback Plan

If issues occur, run:
```sql
-- Temporarily disable RLS for debugging
ALTER TABLE public.booking_logs DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE public.booking_logs ENABLE ROW LEVEL SECURITY;
```

## Files Modified

1. **New**: `supabase/migrations/20240202000002_fix_booking_logs_rls.sql`
   - Drops old restrictive policies
   - Creates permissive INSERT policy
   - Creates organization-scoped SELECT policy

2. **Updated**: `app/(dashboard)/club/calendar/page.tsx`
   - Enhanced error logging
   - Shows exact error codes and messages
   - Uses `.select()` to return created log

## Success Criteria

✅ No RLS errors in console
✅ Activity logs insert successfully  
✅ Activity history displays in modal
✅ Shows "actualizó hace X minutos"
✅ Only organization members see their logs
✅ Platform admins see all logs

---

**Status**: Ready to test after migration runs! 🚀
