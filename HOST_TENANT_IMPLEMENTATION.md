# 🏗️ HOST-TENANT ARCHITECTURE - Implementation Guide

## ✅ COMPLETED (Just Now)

### 1. **Database Migration** 
**File**: `supabase/migrations/20240126000000_host_tenant_linking.sql`

**What it does**:
- ✅ Adds `host_club_id` to entities table
- ✅ Constraint: Academies MUST have a host club, Clubs CANNOT
- ✅ Links academy_classes to club courts
- ✅ RLS policies: Academies can VIEW host club courts/schedules
- ✅ Conflict checking function: Prevents overlapping classes
- ✅ View: `user_workspaces` shows all businesses owned by user

### 2. **Workspace Context**
**File**: `context/WorkspaceContext.tsx`

**What it does**:
- ✅ Fetches all workspaces (clubs + academies) for current user
- ✅ Tracks active workspace in localStorage
- ✅ Provides `isIntegratedOwner` flag (owns both)
- ✅ Reloads page on workspace switch to update context

### 3. **Workspace Switcher UI**
**File**: `components/WorkspaceSwitcher.tsx`

**What it does**:
- ✅ Dropdown in header to switch between Club ↔ Academy
- ✅ Shows host club name under academy workspaces
- ✅ Only visible if user owns multiple workspaces
- ✅ Visual indicators (icons, badges, checkmark)

---

## 🚧 TODO (Next Steps)

### **CRITICAL PATH - Must Do In Order:**

#### **Step 1: Apply Migration** ⚠️
```bash
# Run in Supabase SQL Editor:
supabase/migrations/20240126000000_host_tenant_linking.sql
```

#### **Step 2: Add Workspace Provider to App**
**File to edit**: `app/layout.tsx` or wherever AuthContext is provided

**Add**:
```tsx
import { WorkspaceProvider } from '@/context/WorkspaceContext'

// Wrap children with:
<AuthContext>
  <WorkspaceProvider>
    {children}
  </WorkspaceProvider>
</AuthContext>
```

#### **Step 3: Add Switcher to Navbar**
**File to edit**: `components/marketing/Navbar.tsx`

**Add (after logo, before user menu)**:
```tsx
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'

// In the header JSX:
{user && <WorkspaceSwitcher />}
```

#### **Step 4: Update Academy Registration - Add Club Selection**
**File to edit**: `app/register-business/academy/page.tsx`

**Changes needed**:
1. Add state for available clubs:
```tsx
const [availableClubs, setAvailableClubs] = useState([])
```

2. Fetch clubs in useEffect:
```tsx
useEffect(() => {
  const fetchClubs = async () => {
    const { data } = await supabase
      .from('entities')
      .select('id, name')
      .eq('type', 'CLUB')
    setAvailableClubs(data || [])
  }
  fetchClubs()
}, [])
```

3. Add club selector to Step 1 (Perfil):
```tsx
<Label>Club Anfitrión  *</Label>
<Select
  value={formData.host_club_id}
  onValueChange={(value) => updateField('host_club_id', value)}
>
  <SelectTrigger>
    <SelectValue placeholder="Selecciona el club donde operas" />
  </SelectTrigger>
  <SelectContent>
    {availableClubs.map(club => (
      <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

4. Update save function to include host_club_id:
```tsx
const payload = {
  owner_id: user.id,
  type: 'ACADEMY',
  name: name,
  host_club_id: formData.host_club_id, // ADD THIS
  details: detailsData,
  updated_at: new Date().toISOString()
}
```

#### **Step 5: Update Academy Schedule Page - Use Club Courts**
**File to edit**: `app/(dashboard)/academy/schedule/page.tsx`

**Major changes**:
1. Fetch courts from HOST CLUB instead of academy:
```tsx
// Get academy's host club ID
const { data: academy } = await supabase
  .from('entities')
  .select('host_club_id')
  .eq('id', academyId)
  .single()

// Fetch courts from the host club
const { data: courts } = await supabase
  .from('courts')
  .select('*')
  .eq('club_id', academy.host_club_id)
```

2. Update Add Class modal to include court selection:
```tsx
<Label>Cancha</Label>
<Select
  value={newClass.court_id}
  onValueChange={(value) => setNewClass(prev => ({ ...prev, court_id: value }))}
