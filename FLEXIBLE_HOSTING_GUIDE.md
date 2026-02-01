# 🔔 FLEXIBLE HOSTING & NOTIFICATION SYSTEM

## 🎯 **ARCHITECTURAL SHIFT**

### **From Rigid to Request-Based:**

```
BEFORE (Phase 1):
Academy → MUST link to club (database constraint)
Coach → MUST belong to academy
Simple workspace switcher (Club/Academy only)

AFTER (Phase 2 - NOW):
Academy → CAN operate independently OR request hosting
Coach → CAN work independently OR join academies
Multi-role switcher (Player/Coach/Club/Academy)
Global notification system with actionable alerts
```

---

## ✅ **COMPLETED (Step 1)**

### **1. Database Migration**
**File**: `supabase/migrations/20240127000000_flexible_hosting_notifications.sql`

**What it does**:
- ✅ Removed rigid `host_club_id` constraint
- ✅ Made `academy_id` nullable for coaches
- ✅ Created `hosting_requests` table (Academy → Club)
- ✅ Created `coach_invitations` table (Academy → Coach)
- ✅ Created `student_requests` table (Academy → Player)
- ✅ Created `notifications` table (global event system)
- ✅ Auto-linking triggers (approve request → update database)
- ✅ RLS policies for all new tables

### **2. Notification Bell Component**
**File**: `components/NotificationBell.tsx`

**What it does**:
- ✅ Real-time notification updates (Supabase subscriptions)
- ✅ Unread count badge
- ✅ Actionable buttons (Accept/Decline/View)
- ✅ Priority-based colors
- ✅ Marks notifications as read via RPC

---

## 🚧 **TODO - Implementation Steps**

### **Step 1: Run Migration** ⚠️
```sql
-- In Supabase SQL Editor:
supabase/migrations/20240127000000_flexible_hosting_notifications.sql
```

### **Step 2: Add Notification Bell to Navbar**
**File to edit**: `components/marketing/Navbar.tsx`

```tsx
import { NotificationBell } from '@/components/NotificationBell'

// In the navbar JSX, add before WorkspaceSwitcher:
{user && <NotificationBell />}
```

### **Step 3: Update Academy Registration** 
**File**: `app/register-business/academy/page.tsx`

**Make club selection optional**:
```tsx
<div className="space-y-2">
    <Label>Club Anfitrión (Opcional)</Label>
    <Select
        value={(formData as any).host_club_id || ''}
        onValueChange={(value) => updateField('host_club_id' as any, value)}
    >
        <SelectTrigger>
            <SelectValue placeholder="Selecciona un club o déjalo vacío para operar independientemente" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="">Operar independientemente</SelectItem>
            {availableClubs.map(club => (
                <SelectItem key={club.id} value={club.id}>
                    {club.name}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">
        Puedes solicitar vinculación después si lo prefieres
    </p>
</div>
```

### **Step 4: Create "Request Hosting" Flow**
**New file**: `app/(dashboard)/academy/request-hosting/page.tsx`

**Purpose**: Let independent academies browse clubs and request hosting

```tsx
// Pseudo-code structure:
export default function RequestHostingPage() {
    const [clubs, setClubs] = useState([])
    const [selectedClub, setSelectedClub] = useState(null)

    // Fetch all clubs
    useEffect(() => {
        fetchClubs()
    }, [])

    // Send request
    const handleRequestHosting = async () => {
        await supabase.from('hosting_requests').insert({
            academy_id: academyId,
            club_id: selectedClub.id,
            message: '...'
        })

        // This triggers notification to club owner automatically
        toast({ title: "Solicitud enviada!" })
    }

    return (
        // UI to browse clubs and send request
    )
}
```

### **Step 5: Create Notification Response Pages**
**New file**: `app/(dashboard)/notifications/page.tsx`

**Purpose**: Centralized page to view and respond to all notifications

### **Step 6: Update Workspace Switcher for Multi-Role**
**File**: `context/WorkspaceContext.tsx` + `components/WorkspaceSwitcher.tsx`

**Changes needed**:
1. Fetch not just entities, but also coach role, player status
2. Allow switching between Player/Coach/Club/Academy
3. Store active role in localStorage

**Example structure**:
```tsx
interface Workspace {
    role: 'player' | 'coach' | 'club' | 'academy'
    id: string
    name: string
    // ...
}

// User can have:
// - Player role (always)
// - Coach role (if they're a coach)
// - Club entity (if they own one)
// - Academy entity (if they own one)
```

---

## 📊 **DATA FLOW EXAMPLES**

### **Example 1: Academy Requests Hosting**

```
1. Academy Owner (Independent)
   ↓
2. Navigates to "Request Hosting" page
   ↓
3. Browses list of clubs
   ↓
4. Clicks "Solicitar Vinculación" on "Club Padel Pro"
   ↓
5. Database: INSERT into hosting_requests
   ↓
6. Trigger: CREATE notification for club owner
   ↓
7. Club Owner sees bell icon with "1" badge
   ↓
8. Clicks bell → Sees "Nueva Solicitud de Vinculación"
   ↓
9. Clicks "Aceptar"
   ↓
10. Trigger: UPDATE entities SET host_club_id = club_id
   ↓
11. Academy now has access to club courts!
```

