# Mi Equipo - Team Management Page

## ✅ Complete Feature Implementation

### Overview
New team management system that allows club owners to manage their organization members, invite new team members, and control access permissions.

## 🎯 Features Implemented

### 1. New Route
- **Path**: `/team`
- **Access Level**: `club_owner` and `platform_admin` only
- **Location in Sidebar**: Below "Socios Fijos"

### 2. Team Member Display
**Table Columns**:
- **Nombre**: Full name of team member
- **Email**: Member's email address
- **Rol**: Badge showing role (Socio o Staff)
  - `club_owner` → 🛡️ **Socio** (blue badge)
  - `club_staff` → 👤 **Staff** (green badge)
  - `platform_admin` → 👑 **Admin Plataforma** (purple badge)
- **Fecha de Ingreso**: Join date in Spanish format
- **Acciones**: Remove button (except for current user)

### 3. Invite Member Functionality

**Button**: "➕ Añadir Miembro" (top right)

**Modal Form**:
- Email input (must be registered user)
- Role selector:
  - **Socio** (`club_owner`) - Full access
  - **Staff** (`club_staff`) - Booking management only

**Backend Integration**:
- Uses `invite_user_to_organization()` SQL function
- Updates user's:
  - `organization_id` → Current club's ID
  - `role` → Selected role
  - `has_business` → true
  - `business_type` → 'club'

### 4. Remove Member Functionality

**Protection**:
- Cannot remove yourself
- Confirmation dialog before removal

**Action**:
- Sets `organization_id` → null
- Sets `role` → 'player'
- Sets `has_business` → false
- Sets `business_type` → null

### 5. Permission System

**Access Control**:
```typescript
const canManageTeam = profile?.role === 'club_owner' || profile?.role === 'platform_admin'
```

**Blocked Users**:
- `club_staff` → Shows "Acceso Restringido" message
- Unauthenticated → Redirected by auth middleware
- Players/Students → Blocked

## 📁 Files Created/Modified

### New Files:
1. **`app/(dashboard)/team/page.tsx`**
   - Complete team management page
   - Table display
   - Invite modal
   - Remove functionality

### Modified Files:
1. **`components/dashboard/Sidebar.tsx`**
   - Added "Mi Equipo" link after "Socios Fijos"
   - Icon: `Users`
   - Path: `/team`

## 🎨 UI Components

### Main Page
```
┌─────────────────────────────────────────────┐
│ 👥 Mi Equipo          [➕ Añadir Miembro]  │
│ Gestiona los miembros de tu organización   │
├─────────────────────────────────────────────┤
│ Nombre    │ Email         │ Rol  │ Fecha   │
├───────────┼───────────────┼──────┼─────────┤
│ Carlos    │ carlos@...    │ Socio│ 1 ene   │
│ María     │ maria@...     │ Staff│ 2 ene   │
└─────────────────────────────────────────────┘
Total de miembros: 2
```

### Invite Modal
```
┌────────────────────────────────┐
│ Añadir Miembro al Equipo      │
│                                 │
│ Email del Usuario:             │
│ [usuario@ejemplo.com]          │
│                                 │
│ Rol:                           │
│ [Socio (acceso completo) ▼]   │
│                                 │
│       [Cancelar]  [Invitar]    │
└────────────────────────────────┘
```

## 🔐 Security Features

### RLS (Row Level Security)
Users can only see team members from their own organization:

```sql
SELECT * FROM users 
WHERE organization_id = (current user's org_id)
```

### Permission Checks
1. **Page Level**: Redirects if not owner/admin
2. **Action Level**: Validates permissions before DB operations
3. **Self-Protection**: Cannot remove yourself

## 🧪 Testing Steps

### As Club Owner (Carlos):

1. **Navigate to Team Page**
   - Click "Mi Equipo" in sidebar
   - Should see current team members

2. **Invite New Member**
   - Click "➕ Añadir Miembro"
   - Enter email of existing user
   - Select role (Socio or Staff)
   - Click "Invitar"
   - Should see success toast
   - Table should refresh with new member

3. **Remove Member**
   - Click trash icon next to member
   - Confirm removal
   - Should see success toast
   - Member disappears from table

4. **Try to Remove Self**
   - Should show error: "No puedes eliminarte a ti mismo"

### As Club Staff:

1. **Try to Access Team Page**
   - Navigate to `/team`
   - Should see "Acceso Restringido" message
   - Cannot see team list

### As Platform Admin (Eduardo):

1. **Access Any Club's Team**
   - Can see all organizations
   - Can manage all teams
   - Has full access

## 📊 Database Queries

### Fetch Team Members
```typescript
supabase
  .from('users')
  .select('id, full_name, email, role, created_at')
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
```

### Invite User
```typescript
supabase.rpc('invite_user_to_organization', {
  p_email: 'user@example.com',
  p_organization_id: 'club-id',
  p_role: 'club_staff'
})
```

### Remove Member
```typescript
supabase
  .from('users')
  .update({
    organization_id: null,
    role: 'player',
    has_business: false,
    business_type: null
  })
  .eq('id', memberId)
```

## 🎯 Use Cases

### 1. Adding a Partner (Socio)
Carlos wants to add his business partner Luis:
1. Luis registers on platform
2. Carlos goes to "Mi Equipo"
3. Clicks "Añadir Miembro"
4. Enters luis@ejemplo.com
5. Selects "Socio (acceso completo)"
6. Luis can now access all club features

### 2. Adding Staff
Carlos hires María to manage bookings:
1. María registers on platform
2. Carlos adds her as "Staff"
3. María can manage calendar/bookings
4. María CANNOT access team management

### 3. Removing Member
Staff member quits:
1. Carlos clicks remove icon
2. Confirms removal
3. User loses access to club
4. User reverts to regular player

## ✅ Success Criteria

- [x] Page accessible only to owners/admins
- [x] Team members displayed in table
- [x] Can invite new members
- [x] Can remove members (except self)
- [x] Role badges displayed correctly
- [x] Sidebar link added
- [x] Permission checks working
- [x] Toasts for all actions
- [x] Responsive design
- [x] Spanish localization

---

**Status**: Fully implemented and ready to use! 🎉
