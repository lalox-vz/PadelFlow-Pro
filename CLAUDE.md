# PadelFlow - Project Architecture & Development Rules

> **Mission**: Transform legacy Olimpo (gym) codebase into a Venezuela-focused Padel SaaS platform with strict Role-Based Access Control (RBAC).

---

## 🎯 Core Principles

### 1. **Padel-First Logic**
- This is NOT a gym management system
- All references to "entrenamientos", "planes", "galería" are LEGACY and must be removed
- Think: Courts, Matches, Academies, Coaches, Students - NOT gym memberships

### 2. **Strict RBAC (Role-Based Access Control)**
Every user has EXACTLY ONE role. Navigation, dashboard access, and data visibility are determined by this role.

### 3. **No Role Confusion**
- A Club Owner should NEVER see player views unless explicitly switching
- A Player should NEVER access admin panels
- Navigation must ALWAYS respect the user's role context

---

## 👥 Role Definitions

### **CLUB OWNER** (`owner` | `club_owner`)
**Purpose**: Manages physical padel courts and bookings  
**Key Features**:
- 4-Court Global Scheduler (calendar management)
- "Socios Fijos" (Monthly Fixed Members) reports
- Court management (CRUD)
- Booking oversight
- Revenue tracking

**Dashboard**: `/club/dashboard`

**Navigation Links**:
```typescript
- Panel del Club → /club/dashboard
- Gestión de Canchas → /club/courts
- Calendario Global → /club/calendar
- Socios Fijos → /club/members
- Ingresos → /club/revenue
- Configuración → /settings
```

---

### **ACADEMY OWNER** (`academy_owner`)
**Purpose**: Manages coaching staff, students, and training programs  
**Key Features**:
- Coach management
- Student enrollment & progress tracking
- Training programs (NOT gym "entrenamientos")
- Schedule management
- Performance analytics

**Dashboard**: `/academy/dashboard`

**Navigation Links**:
```typescript
- Panel de Academia → /academy/dashboard
- Programas → /academy/programs
- Gestión de Alumnos → /academy/students
- Coaches → /academy/coaches
- Horarios → /academy/schedules
```

---

### **PLAYER** (`player` | `client`)
**Purpose**: Browse, book courts, and join classes  
**Key Features**:
- Explore available clubs/courts
- Book court time
- Join training sessions
- View personal booking history

**Dashboard**: `/player/explore` (default landing)

**Navigation Links**:
```typescript
- Explorar → /player/explore
- Mis Reservas → /player/bookings
- Mis Clases → /player/classes
- Notificaciones → /player/notifications
- Pagos → /player/payments
- Mi Perfil → /settings
```

---

### **SUPER ADMIN** (`admin` | `super_admin`)
**Purpose**: Global oversight of all entities  
**Dashboard**: `/admin`

**Navigation Links**:
```typescript
- Global Dashboard → /admin
- Entidades → /admin/entities
- Usuarios → /admin/users
- Pagos → /admin/payments
- Soporte → /admin/support
```

---

## 🧭 Dynamic Routing Logic

### Central Function: `getDashboardRoute(role)`
**Location**: `lib/role-navigation.ts`

```typescript
export function getDashboardRoute(role: string | null | undefined): string {
  if (role === 'owner' || role === 'club_owner') return '/club/dashboard'
  if (role === 'academy_owner') return '/academy/dashboard'
  if (role === 'admin' || role === 'super_admin') return '/admin'
  if (role === 'coach') return '/academy/coaches/dashboard'
  return '/player/explore' // Default fallback for players
}
```

**Usage**:
- **Logo/Home Icon in Navbar**: Now points to `/` (landing page)
- **Logo/Home Icon in Sidebar**: Now points to `/` (landing page)
- **"Mi Panel" button**: Uses `getDashboardRoute(role)`
- **Profile Dropdown**: Role-specific action links

---

## 🚫 Legacy Cleanup Checklist

### ❌ **FORBIDDEN Routes** (Olimpo Gym Logic)
These routes should NOT exist or be referenced:

```
/entrenamientos
/planes
/galería
/contacto
/client (DELETED - replaced with /player)
/client/history
/trainings (gym-specific)
```

### ✅ **Approved Routes** (Padel Logic)
```
/ (landing page)
/login
/signup
/register-business/club
/register-business/academy

/club/*
/academy/*
/player/*
/admin/*
/settings
```

---

## 🎨 UI Components & Icons

### Profile Dropdown Header
**Display Format**:
```
[User First Name] - [ROLE BADGE]
```

**Role Badges**:
```typescript
'club_owner' → 'DUEÑO DE CLUB'
'academy_owner' → 'DIRECTOR DE ACADEMIA'
'admin' → 'SUPER ADMIN'
'coach' → 'COACH'
'player' → 'JUGADOR'
```

### Icon System
- **Padel Racket SVG**: Used for profile dropdown (NOT gym dumbbells)
- **Logo**: `OlimpoLogo` component (displays "PadelFlow" text)
  - Sidebar: `h-9 w-auto`
  - Navbar: `h-8 w-auto`

---

## 📁 Directory Structure

### App Routes (Next.js 13+ App Router)
```
app/
├── (auth)/
│   ├── login/
│   └── signup/
├── (dashboard)/
│   ├── club/          # Club Owner workspace
│   ├── academy/       # Academy Owner workspace
│   ├── player/        # Player workspace
│   │   ├── explore/
│   │   ├── bookings/
│   │   ├── classes/
│   │   ├── notifications/
│   │   └── payments/
│   ├── admin/         # Super Admin workspace
│   └── settings/      # Universal profile settings
├── (public)/
│   └── page.tsx       # Landing page (/)
└── register-business/
    ├── club/
    └── academy/
```