### **Example 2: Academy Invites Coach**

```
1. Academy Owner
   ↓
2. Goes to Coaches page
   ↓
3. Clicks "Invitar Coach"
   ↓
4. Enters email: "carlos@example.com"
   ↓
5. Database: INSERT into coach_invitations
   ↓
6. If user exists: CREATE notification
   ↓
7. Carlos sees bell → "Invitación de Academia"
   ↓
8. Carlos clicks "Aceptar"
   ↓
9. Trigger: UPDATE academy_coaches SET academy_id = academy_id
   ↓
10. Carlos is now part of academy staff!
```

### **Example 3: Multi-Role User Switches Context**

```
User Profile:
- Player: Always
- Coach: Independent coach
- Club Owner: Owns "Padel Pro"
- Academy Owner: Owns "Junior Academy"

Workspace Switcher shows:
┌─────────────────────────────┐
│ [User Icon] Jugador         │ ← Default
│ [Coach Icon] Coach          │
│ [Building] Padel Pro Club   │
│ [School] Junior Academy     │
└─────────────────────────────┘

Click "Coach" →
- Dashboard changes to Coach view
- Shows personal schedule
- Can book courts at player rates
- Can manage private classes
```

---

## 🎨 **NOTIFICATION TYPES (From Image)**

### **Club Owner**
**Critical:**
- New Hosting Request
- Unverified Payments
- Last-minute Cancellations

**Promotional/Social:**
- Club Occupancy Milestones
- New Local Players

### **Academy Owner**
**Critical:**
- Link Request Approved/Denied
- New Student Sign-up

**Promotional/Social:**
- Student Performance Milestones

### **Coach**
**Critical:**
- New Class Assigned
- Student RSVP Changes

**Promotional/Social:**
- "Free Court" alerts for private lessons

### **Player**
**Critical:**
- Booking Confirmation
- Payment Reminders

**Promotional/Social:**
- "Your Level Up" alerts
- Invitations to Academies

---

## 🔒 **SECURITY & PRIVACY**

### **RLS Policies:**
```sql
hosting_requests:
- Academy owners: Can CREATE and VIEW their requests
- Club owners: Can VIEW and UPDATE requests for their club
- Others: No access

notifications:
- Users: Can only view/update their own
- System: Can create (via triggers)

coach_invitations:
- Academy owners: Can CREATE and VIEW
- Invited coaches: Can VIEW and RESPOND
```

### **Data Isolation:**
- Notification content never exposes sensitive data
- Action buttons call secure RPC functions
- All updates go through triggers (validated)

---

## 🚀 **MIGRATION STRATEGY**

### **For Existing Data:**

1. **Existing Academies with host_club_id**:
   - ✅ No change needed
   - Already linked, continue as before

2. **Existing Coaches**:
   - ✅ Set `academy_id` to NULL if independent
   - They can join academies via invitation

3. **Notification Backfill**:
   - No need - start fresh
   - Future events create notifications

---

## 📋 **TESTING CHECKLIST**

### **Test 1: Independent Academy**
- [ ] Register academy WITHOUT selecting club
- [ ] Verify `host_club_id` is NULL
- [ ] Academy dashboard works normally
- [ ] Can manage students/coaches
- [ ] Schedule page shows "No club linked" message

### **Test 2: Hosting Request Flow**
- [ ] Independent academy requests hosting
- [ ] Club owner receives notification
- [ ] Bell shows unread count
- [ ] Club owner clicks "Aceptar"
- [ ] Academy's `host_club_id` updates
- [ ] Academy now sees club courts

### **Test 3: Coach Invitation**
- [ ] Academy sends invite to email
- [ ] Coach receives notification
- [ ] Coach accepts → linked to academy
- [ ] Coach declines → invitation cancelled

### **Test 4: Real-Time Notifications**
- [ ] User A creates request
- [ ] User B's bell updates immediately (no refresh)
- [ ] Unread count increments
- [ ] Click notification → marks as read

---

## 🎯 **NEXT STEPS (For You)**

**Priority 1 (NOW)**:
1. Run migration in SQL Editor
2. Add NotificationBell to Navbar
3. Test bell component

**Priority 2 (SOON)**:
4. Make club selection optional in academy registration
5. Create "Request Hosting" page
6. Create "Invitations" pages

**Priority 3 (FUTURE)**:
7. Enhanced multi-role workspace switcher
8. Notification preferences page
9. Email notifications (optional)

---

## 💡 **PSYCHOLOGICAL UX NOTES**

### **"No Pressure" Onboarding:**
- Academy can start immediately WITHOUT club
- Builds confidence before committing
- Can explore app, add students, plan curriculum
- When ready → Request hosting (not forced)

### **Request-Based Relationships:**
- Feels more "social" and less "contractual"
- Both parties must agree (consent-based)
- Academy can request multiple clubs
- Club can approve/decline based on capacity

### **Actionable Notifications:**
- No ambiguity - clear buttons
- Immediate feedback after action
- Auto-updates relationships
- Real-time without page refresh

---

**Status**: Foundation complete, UI integration needed  
**Architecture**: ✅ Event-driven, request-based, multi-role  
**Next**: Add UI components and test flows
