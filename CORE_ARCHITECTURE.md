# PADELFLOW CORE ARCHITECTURE (SOURCE OF TRUTH)
**Version:** V3.2 (Integrity Confirmed)
**Last Updated:** 2026-02-04
**Status:** 🛡️ READY FOR BUSINESS LOGIC FIXES

---

## 1. IDENTITY & HIERARCHY (Estructura Base)

### **Entities (`public.entities`)**
*Reemplaza a la antigua tabla 'organizations'. Centro del universo.*
- **Columns:** `id` (uuid), `owner_id` (uuid), `name` (text), `logo_url`, `banner_url`, `details` (jsonb - *Legacy Only*).
- **Configuración Real:**
    - Horarios: Tabla `opening_hours`.
    - Precios: Tabla `pricing_rules`.
    - Reglas: Columnas directas en `entities`.

### **Club Members (`public.club_members`)**
*El CRM Local. Identidad unificada por club.*
- **Columns:** `id` (uuid), `entity_id` (FK), `user_id` (FK Nullable), `full_name`.
- **Contact:** `phone` (Clave principal de búsqueda), `email`.
- **Relación:** Un usuario manual tiene `user_id: null`. Un usuario App tiene `user_id: uuid`.

### **Courts (`public.courts`)**
- **Columns:** `id` (uuid), `club_id` (FK), `name`, `is_active`.
- **Safety:** ✅ `ON DELETE RESTRICT` (Blindada). No se puede borrar si tiene reservas asociadas. Confirmado en DB.

---

## 2. CORE BUSINESS LOGIC (Motor de Reservas)

### **Bookings (`public.bookings`)**
- **Columns:** `id` (uuid), `court_id` (UUID Strict - FK -> courts.id), `start_time`, `end_time`, `price`, `payment_status`.
- **Integridad V3:** ✅ `member_id` (UUID Nullable - FK -> club_members.id). La relación CRM es Sólida.
- **Content:** `title` (Obligatorio), `description` (Usado para teléfonos manuales).

### **Recurring Plans (`public.recurring_plans`)**
- **Columns:** `id`, `member_id` (✅ Vinculado correctamente), `court_id`, `start_date`, `end_date`, `active`.
- **Logic:** Genera reservas hijas en `bookings` vinculadas por `recurring_plan_id`.

---

## 3. ACADEMY MODULE (Verificado V2)
*Módulo estable.*
- **Classes:** `academy_classes` (title, coach_id, recurring).
- **Coaches:** `academy_coaches` (name, specialty).
- **Students:** `academy_students` (attendance_rate).
- **Enrollments:** Tabla pivote `class_enrollments`.

---

## 4. 🚨 AUDITORÍA DE RIESGOS (THE KILL LIST)
*Lista de tareas obligatorias para Anti antes de crear nuevas features.*

### 🟠 PRIORIDAD 2: LÓGICA DE NEGOCIO (SIGUIENTE PASO)
1.  **Fix 'Zombie Plans' (CRITICO):** El badge de "Sesiones Restantes" es estático e inútil (siempre muestra el total inicial o resta futuro sin considerar pasado). Los planes vencidos quedan activos por siempre.
    - *Plan:* Implementar trigger/cron o lógica de lectura inteligente que marque `active: false` cuando `end_date < now()`.
2.  **Fix 'Falsos Bloqueos':** Implementar estado `blocked` real (costo $0) en lugar de usar reservas falsas para mantenimiento que ensucian reportes financieros.

---

## 5. PROTOCOLO 'WORLD CLASS' (REGLAS DE ORO)
1.  **Integridad:** Jamás guardar nombres de clientes como texto plano si existe un perfil en `club_members`.
2.  **Server-Side:** Operaciones críticas (pagos, reservas) viven en Server Actions (`booking.ts`).
3.  **No Inventar:** Si la DB dice UUID, es UUID. Leer siempre este esquema antes de codificar.

---

## 6. CHANGELOG / SOLUCIONADOS
- **Fix Data Integrity (Feb 2026):** Se implementó columna `member_id` en bookings.
- **Financial Shield:** Se eliminó `CASCADE DELETE` en `bookings.court_id`. Ahora es `RESTRICT`.
- **Strict Types:** `bookings.court_id` convertido exitosamente de TEXT a UUID.
- **Doc Sync:** El documento refleja la nueva columna `member_id` y restricción FK.
- **Fix Sidebar Logic:** La navegación ahora obedece estrictamente al user_role (Club vs Academy) y no al business_type estático.
