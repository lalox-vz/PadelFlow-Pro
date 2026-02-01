# Team Invitations System - Complete Implementation

## ✅ Professional Invitation Flow

### Problem Solved
Previously, inviting a non-existent user would fail silently. Now we have a complete pending invitation system.

## 🗄️ Database Schema

### New Table: `invitations`
```sql
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    role user_role NOT NULL,
    organization_id UUID → entities(id),
    invited_by UUID → users(id),
    status TEXT ('pending', 'accepted', 'cancelled'),
    created_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ
);
```

**Unique Constraint**: One pending invitation per email per organization

## 🔄 Invitation Flow

### Scenario 1: Existing User
```
Carlos invites maria@example.com (already registered)
↓
✅ User updated immediately
- organization_id set
- role assigned
- appears in team list instantly
```

### Scenario 2: Non-Existent User
```
Carlos invites juan@example.com (not registered)
↓
📧 Invitation created
- Stored in invitations table
- Shows as "Pendiente" in team list
- Waits for user to register
↓
Juan registers with juan@example.com
↓
🎉 Auto-accepted trigger fires
- User auto-assigned to organization
- Role auto-assigned  
- Invitation marked as 'accepted'
- Now appears as active member
```

### Scenario 3: Cancelled Invitation
```
Carlos makes a mistake with email
↓
❌ Click cancel button
- Invitation status → 'cancelled'
- Removed from pending list
- Can send new invitation
```

## 🎯 Functions

### 1. `invite_or_create_pending()`
**Purpose**: Smart invitation that handles both cases

**Returns**:
```typescript
{
  success: true,
  type: 'existing_user' | 'pending_invitation',
  message: string
}
```

**Logic**:
1. Check if user exists in auth.users
2. If YES → Update user immediately
3. If NO → Create pending invitation

### 2. `auto_accept_invitation()`
**Purpose**: Trigger that runs when new user registers

**Flow**:
1. User registers with email
2. Check if pending invitation exists
3. If YES:
   - Assign organization_id
   - Assign role
   - Mark invitation as accepted

### 3. `cancel_invitation()`
**Purpose**: Cancel a pending invitation

**Action**:
- Sets status to 'cancelled'
- Keeps record for audit trail
- Removes from pending list

## 🎨 UI Updates

### Team Table - Unified View

```
┌────────────────────────────────────────────────────┐
│ 👥 Mi Equipo                  [➕ Añadir Miembro] │
├────────────────────────────────────────────────────┤
│ Nombre/Email      Estado      Rol      Fecha       │
├────────────────────────────────────────────────────┤
│ Carlos López      ✅ Activo   Socio    1 ene      │ ← Existing member
│ carlos@...                                         │
├────────────────────────────────────────────────────┤
│ maria@example.com 🕐 Pendiente Staff   2 ene      │ ← Pending invitation
│ Usuario no reg...                                  │
└────────────────────────────────────────────────────┘
Miembros activos: 1 | Invitaciones pendientes: 1
```

### Status Badges

**Active Member**:
```
✅ Activo (green background)
```

**Pending Invitation**:
```
🕐 Pendiente (gray background)
```

### Action Buttons

**For Active Members**:
- 🗑️ Remove (except yourself)

**For Pending Invitations**:
- ❌ Cancel invitation

## 🔐 Security (RLS)

### View Invitations
```sql
-- Only org owners/admins can see their org's invitations
WHERE organization_id = (user's org_id)
AND role IN ('club_owner', 'platform_admin')
```

### Create Invitations
```sql
-- Only org owners/admins can create invitations
WHERE organization_id = (user's org_id)
AND role IN ('club_owner', 'platform_admin')
```

### Cancel Invitations
```sql
-- Only org owners/admins can cancel their org's invitations
```

## 📊 Use Cases

### Use Case 1: Invite Pre-Registered User
```
1. Carlos clicks "Añadir Miembro"
2. Enters "maria@gmail.com" (already has account)
3. Selects "Staff"
4. Clicks "Invitar"
5. ✅ Toast: "Usuario añadido inmediatamente al equipo"
6. María appears instantly in table as active member
```

### Use Case 2: Invite Future User
```
1. Carlos clicks "Añadir Miembro"
2. Enters "juan@gmail.com" (no account yet)
3. Selects "Socio"
4. Clicks "Invitar"
5. 📧 Toast: "Invitación creada. El usuario será añadido cuando se registre"
6. Juan@gmail.com appears in table as "Pendiente"
7. Later: Juan registers on platform
8. 🎉 Auto-assigned to Carlos's club as Socio
```

### Use Case 3: Wrong Email - Cancel
```
1. Carlos invites "juannn@gmail.com" (typo)
2. Sees it in pending list
3. Clicks ❌ cancel button
4. Confirms cancellation
5. Invitation removed from list
6. Can send new invitation to correct email
```

## 🔄 Auto-Accept Flow Detail

### Trigger: `trigger_auto_accept_invitation`
**Fires**: AFTER INSERT on users table

**Process**:
```sql
1. New user inserts into users table
   email: "juan@example.com"
   
2. Trigger checks invitations table:
   WHERE email = "juan@example.com"
   AND status = 'pending'
   
3. If found:
   - UPDATE users SET:
     * organization_id = invitation.organization_id
     * role = invitation.role
     * has_business = true
     * business_type = 'club'
   
   - UPDATE invitations SET:
     * status = 'accepted'
     * accepted_at = NOW()
```

## 📝 Migration File

**File**: `supabase/migrations/20240202000004_team_invitations_system.sql`

**Includes**:
1. ✅ Create `invitations` table
2. ✅ RLS policies for security
3. ✅ `invite_or_create_pending()` function
4. ✅ `auto_accept_invitation()` trigger
5. ✅ `cancel_invitation()` function
6. ✅ Verification checks

## 🧪 Testing

### Test 1: Existing User
```
Email: carlos@gmail.com (if another user exists)
Expected: Immediate addition, "Activo" status
```

### Test 2: Non-Existent User
```
Email: future@example.com
Expected: "Pendiente" status, gray badge
```

### Test 3: Cancel Invitation
```
1. Create pending invitation
2. Click cancel
3. Should disappear from list
```

### Test 4: Auto-Accept
```
1. Create pending invitation for test@example.com
2. Register new user with test@example.com
3. Check team page - should be active member
4. Check user's organization_id - should match
```

## 📈 Stats Display

**Footer shows**:
```
Miembros activos: 3 | Invitaciones pendientes: 2
Total: 5
```

## ✅ Success Criteria

- [x] Invitations table created
- [x] Smart invite function
- [x] Auto-accept trigger working
- [x] Cancel functionality
- [x] Unified table view
- [x] Status badges (Activo/Pendiente)
- [x] Different actions (Remove/Cancel)
- [x] RLS security
- [x] Error handling
- [x] Toast notifications
- [x] Spanish localization

---

**Status**: Complete professional invitation system! 🎉
Users can now be invited before they register and will automatically join the team when they sign up.
