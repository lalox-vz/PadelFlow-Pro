-- SQL Scripts to Add Test Data for Academy Pages
-- Run these in your Supabase SQL Editor after replacing YOUR_ACADEMY_ID

-- ============================================
-- STEP 1: Get your Academy ID
-- ============================================
-- Run this first to get your academy_id:
SELECT id, name FROM entities 
WHERE type = 'ACADEMY' 
ORDER BY created_at DESC 
LIMIT 1;

-- Copy the 'id' value and replace 'YOUR_ACADEMY_ID' below


-- ============================================
-- STEP 2: Add Sample Coaches
-- ============================================
INSERT INTO academy_coaches (academy_id, name, email, phone, specialty, experience_years, rating, availability, status)
VALUES
  ('YOUR_ACADEMY_ID', 'Carlos Martínez', 'carlos@padelflow.com', '+58 412 111 2222', 'Técnica Avanzada', 8, 4.9, 'full_time', 'active'),
  ('YOUR_ACADEMY_ID', 'Ana Rodríguez', 'ana@padelflow.com', '+58 414 333 4444', 'Iniciación Infantil', 5, 5.0, 'full_time', 'active'),
  ('YOUR_ACADEMY_ID', 'Miguel Fernández', 'miguel@padelflow.com', '+58 424 555 6666', 'Preparación Física', 3, 4.7, 'part_time', 'active');


-- ============================================
-- STEP 3: Add Sample Students
-- ============================================
INSERT INTO academy_students (academy_id, full_name, email, phone, status, attendance_rate, payment_status)
VALUES
  ('YOUR_ACADEMY_ID', 'Juan Pérez', 'juan@example.com', '+58 412 123 4567', 'active', 95, 'paid'),
  ('YOUR_ACADEMY_ID', 'María González', 'maria@example.com', '+58 414 987 6543', 'active', 88, 'pending'),
  ('YOUR_ACADEMY_ID', 'Luis Fernández', 'luis@example.com', '+58 424 555 1234', 'on_hold', 72, 'overdue'),
  ('YOUR_ACADEMY_ID', 'Carmen Suárez', 'carmen@example.com', '+58 412 999 8888', 'active', 92, 'paid'),
  ('YOUR_ACADEMY_ID', 'Pedro Ramírez', 'pedro@example.com', '+58 414 777 6666', 'active', 85, 'paid');


-- ============================================
-- STEP 4: Get Coach IDs for Classes
-- ============================================
-- Run this to see your coach IDs:
SELECT id, name FROM academy_coaches 
WHERE academy_id = 'YOUR_ACADEMY_ID';

-- Copy the IDs and replace 'CARLOS_COACH_ID', 'ANA_COACH_ID', etc. below


-- ============================================
-- STEP 5: Add Sample Classes (Weekly Schedule)
-- ============================================
-- Day of week: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday

-- Monday Classes
INSERT INTO academy_classes (academy_id, coach_id, title, day_of_week, start_time, duration_minutes, max_students, color, status)
VALUES
  ('YOUR_ACADEMY_ID', 'ANA_COACH_ID', 'Escuela Niños', 0, '09:00', 90, 15, 'blue', 'active'),
  ('YOUR_ACADEMY_ID', 'CARLOS_COACH_ID', 'Técnica Avanzada', 0, '11:00', 60, 10, 'purple', 'active'),
  ('YOUR_ACADEMY_ID', 'CARLOS_COACH_ID', 'Nivel Intermedio', 0, '16:00', 90, 15, 'green', 'active');

-- Wednesday Classes
INSERT INTO academy_classes (academy_id, coach_id, title, day_of_week, start_time, duration_minutes, max_students, color, status)
VALUES
  ('YOUR_ACADEMY_ID', 'ANA_COACH_ID', 'Escuela Niños', 2, '09:00', 90, 15, 'blue', 'active'),
  ('YOUR_ACADEMY_ID', 'MIGUEL_COACH_ID', 'Prep. Física', 2, '18:00', 120, 12, 'orange', 'active');

-- Friday Classes
INSERT INTO academy_classes (academy_id, coach_id, title, day_of_week, start_time, duration_minutes, max_students, color, status)
VALUES
  ('YOUR_ACADEMY_ID', 'CARLOS_COACH_ID', 'Técnica Avanzada', 4, '10:00', 60, 10, 'purple', 'active');

-- Saturday Classes
INSERT INTO academy_classes (academy_id, coach_id, title, day_of_week, start_time, duration_minutes, max_students, color, status)
VALUES
  ('YOUR_ACADEMY_ID', 'CARLOS_COACH_ID', 'Sparring', 5, '15:00', 120, 12, 'red', 'active');


-- ============================================
-- STEP 6: Enroll Students in Classes (Optional)
-- ============================================
-- Get class IDs first:
SELECT id, title, day_of_week, start_time FROM academy_classes 
WHERE academy_id = 'YOUR_ACADEMY_ID';

-- Get student IDs:
SELECT id, full_name FROM academy_students 
WHERE academy_id = 'YOUR_ACADEMY_ID';

-- Example enrollments (replace IDs):
INSERT INTO class_enrollments (student_id, class_id, status)
VALUES
  ('JUAN_STUDENT_ID', 'ESCUELA_NINOS_CLASS_ID', 'active'),
  ('MARIA_STUDENT_ID', 'ESCUELA_NINOS_CLASS_ID', 'active'),
  ('PEDRO_STUDENT_ID', 'TECNICA_AVANZADA_CLASS_ID', 'active');

-- Note: The trigger will automatically update current_students count!


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all data:
SELECT 'Coaches' as type, COUNT(*) as count FROM academy_coaches WHERE academy_id = 'YOUR_ACADEMY_ID'
UNION ALL
SELECT 'Students', COUNT(*) FROM academy_students WHERE academy_id = 'YOUR_ACADEMY_ID'
UNION ALL
SELECT 'Classes', COUNT(*) FROM academy_classes WHERE academy_id = 'YOUR_ACADEMY_ID'
UNION ALL
SELECT 'Enrollments', COUNT(*) FROM class_enrollments;

-- View schedule:
SELECT 
  ac.title,
  ac.day_of_week,
  ac.start_time,
  c.name as coach,
  ac.current_students,
  ac.max_students
FROM academy_classes ac
LEFT JOIN academy_coaches c ON ac.coach_id = c.id
WHERE ac.academy_id = 'YOUR_ACADEMY_ID'
ORDER BY ac.day_of_week, ac.start_time;