>
  <SelectTrigger>
    <SelectValue placeholder="Selecciona cancha" />
  </SelectTrigger>
  <SelectContent>
    {courts.map(court => (
      <SelectItem key={court.id} value={court.id}>
        {court.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

3. Update handleAddClass to include court_id:
```tsx
const { data, error } = await supabase
  .from('academy_classes')
  .insert({
    academy_id: academyId,
    court_id: newClass.court_id, // ADD THIS
    title: newClass.title,
    // ... rest
  })
```

---

## 🎯 CRITICAL PSYCHOLOGY POINTS

### **For Integrated Owners (Own Club + Academy)**:
- Header shows **Workspace Switcher** prominently
- Switching feels instant (localStorage + reload)
- Visual clarity: Club = Blue badge, Academy = Purple badge
- Shows "en [Club Name]" under academy to reinforce relationship

### **For Academy-Only Owners**:
- No switcher shown (no confusion)
- Must select host club during registration
- Schedule shows "courts from [Club Name]"
- Classes automatically respect club inventory

### **Conflict Prevention**:
- Database trigger blocks overlapping classes
- User-friendly error: "Another class is already scheduled at this time"
- Visual calendar shows existing bookings before creating

---

## 📊 DATA FLOW

### **Old (Wrong) Flow**:
```
Academy → academy_classes → academy owns time slots
```

### **New (Correct) Flow**:
```
Club → owns courts → master schedule
  ↓
Academy → books court time → creates academy_classes (with court_id)
  ↓
Trigger checks conflicts → blocks if overlap
  ↓
Success: Court blocked for academy class
```

---

## 🔒 RLS SECURITY

**Club Owner**:
- ✅ Can see ALL bookings on their courts (including academy classes)
- ❌ Cannot see academy's student billing data
- ❌ Cannot see academy's private details

**Academy Owner**:
- ✅ Can see host club's court list (readonly)
- ✅ Can see host club's schedule (to avoid conflicts)
- ✅ Can create classes on host club courts
- ❌ Cannot see club's revenue data
- ❌ Cannot modify club's courts or settings

**Integrated Owner**:
- ✅ Full access to Club panel when workspace = Club
- ✅ Full access to Academy panel when workspace = Academy
- ✅ Can switch between workspaces instantly

---

## ⚠️ BREAKING CHANGES

1. **Existing academies in DB** will fail constraint (no host_club_id)
   - Solution: Manually set host_club_id for existing academies
   - Or drop constraint temporarily for migration

2. **Academy schedule page** currently doesn't use courts
   - Solution: Update as described in Step 5 above

3. **Academy registration** doesn't ask for club
   - Solution: Update as described in Step 4 above

---

## 🧪 TESTING CHECKLIST

### **Scenario 1: New Academy Registration**
- [ ] Step 1 shows club selector dropdown
- [ ] Cannot proceed without selecting a club
- [ ] Academy saves with host_club_id

### **Scenario 2: Integrated Owner**
- [ ] Header shows workspace switcher
- [ ] Can switch between Club and Academy
- [ ] Page reloads and shows correct dashboard

### **Scenario 3: Academy Class Creation**
- [ ] Schedule page shows host club's courts
- [ ] Can select court when creating class
- [ ] Error if class overlaps with existing class on same court/time
- [ ] Success creates class with court_id reference

### **Scenario 4: Club View**
- [ ] Club owner can see their own courts
- [ ] Club schedule shows academy classes as bookings
- [ ] Academy classes are marked differently (future enhancement)

---

## 🚀 IMPLEMENTATION ORDER

**Priority 1 (MUST DO NOW)**:
1. ✅ Run database migration
2. ✅ Add WorkspaceProvider to app
3. ✅ Add WorkspaceSwitcher to Navbar
4. Update academy registration (club selection)

**Priority 2 (BEFORE ACADEMY LAUNCH)**:
5. Update academy schedule to use club courts
6. Test conflict checking
7. Update RLS policies if needed

**Priority 3 (FUTURE)**:
8. Community linking (player claiming)
9. Coach personal agenda
10. Unified schedule view for clubs (show academy classes)

---

**Status**: Foundation complete, awaiting manual steps to wire up UI.
**Next**: User needs to run migration and add providers to app layout.
