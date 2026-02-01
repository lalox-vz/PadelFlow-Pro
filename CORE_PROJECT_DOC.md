# CORE PROJECT DOCUMENTATION (Olimpo PadelFlow)
**Version**: 1.2.0 (Swiss Clock Architecture)
**Last Audit**: 2026-02-05
**Framework**: Next.js (App Router), Supabase (Auth/DB), TailwindCSS.

---

## 0. 🛡️ Bitácora de Integridad (Lecciones Aprendidas)
*Este registro es de lectura obligatoria antes de modificar lógica de conteo, fechas o visualización.*

1.  **Sincronización de Reservas (El "Error 9 vs 8")**: 
    - **Regla**: El conteo de los resúmenes mensuales DEBE usar los mismos filtros que la vista diaria (excluir explícitamente `payment_status = 'canceled'`). 
    - **Origen**: Se detectaron discrepancias donde el calendario mensual contaba registros que la lista diaria ignoraba.
2.  **Identidad de Socio Fijo (Caso Peter)**: 
    - **Regla**: El color azul cobalto y el icono de recurrencia solo se muestran si la reserva tiene un `recurring_plan_id` vinculado a un plan ACTIVO en la tabla `recurring_plans`.
    - **UX**: El modal de gestión debe mostrar siempre el nombre del plan vinculado para evitar confusión operativa.
3.  **Granularidad del Gráfico de Ingresos**: 
    - **Regla**: Si el filtro seleccionado es "Año Actual", la granularidad se fuerza a `month` (12 barras), ignorando cualquier cálculo dinámico de días.
    - **Origen**: El sistema intentaba mostrar días en rangos de 365 días, rompiendo la legibilidad de la Inteligencia de Negocio.
4.  **Blindaje de Zona Horaria (Caracas UTC-4)**:
    - **Regla de Oro**: Ninguna reserva puede "saltar" de día. El inicio y fin de cada día se define por el calendario de Caracas, no por el servidor.
    - **Acción**: Todas las consultas de reservas deben forzar el desplazamiento de -4 horas antes de agrupar por fecha. Si una reserva es a las 11:00 PM del lunes, DEBE aparecer el lunes, no el martes.
    - **Ratificación**: Se ratifica el uso de America/Caracas (UTC-4) mediante `date-fns-tz` para evitar el derrame de reservas entre días.
5.  **Protocolo de Cancelación de Contratos**:
    - **Regla**: Al cancelar un Socio Fijo, es obligatorio que las reservas futuras pasen a `canceled` para liberar la disponibilidad. Las reservas pasadas `paid` no se tocan para proteger la integridad financiera.
6.  **Jerarquía de Precios (La Cascada de Precisión)**:
    - **Regla Suprema (Pro Level)**: El orden de aplicación de precios es estricto: 
        1. Regla Dinámica (Si existe y coincide con Día/Hora/Cancha).
        2. Precio Base de Cancha (Si esa cancha específica tiene un precio base propio).
        3. Precio Base del Club (Configuración global por defecto).
    - **Acción**: El motor de precios NO debe detenerse en el precio global si existe una regla más específica. La especificidad siempre gana.
7.  **Fronteras de Horario (Boundary Logic)**:
    - **Regla**: El precio se determina por el *inicio* del bloque. Una regla que termina a las 20:30 **NO** cubre el bloque de las 20:30, cubre hasta las 20:29:59.
    - **Solución**: Para cubrir el último turno de la noche, la regla de precio debe extenderse hasta el final de la hora de ese turno (ej: hasta las 22:00, no 20:30).

---

## 1. 🗄️ Database Schema (Absolute Truth)
*Derived from active migration files.*

### Key Tables

#### `public.users`
The central user record, synched with `auth.users` via triggers.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK, References `auth.users` |
| `email` | TEXT | Unique email |
| `full_name` | TEXT | User display name |
| `role` | ENUM | `platform_admin`, `club_owner`, `academy_owner`, `club_staff`, `coach`, `player`, `student` |
| `organization_id` | UUID | FK to `entities`. Null for players. |
| `business_type` | TEXT | 'club' or 'academy'. |
| `has_business` | BOOL | True if owner/staff. |
| `permissions` | JSONB | **New**: Array of granular permission strings (Staff only). |
| `job_title` | TEXT | **New**: Custom title (e.g. 'Recepcionista Noche'). |

