# CRITICAL FIX - Activity History Complete Solution

## 🚨 Root Cause Identified

**PGRST200 Error**: Database doesn't recognize relationship between `booking_logs` and `users`
**Reason**: Foreign key constraint not properly established

## ✅ Complete Fix Applied

### Migration: `20240202000003_critical_booking_logs_fix.sql`

This migration does **EVERYTHING** in one go:

1. ✅ **Drops all old FK constraints**
2. ✅ **Creates proper FK**: `booking_logs.user_id` → `users.id`
3. ✅ **Grants permissions** to authenticated users
4. ✅ **Drops all old RLS policies** (clean slate)
5. ✅ **Creates simple RLS policies**:
   - INSERT: Any authenticated user can log
   - SELECT: Organization members see their logs, admins see all
6. ✅ **Creates indexes** for performance
7. ✅ **Verifies everything** works

### Code Changes

**File**: `app/(dashboard)/club/calendar/page.tsx`

**Added**:
- User ID validation before logging
- User email in debug output
- No more `|| null` fallback (uses actual user.id)

## 📊 What You'll See in Console

### Success Path:
```
📝 Attempting to insert activity log... {
  booking_id: "abc-123-def",
  user_id: "user-456-ghi",
  user_email: "carlos@gmail.com",
  action: "updated"
}
✅ Manual activity log created: [{
  id: "log-789",
  booking_id: "abc-123-def",
  user_id: "user-456-ghi",
  action: "updated",
  notes: "Actualización manual: Juan Pérez, Pago: paid",
  created_at: "2026-01-22T17:30:00Z"
}]

🔍 Fetching logs from database for booking: abc-123-def
✅ Logs fetched successfully: [1 item]
```

### Error Paths:

**No User ID**:
```
⚠️ No user ID available for logging
⚠️ Could not create manual log: User not authenticated
```

**RLS Policy Error** (should be fixed by migration):
```
❌ Error inserting log: {
  code: "42501",
  message: "new row violates row-level security policy"
}
```

**FK Relationship Error** (should be fixed by migration):
```
PGRST200: Could not find a relationship between booking_logs and users
```

## 🧪 Testing Steps

### Step 1: Run Migration
Migration should auto-apply. Check Supabase logs for:
```
✅ Foreign key booking_logs -> users created
✅ ALL CHECKS PASSED - Activity history should work!
```

### Step 2: Test as Carlos

1. **Log in** as carlos@gmail.com
2. **Edit a booking**:
   - Change name
   - Toggle payment status
   - Or change time
3. **Click "Guardar Cambios"**
4. **Check console** for:
   - `📝 Attempting to insert activity log...`
   - `✅ Manual activity log created:`
   - NO PGRST200 error
   - NO 42501 error

### Step 3: Verify History

1. **Close modal**
2. **Reopen same booking**
3. **Scroll to "Historial de Cambios"**
4. **Should see**:
   ```
   Carlos actualizó                    hace menos de 1 min
   Actualización manual: Juan Pérez, Pago: paid
   ```

### Step 4: Test Multi-User

1. **As Carlos**: Edit booking → Should see in history
2. **As Eduardo** (platform_admin): Should see Carlos's edit
3. **As different club owner**: Should NOT see Carlos's logs

## 🔍 Debugging Commands

### Check FK Exists:
```sql
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'booking_logs'
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Expected**: booking_logs_user_id_fkey → users(id)

### Check RLS Policies:
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'booking_logs';
```

**Expected**:
- `allow_insert_logs` (FOR INSERT)
- `allow_select_logs` (FOR SELECT)

### Manual Test Insert:
```sql
-- As logged-in user
INSERT INTO booking_logs (booking_id, user_id, action, notes)
VALUES (
    'existing-booking-id',
    auth.uid(),
    'manual_test',
    'Test from SQL editor'
);
```

**Should succeed** without RLS error.

### Manual Test Select:
```sql
SELECT 
    bl.*,
    u.full_name,
    u.email
FROM booking_logs bl
LEFT JOIN users u ON u.id = bl.user_id
WHERE bl.booking_id = 'existing-booking-id';
```

**Should return results** with user info joined.

## ✅ Success Criteria

- [ ] Migration runs without errors
- [ ] FK constraint exists: `booking_logs_user_id_fkey`
- [ ] 2 RLS policies exist on `booking_logs`
- [ ] Console shows `✅ Manual activity log created`
- [ ] NO PGRST200 error
- [ ] NO 42501 RLS error
- [ ] Activity history displays in modal
- [ ] Shows user name and time
- [ ] Updates in real-time

## 🆘 If Still Not Working

1. **Check Supabase Dashboard** → Table Editor → booking_logs → Relationships
   - Should see: `user_id` → `public.users.id`

2. **Check Current User**:
   ```typescript
   console.log('Current user:', user)
   ```
   - Should have `id` property

3. **Try Direct SQL**:
   - Run the test insert command above
   - If it fails, RLS is still blocking

4. **Temporary Disable RLS** (for testing only):
   ```sql
   ALTER TABLE booking_logs DISABLE ROW LEVEL SECURITY;
   ```
   - Test again
   - If works, RLS policy is the issue
   - Re-enable: `ALTER TABLE booking_logs ENABLE ROW LEVEL SECURITY;`

---

**Status**: Complete comprehensive fix - should resolve all activity history issues! 🚀
