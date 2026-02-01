# PadelFlow: Role Hierarchy & Audit System - Implementation Guide

## Overview
Complete role-based access control with audit logging for booking operations.

## 1. Role Hierarchy

### Roles (in order of authority):
1. **`platform_admin`** - Eduardo (full system access)
2. **`club_owner`** - Carlos & partners (manage their club)
3. **`club_staff`** - Employees (manage bookings for their club)
4. **`academy_owner`** - Academy owners
5. **`coach`** - Training instructors
6. **`player`** - Regular customers
7. **`student`** - Academy students

## 2. Pre-configured Users

### Platform Admin
- **Email**: eduardogarciavega92@gmail.com
- **Role**: `platform_admin`
- **Access**: All entities, all organizations

### Club Owner
- **Email**: carlos@gmail.com
- **Role**: `club_owner`
- **Access**: His club's data only

## 3. Audit Logging System

### booking_logs Table
```sql
- id: UUID (primary key)
- booking_id: UUID (references bookings)
- user_id: UUID (who made the change)
- action: TEXT ('created', 'updated', 'cancelled', 'payment_updated')
- notes: TEXT (description of changes)
- created_at: TIMESTAMPTZ
```

### Automatic Logging
Trigger automatically logs:
- ✅ Booking creation
- ✅ Field changes (name, payment, time, court)
- ✅ Cancellations
- ✅ Who made each change

## 4. Multi-Owner Support

### Invite Function
Club owners can invite:
- Partners as `club_owner`
- Staff as `club_staff`

```typescript
// Usage example
await supabase.rpc('invite_user_to_organization', {
  p_email: 'partner@example.com',
  p_organization_id: clubId,
  p_role: 'club_owner'
})
```

## 5. Security (RLS Policies)

### Bookings Table
- **Platform admins**: Full access to all bookings
- **Owners/Staff**: Can only see/edit their organization's bookings
- **Players**: Can only see/edit their own bookings

### Entities Table
- **Platform admins**: Full access
- **Owners/Staff**: Can manage their entity
- **Public**: Can view entities (for browsing)

### Booking Logs Table
- **Platform admins**: View all logs
- **Owners/Staff**: View logs for their organization's bookings
- **All authenticated**: Can insert logs

## 6. Migration File

**Location**: `supabase/migrations/20240202000000_role_hierarchy_and_audit.sql`

### What it does:
1. Creates new role enum with full hierarchy
2. Creates `booking_logs` table
3. Sets up RLS policies for security
4. Creates automatic logging trigger
5. Assigns roles to Eduardo & Carlos
6. Creates multi-owner invite function

## 7. TypeScript Updates

### Updated Types
```typescript
export type UserRole = 
  | 'platform_admin' 
  | 'club_owner' 
  | 'academy_owner' 
  | 'club_staff' 
  | 'coach' 
  | 'player' 
  | 'student'

export interface BookingLog {
  id: string
  booking_id: string
  user_id: string | null
  action: 'created' | 'updated' | 'cancelled' | 'payment_updated'
  notes: string | null
  created_at: string
  user?: {
    full_name: string | null
    email: string | null
  }
}
```

## 8. Next Steps

### To Complete Integration:

1. **Run Migration**
   ```bash
   # The migration file is already created
   # Supabase will auto-apply it, or run manually
   ```

2. **Add Activity History to Modal**
   - Fetch `booking_logs` when opening edit modal
   - Display chronological activity feed
   - Show who made each change and when

3. **Implement Multi-Owner UI**
   - Create "Team Management" page for owners
   - Allow inviting partners and staff
   - Display current team members

4. **Test Permissions**
   - Log in as Eduardo → should see all data
   - Log in as Carlos → should see only his club
   - Create staff account → should see only assigned org

## 9. Payment Indicators (Already Implemented)

Visual indicators in calendar:
- ✅ Green "Pagado" for paid bookings
- ⚠️ Amber "Pendiente" for unpaid bookings

## 10. Querying Logs (Examples)

### Get logs for a booking
```typescript
const { data: logs } = await supabase
  .from('booking_logs')
  .select(`
    *,
    user:users(full_name, email)
  `)
  .eq('booking_id', bookingId)
  .order('created_at', { ascending: false })
```

### Get recent activity for organization
```typescript
const { data: logs } = await supabase
  .from('booking_logs')
  .select(`
    *,
    booking:bookings!inner(entity_id),
    user:users(full_name, email)
  `)
  .eq('booking.entity_id', orgId)
  .order('created_at', { ascending: false })
  .limit(50)
```

## Summary

✅ **Role hierarchy** with 7 distinct levels
✅ **Automatic audit logging** for all booking changes
✅ **Multi-owner support** via invite function
✅ **RLS security** - users only see their data
✅ **Platform admin** access for Eduardo
✅ **Club owner** role for Carlos
✅ **Payment indicators** in calendar grid
✅ **TypeScript types** updated

**Status**: Database layer complete, ready for UI integration!
