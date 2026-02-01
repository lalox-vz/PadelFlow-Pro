# PadelFlow CORE ARCHITECTURE (SOURCE OF TRUTH)
**Last Updated:** 2026-02-01 (Post-Schema Radiography)
**Status:** V2 Verified Schema

---

## 1. IDENTITY & HIERARCHY

### **Entities (`public.entities`)**
*The center of the universe. Replaces legacy 'organizations'.*
- **Columns:** `id` (uuid), `owner_id` (uuid), `type` (entity_type), `name` (text), `host_club_id` (uuid), `business_email`, `phone`, `description`, `logo_url`, `banner_url`, `details` (jsonb).
- **Configurations:** `default_duration`, `advance_booking_days`, `cancellation_window`, `address`.

### **Users (`public.users`)**
*Global App Users.*
- **Columns:** `id` (uuid), `organization_id` (FK -> entities.id), `full_name`, `email`, `phone`, `role` (user_role), `has_business`, `business_type`.
- **Metadata:** `permissions` (jsonb), `job_title`, `onboarding_status`, `nickname`.

### **Club Members (`public.club_members`)**
*The Local CRM. Unified Identity per Club.*
- **Columns:** `id`, `entity_id` (FK -> entities.id), `user_id` (FK -> users.id, Nullable), `full_name`.
- **Contact:** `phone` (The Master Key), `email`.
- **Stats:** `total_bookings`, `total_spent`, `last_interaction_at`.
- **Flex:** `metadata` (jsonb), `notes` (text), `status`.

---

## 2. CORE BUSINESS LOGIC

### **Bookings (`public.bookings`)**
- **Columns:** `id`, `entity_id`, `user_id` (Nullable), `court_id` (text - *Note: currently text, verified*).
- **Time:** `start_time` (timestamptz), `end_time` (timestamptz).
- **Finance:** `price`, `total_price`, `payment_status`.
- **Content:** `title` (Mandatory), `description` (Text - *Added in V2*).
- **Recurring:** `recurring_plan_id`.

### **Recurring Plans (`public.recurring_plans`)**
- **Columns:** `id`, `organization_id`, `user_id`, `court_id`, `day_of_week`, `start_time`, `duration_mins`, `start_date`, `end_date`, `total_price`, `active`.

### **Courts (`public.courts`)**
- **Columns:** `id`, `club_id` (FK -> entities.id), `name`, `is_active`, `details`.

---

## 3. ACADEMY MODULE (Verified)

- **Classes (`academy_classes`):** `title`, `coach_id`, `start_time`, `max_students`, `recurring`.
- **Coaches (`academy_coaches`):** `name`, `specialty`, `rating`, `user_id`.
- **Students (`academy_students`):** `full_name`, `program_id`, `attendance_rate`.
- **Enrollments (`class_enrollments`):** Link between students and classes.

---

## 4. DEPRECATED / ZOMBIE TABLES (To Ignore)
- `organizations` (Replaced by `entities`) - *Note: May still exist in traces, but logic uses entities.*
- `memberships` (Superseded by `recurring_plans` / `club_members`).
- `registrations` (Legacy).
- `trainings` (Legacy, replaced by `academy_*`).

---

## 5. MIGRATION STATUS (Ghost Hunter V3)
- **Strategy:** Hybrid.
- **Registered Users:** Synced via `bookings.user_id` -> `users.id`.
- **Manual Users:** Synced via `bookings.title` grouping.
- **Current State:** `club_members` populated with historical value.

---