**Triggers**:
- `trigger_sync_user_role_to_auth`: Syncs `role`, `org_id`, `business_type` to `auth.users.user_metadata`.

#### `public.bookings`
Core reservation record.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `entity_id` | UUID | FK to `entities` (Organization) |
| `court_id` | UUID | FK to `courts` |
| `user_id` | UUID | FK to `users` (Nullable for manual bookings) |
| `start_time` | TIMESTAMPTZ | Start of slot (NOT NULL) |
| `end_time` | TIMESTAMPTZ | End of slot (NOT NULL) |
| `title` | TEXT | Reservation title / Player name (NOT NULL) |
| `payment_status` | TEXT | 'paid', 'pending', 'partial' |
| `price` | NUMERIC | **New**: Exact revenue per booking. |
| `total_price` | NUMERIC | **Legacy**: Synced with price for redundancy. |
| `participant_checkin` | BOOL | True if player has arrived (Check-in) |
| `recurring_plan_id` | UUID | FK to `recurring_plans` (if applicable) |

#### `public.opening_hours`
**New**: Club schedule control. Single Source of Truth for availability.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `entity_id` | UUID | FK to `entities` |
| `day_of_week` | INT | 0-6 (Sun-Sat) |
| `open_time` | TIME | e.g. '07:00' |
| `close_time` | TIME | e.g. '23:00' |

#### `public.pricing_rules`
**New**: Dynamic pricing logic.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `entity_id` | UUID | FK to `entities` |
| `name` | TEXT | Rule Name (e.g. 'Tarifa Base', 'Hora Pico') |
| `price` | NUMERIC | Custom Price |
| `start_time` | TIME | Range Start |
| `end_time` | TIME | Range End |
| `days` | INT[] | Array of days [0,6] |
| `court_ids` | UUID[] | **New**: Optional Array of Court IDs this rule applies to. |
| `is_active` | BOOL | Toggler |

#### `public.courts`
Physical courts.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `club_id` | UUID | FK to `entities` |
| `name` | TEXT | Court Name |
| `is_active` | BOOL | Active/Inactive status |
| `details` | JSONB | Metadata (Surface, Type, base_price backup) |

#### `public.shift_reports`
User declared shift closures.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `organization_id` | UUID | FK Entities |
| `user_id` | UUID | FK Users |
| `cash_amount` | NUMERIC | Declared Cash |
| `transfer_amount` | NUMERIC | Declared Transfer |
| `card_amount` | NUMERIC | Declared Card/POS |
| `notes` | TEXT | Incidents |

#### `public.recurring_plans`
Subscriptions for Fixed Members.
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `organization_id` | UUID | FK Entities |
| `user_id` | UUID | FK Users |
| `court_id` | UUID | FK Courts |
| `day_of_week` | INT | 0-6 (Sun-Sat) |
| `start_time` | TIME | e.g. '19:00:00' |
| `active` | BOOL | Soft-delete status |
| `start_date` | DATE | |
| `end_date` | DATE | Auto-calculated |

#### `public.booking_logs`
Audit trail.
| Column | Type | Description |
|--------|------|-------------|
| `booking_id` | UUID | FK to `bookings` |
| `user_id` | UUID | FK to `users` (Actor) |
| `action` | TEXT | 'created', 'updated', 'cancelled' |
| `notes` | TEXT | Human readable change log |