### Key Components
```
components/
├── dashboard/
│   ├── Sidebar.tsx          # Role-aware navigation
│   └── DashboardLayout.tsx
├── marketing/
│   └── Navbar.tsx           # Landing page header
└── icons/
    └── OlimpoLogo.tsx       # "PadelFlow" brand logo
```

---

## 🔐 Database Schema (Supabase)

### Core Tables
```sql
-- Multi-tenant entities
entities (
  id UUID,
  owner_id UUID,
  type entity_type, -- 'club' | 'academy'
  name TEXT,
  location JSONB,
  settings JSONB
)

-- Courts (club-specific)
courts (
  id UUID,
  club_id UUID, -- FK to entities
  name TEXT,
  is_active BOOLEAN
)

-- Bookings (court reservations)
bookings (
  id UUID,
  court_id UUID,
  user_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT -- 'confirmed', 'cancelled', 'pending'
)

-- Training sessions (academy-specific)
trainings (
  id UUID,
  academy_id UUID, -- FK to entities
  title TEXT,
  instructor TEXT,
  start_time TIMESTAMPTZ
)

-- Registrations (student enrollments)
registrations (
  id UUID,
  user_id UUID,
  training_id UUID,
  status TEXT
)
```

### Row Level Security (RLS)
- Owners can ONLY manage their own entity's data
- Players can view all public data but only modify their own bookings
- Super Admins bypass RLS via service role

---

## 🛠️ Development Workflows

### Adding a New Role-Specific Page
1. Create route in `app/(dashboard)/[role]/[page]/page.tsx`
2. Update Sidebar links for that role
3. Add RLS policy if database access is needed
4. Update `getDashboardRoute()` if it's a default landing

### Removing Legacy Links
1. Search codebase for the Olimpo term
2. If it's a route, delete the directory
3. If it's a navigation link, remove from Sidebar/Navbar
4. If it's database-related, create a migration to drop/rename

### Testing RBAC
1. Log in as each role type
2. Verify Logo/Home redirects correctly
3. Check Sidebar shows only allowed links
4. Attempt to access restricted routes (should 403 or redirect)

---

## 🇻🇪 Venezuela-Specific Features

### Payment Methods (Logística Tab)
Required for both Club and Academy registration:

1. **Cash**
   - Optional: Require photo proof checkbox

2. **Zelle**
   - Input: Email address

3. **Pago Móvil**
   - Input: Full details (Banco, Teléfono, Cédula, Titular)
   - Display format in booking flow

4. **Facebank** (optional)

### Currency Handling
- All amounts stored in **USD**
- Pago Móvil requires exchange rate (Bs/$) for conversion
- Display currency symbol based on payment method

---

## 🚨 Common Pitfalls

### 1. **Hardcoded `/client` Routes**
**Problem**: Old code referenced `/client` for player features  
**Solution**: Always use `/player` routes

### 2. **Gym Terminology**
**Problem**: "entrenamientos" suggests gym sessions  
**Solution**: Use "clases" or "sesiones" for academy training

### 3. **Navigation Reverts to Player View**
**Problem**: Logo/Home defaulting to `/player/explore` for all users  
**Solution**: Logo/Home now points to `/` (landing). Use "Mi Panel" for dashboard.

### 4. **Profile Dropdown Shows Wrong Links**
**Problem**: Club Owner seeing "Mis Reservas"  
**Solution**: Implement conditional rendering based on `role`

---

## 📋 Implementation Status

### ✅ Completed
- [x] Created `getDashboardRoute()` in `lib/role-navigation.ts`
- [x] Updated Navbar Logo to route to `/`
- [x] Updated Sidebar Logo/Home to route to `/`
- [x] Purged `/client` directory
- [x] Created `/player/bookings` with real Supabase data
- [x] Created `/player/classes` with real Supabase data
- [x] Updated Profile Dropdown with role-specific links
- [x] Fixed Sidebar logo size (`h-9 w-auto`)
- [x] Removed legacy "Entrenamientos", "Planes" links from navigation
- [x] Updated mobile menu to use `getDashboardRoute()`

### 🔄 In Progress
- [ ] Add Pago Móvil details to Academy registration "Logística" tab
- [ ] Audit all remaining Olimpo terminology in codebase
- [ ] Ensure Club/Academy registration flows are symmetrical

### 📝 Future Enhancements
- [ ] Implement role impersonation for Super Admin
- [ ] Add multi-language support (ES/EN toggle fully implemented)
- [ ] Create onboarding wizard for new Club/Academy owners
- [ ] Develop mobile app (React Native)

---

## 🤝 Collaboration Guidelines

### For AI Assistants (Claude/Antigravity)
- **ALWAYS** reference this document before making routing decisions
- **NEVER** create routes with gym/fitness terminology
- **ALWAYS** check user role before rendering navigation
- **ASK** if unsure whether a feature is Club-specific or Academy-specific

### For Human Developers
- Read this file before your first commit
- Update the "Implementation Status" section when completing tasks
- Propose changes via PR if RBAC rules need modification

---

## 📚 Additional Resources

- **Supabase Migrations**: `supabase/migrations/`
- **Auth Context**: `context/AuthContext.tsx`
- **Language Context**: `context/LanguageContext.tsx`
- **Routing Helper**: `lib/role-navigation.ts`

---

**Last Updated**: 2026-01-20  
**Version**: 1.0.0  
**Maintained By**: Lead Architect (Claude)
