# Academy Pages - Supabase Integration Status

## ✅ Completed

### Database Schema
- ✅ Created `academy_students` table with RLS
- ✅ Created `academy_coaches` table with RLS  
- ✅ Created `academy_classes` table with RLS
- ✅ Created `class_enrollments` table (many-to-many)
- ✅ Added indexes for performance
- ✅ RLS policies for academy owners
- ✅ Triggers for auto-updating `current_students` count
- ✅ Triggers for `updated_at` timestamps

### Type Definitions
- ✅ Created `types/academy.ts` with all academy types

### Students Page (`/academy/students`)
- ✅ Fetch real students from Supabase
- ✅ KPI dashboard (Total, New, Attendance, Pending Payments)
- ✅ Search and filter functionality
- ✅ **Add Student Modal** with form validation
- ✅ Toast notifications for success/error
- ✅ Loading and empty states

---

## 🔄 In Progress

### Coaches Page (`/academy/coaches`)
**Status**: Needs Supabase connectionFile Path: `c:\Users\Lalo\Desktop\PadelFlow\app\(dashboard)\academy\coaches\page.tsx`

**Tasks**:
1. Fetch coaches from `academy_coaches` table
2. Calculate stats:
   - `students_assigned`: Count from `class_enrollments` joined with `academy_classes`
   - `classes_this_month`: Count from `academy_classes` where `coach_id` matches
3. Add "Contratar Coach" modal similar to Add Student
4. Wire up edit/delete actions

### Schedule Page (`/academy/schedule`)
**Status**: Needs Supabase connection  
**File Path**: `c:\Users\Lalo\Desktop\PadelFlow\app\(dashboard)\academy\schedule\page.tsx`

**Tasks**:
1. Fetch classes from `academy_classes` table
2. Join with `academy_coaches` to get coach names
3. Add "Agregar Clase" modal:
   - Day of week dropdown
   - Time picker
   - Duration input
   - Coach selector
   - Max students input
   - Color picker
4. Update/delete classes
5. Show enrolled students count

---

## 📋 Next Steps

### Real-time Updates
**Priority**: Medium  
**Implementation**:
```typescript
// Subscribe to changes in students table
useEffect(() => {
  const channel = supabase
    .channel('academy_students_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'academy_students',
        filter: `academy_id=eq.${academyId}`
      },
      (payload) => {
        // Update local state
        if (payload.eventType === 'INSERT') {
          setStudents(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setStudents(prev => prev.map(s => 
            s.id === payload.new.id ? payload.new : s
          ))
        } else if (payload.eventType === 'DELETE') {
          setStudents(prev => prev.filter(s => s.id !== payload.old.id))
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [academyId])
```

Apply to:
- ✅ Students page
- ⏳ Coaches page
- ⏳ Schedule page

### Export Features
**Priority**: Low  
**Options**:
1. **CSV Export** (Simple, recommended first):
   ```typescript
   const exportToCSV = () => {
     const headers = ['Nombre', 'Email', 'Teléfono', 'Estado', 'Pago']
     const rows = students.map(s => [
       s.full_name,
       s.email || '',
       s.phone || '',
       s.status,
       s.payment_status
     ])
     const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
     const blob = new Blob([csv], { type: 'text/csv' })
     const url = URL.createObjectURL(blob)
     const a = document.createElement('a')
     a.href = url
     a.download = `estudiantes_${new Date().toISOString().split('T')[0]}.csv`
     a.click()
   }
   ```

2. **PDF Export** (Advanced):
   - Use `jspdf` or `react-pdf`
   - Generate formatted reports
   - Include academy branding

### Bulk Operations
**Priority**: Low  
**Features**:
- Select multiple students (checkboxes)
- Bulk actions dropdown:
  - Send email to selected
  - Update payment status
  - Archive/activate
- Confirmation dialog before bulk actions

---

## Database Queries

### Students Page
```sql
-- Fetch students
SELECT * FROM academy_students 
WHERE academy_id = $1
ORDER BY created_at DESC;

-- Count new this month
SELECT COUNT(*) FROM academy
_students
WHERE academy_id = $1
  AND DATE_TRUNC('month', enrollment_date) = DATE_TRUNC('month', NOW());

-- Average attendance
SELECT AVG(attendance_rate) FROM academy_students
WHERE academy_id = $1 AND status = 'active';
```

### Coaches Page
```sql
-- Fetch coaches with stats
SELECT 
  c.*,
  COUNT(DISTINCT ce.student_id) as students_assigned,
  COUNT(DISTINCT ac.id) FILTER (WHERE ac.created_at >= DATE_TRUNC('month', NOW())) as classes_this_month
FROM academy_coaches c
LEFT JOIN academy_classes ac ON c.id = ac.coach_id
LEFT JOIN class_enrollments ce ON ac.id = ce.class_id AND ce.status = 'active'
WHERE c.academy_id = $1
GROUP BY c.id;
```

### Schedule Page
```sql
-- Fetch classes with coach info
SELECT 
  ac.*,
  c.name as coach_name,
  c.specialty
FROM academy_classes ac
LEFT JOIN academy_coaches c ON ac.coach_id = c.id
WHERE ac.academy_id = $1
  AND ac.status = 'active'
ORDER BY ac.day_of_week, ac.start_time;
```

---

## Testing Checklist

### Students Page
- [ ] Add student with full info
- [ ] Add student with minimal info (name only)
- [ ] Search by name
- [ ] Search by email
- [ ] Filter by Active
- [ ] Filter by Inactive
- [ ] Verify KPI calculations
- [ ] Test empty state (no students)
- [ ] Test error handling (network failure)

### Coaches Page (When implemented)
- [ ] Add coach
- [ ] View coach stats
- [ ] Filter by coach
- [ ] Edit coach info
- [ ] Deactivate coach

### Schedule Page (When implemented)
- [ ] Add recurring class
- [ ] Add one-time class
- [ ] Assign coach to class
- [ ] View enrolled students
- [ ] Cancel class
- [ ] Navigate between weeks

---

## Performance Optimization

### Current
- Basic queries with no optimization

### Recommended
1. **Pagination**: Load 50 students at a time
   ```typescript
   const PAGE_SIZE = 50
   const { data, count } = await supabase
     .from('academy_students')
     .select('*', { count: 'exact' })
     .eq('academy_id', academyId)
     .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
   ```

2. **Debounced Search**: Wait 300ms after typing
   ```typescript
   const debouncedSearch = useDeb ounce((query: string) => {
     setSearchQuery(query)
   }, 300)
   ```

3. **Virtual Scrolling**: For large lists (100+ items)
   - Use `react-window` or `react-virtual`

---

## Migration Status

Run this command to apply the new database schema:
```bash
npx supabase db reset
```

Or manually:
```bash
npx supabase migration up
```

---

**Last Updated**: 2026-01-20 23:50  
**Status**: Students page fully functional, Coaches and Schedule need Supabase queries
