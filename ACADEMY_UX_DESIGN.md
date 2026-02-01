# Academy Owner Pages - UX Psychology & Design Principles

## Overview
Created three intuitive, psychology-driven pages for Academy Owners based on best practices from Calendly, HubSpot, Google Classroom, and Notion.

---

## 1. **Gestión de Alumnos** (`/academy/students`)

### Applied Principles:

#### **Visual Hierarchy**
- **Top Priority**: KPI Dashboard (Total, New, Attendance, Pending Payments)
- **Secondary**: Search/Filter controls
- **Tertiary**: Student cards with detailed info

#### **Chunking (Miller's Law - 7±2 items)**
- Grouped info in logical sections:
  - Header stats
  - Contact info
  - Attendance metrics
  - Payment status

#### **Color Psychology**
- 🟢 **Green**: Good (High attendance, Paid)
- 🟡 **Yellow**: Warning (Medium attendance, Pending)
- 🔴 **Red**: Urgent (Low attendance, Overdue)
- 🔵 **Blue**: Info (Total students, Active status)

#### **Progressive Disclosure**
- Overview cards show essentials
- Hover reveals action menu
- Click expands for full details

#### **Recognition over Recall**
- Icons for every metric (Users, Mail, Phone, Calendar)
- Color-coded badges for status
- Visual progress bars for attendance

#### **Affordance (Gibson)**
- Buttons look clickable (raised, colored)
- Cards have hover lift effect
- Search bar has magnifying glass icon

### Key Features:
- **KPI Dashboard**: 4 key metrics at-a-glance
- **Smart Search**: Filter by name or email
- **Status Filters**: All / Active / Inactive
- **Student Cards**: Avatar, program, contact, attendance bar, payment badge
- **Quick Actions**: View, Edit, Archive via dropdown

---

## 2. **Coaches** (`/academy/coaches`)

### Applied Principles:

#### **Fitts's Law**
- Larger "Ver Perfil" button (frequent action)
- Smaller dropdown for rare actions (Edit, Delete)

#### **Gestalt Principles**
- **Proximity**: Related info grouped (name + specialty)
- **Similarity**: Same layout for all coach cards
- **Continuity**: Horizontal flow (Avatar → Info → Stats → Actions)

#### **Hick's Law (Reduce Choices)**
- Limited to 2-3 primary actions per card
- Secondary actions hidden in dropdown

#### **Visual Hierarchy**
- **Level 1**: Coach name + Rating (largest, bold)
- **Level 2**: Specialty + Stats (medium)
- **Level 3**: Contact (hidden in disclosure)

#### **Progressive Disclosure**
- Default: Overview (Name, Rating, Students, Classes)
- On Demand: Contact info (Email, Phone) via `<details>` tag

### Key Features:
- **Horizontal Cards**: Better for desktop scanning (F-pattern reading)
- **Star Ratings**: Visual, immediate feedback
- **Stats Trio**: Rating, Students, Classes (3 = magic number)
- **Expandable Contact**: Click to reveal (reduces clutter)

---

## 3. **Horarios** (`/academy/schedule`)

### Applied Principles:

#### **Calendar Metaphor (Skeuomorphism Light)**
- Grid layout mimics paper calendar
- Time slots on left (familiar pattern)
- Days across top (mental model match)

#### **Gestalt - Figure/Ground**
- Classes are "figures" (colored blocks)
- Empty slots are "ground" (neutral background)
- Current day highlighted (yellow accent)

#### **Color Coding (Redundancy)**
- Each program type has unique color
- Legend provided (no memorization required)
- Color + Text (accessible for colorblind users)

#### **Cognitive Load Reduction**
- Week view (not overwhelming month)
- Only relevant info per class (Title, Coach, Students, Time)
- Filter by coach to reduce density

#### **Feedback & Visibility**
- Hover on class shows actions
- Badges indicate capacity (Disponible / Casi llena / Llena)
- Current day has different background

#### **Consistency**
- Same color = same program across all days
- Same layout for all time slots
- Predictable behavior (click to edit, hover to preview)

### Key Features:
- **Weekly Grid View**: 7 days × 16 time slots (7 AM - 10 PM)
- **Class Cards**: Inline in grid with color-coding
- **Coach Filter**: Dropdown to view specific coach's schedule
- **Week Navigation**: Previous/Next/Today buttons
- **Occupancy Indicator**: Badge showing "Llena" vs "Disponible"
- **Summary Stats**: Total classes, students, avg occupancy

---

## General UX Best Practices Applied Across All Pages:

### 1. **Whitespace** (40-60% of page)
- Cards have padding
- Sections spaced apart
- Not cramped (reduces stress)

### 2. **Consistency**
- Same header pattern (Icon + Title + Action button)
- Same card structure
- Same color palette

### 3. **Feedback**
- Loading states ("Cargando alumnos...")
- Empty states (helpful, friendly messages)
- Hover effects (immediate visual response)

### 4. **Scannability** (F-Pattern)
- Most important info top-left
- Action buttons top-right
- Lists/cards in vertical flow

### 5. **Mobile-First Responsive**
- Grid columns collapse on small screens
- Horizontal overflow scroll for calendar
- Touch-friendly button sizes (min 44×44px)

---

## Psychology Principles Reference:

| Principle | Definition | Application |
|-----------|------------|-------------|
| **Hick's Law** | More choices = longer decision time | Limited to 3-4 primary actions per screen |
| **Fitts's Law** | Larger targets = faster clicks | Important buttons (Add Student, Add Class) are larger |
| **Miller's Law** | 7±2 items in working memory | KPIs limited to 4 cards, grouped logically |
| **Gestalt Proximity** | Objects close together = related | Contact info grouped, stats grouped |
| **Progressive Disclosure** | Show basics, reveal details on demand | Contact info in collapsible `<details>` tag |
| **Recognition vs Recall** | Icons > memory | Every metric has an icon, colors have meaning |
| **Color Psychology** | Colors affect emotion | Green=success, Red=urgent, Blue=calm/info |

---

## Inspiration Sources:

- **HubSpot CRM**: KPI dashboard, contact management
- **Google Classroom**: Class cards, roster view
- **Calendly**: Schedule grid, time slot visualization
- **Notion**: Clean, card-based layouts
- **Asana**: Status badges, progress indicators

---

## Future Enhancements:

1. **Drag-and-Drop Scheduling** (like Calendly)
2. **Real-time Updates** (WebSocket for live class capacity)
3. **Export to PDF/Excel** (for reports)
4. **Bulk Actions** (select multiple students to message)
5. **Analytics Dashboard** (growth trends, retention charts)

---

**Created**: 2026-01-20  
**By**: Antigravity (Claude 3.5 Sonnet)  
**Purpose**: Maximize usability through evidence-based UX design