**Constraints**:
- `booking_id` FK: ON DELETE CASCADE (Ensures deletion doesn't error out).

#### `public.invitations`
Pending team invites.
| Column | Type | Description |
|--------|------|-------------|
| `email` | TEXT | Target user |
| `role` | ENUM | Role to assign |
| `permissions` | JSONB | **New**: Permissions to grant |
| `job_title` | TEXT | **New**: Job title to assign |
| `status` | TEXT | 'pending', 'accepted', 'cancelled' |

#### `public.entities`
Organizations (Clubs/Academies).
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `name` | TEXT | Business Name |
| `owner_id` | UUID | Link to super-user |
| `address` | TEXT | Physical Address |
| `phone` | TEXT | Contact Phone |
| `business_email` | TEXT | Public Email |
| `description` | TEXT | Bio / Info |
| `default_duration` | INT | **New**: Booking default length (90) |
| `advance_booking_days`| INT | **New**: Horizon (14) |
| `cancellation_window` | INT | **New**: Hours before (24) |
| `details` | JSONB | *Deprecated*: Legacy config removed. |

---

## 2. 🔐 Roles & Permissions (RBAC)
*Defined in `AuthContext` and `Sidebar` logic.*

### Role Hierarchy
1.  **Platform Admin**: Global access.
2.  **Club Owner**: Full access to their organization.
    - Can manage Team (`/team`).
    - Can see Revenue (`/club/revenue`).
    - Can configure Club (`/club/settings`).
3.  **Club Staff**: Operational access only (Modular).
    - **Home**: Redirected to `/club/calendar`.
    - **Permissions**: Granular control via `users.permissions` array.
    - **Menu**: Dynamic filtering based on active permissions.
    - **Blocked**: Team Management, Revenue, Settings, Audit (Hard limits).
    - *Security*: Redirected from protected routes via `useEffect` checks to `/club/calendar`.
4.  **Player**: Public access + own bookings only.

### Authentication Persistence
- **Source of Truth**: `public.users` table.
- **Cache**: `localStorage` keys `padelflow_user_role` and `padelflow_user_profile`.
- **Self-Correction**: App detects mismatches between Cache and DB on load and auto-corrects.

---

## 3. 💼 Business Rules & Logic (Audited)
*Derived from `components/club/AvailabilityGrid.tsx` and `migrations/20240203000005_dashboard_audit.sql`.*

### A. Financial Precision (The "Swiss Watch" Standard)
-   **Source of Truth**: `bookings.price` column.
-   **Timezone Stability (UTC-4 System)**:
    -   The application enforces `CLUB_TIMEZONE = 'America/Caracas'` across calculation engines.
    -   `date-fns-tz` is used to transpose Server/Browser timestamps to Club Local Time for all logic (Availability, Pricing, Reports).
-   **Anclaje de Ingresos**: Revenue is attributed 100% to the **Start Hour** of the booking. No distribution across multiple hours.
-   **Consistency**: The sum of values in the Heatmap = Sum of Daily Chart Bars = Total Revenue KPI.

### B. Smart Profitability (Pricing Cascade)
-   **Logic**: Prices are calculated using a 3-tier cascade (`Specificity First`):
    1.  **Dynamic Rule**: A matching `pricing_rule` (Day/Time/Court) overrides everything.
    2.  **Court Base Price**: If no rule matches, use the specific court's configuration.
    3.  **Club Base Price**: If no court price, use the global fallback.
-   **Boundary Handling**: Pricing Rules are inclusive of start time but exclusive of end time (mathematical `<`). To cover a slot, the rule must extend past the slot's start time.

### C. Booking Integrity (Armor)
-   **Soft Delete**: Queda prohibido el borrado físico (DELETE) de reservas. Se debe usar siempre el estado `canceled` para preservar el rastro de auditoría en `booking_logs`.
-   **Manual Creation**: Button is DISABLED if Name is 'Reserva' (generic) or empty.
-   **Database**: `start_time`, `end_time`, and `title` are **NOT NULL**.
-   **Revenue Dashboard**:
    -   Timezone Precision: **100% (Caracas)**.
    -   Aggregation Logic: **Verified**.
    -   Components: KPIs, Daily Chart, Smart Heatmap, Cash Reconciliation.
-   **Calendar/Grid**:
    -   Real-time availability.
    -   Strict Validations (No ghost bookings).
    -   Dual-Sync Price Storage (`price` + `total_price`).
-   **Management**:
    -   Team Permissions.
    -   Settings (Courts, Hours, Pricing).
    -   Shift Closures.

### 🚧 In Progress / Planned
-   **Payment Gateway Integration**: Automating `payment_status` updates.
-   **Player App**: Public facing reservation flow.
-   **Notifications**: Email/Push on booking changes.
