export type UserRole = 'platform_admin' | 'club_owner' | 'academy_owner' | 'club_staff' | 'coach' | 'player' | 'student' | 'admin' | 'client' | 'super_admin' | 'owner'

export interface UserProfile {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
    role: UserRole
    organization_id?: string | null
    avatar_url?: string | null
    nickname?: string | null
    membership_tier?: 'VIP' | 'Access' | 'Basic' | 'Not a Member' | null
    membership_expires_at?: string | null
    created_at: string
    has_business?: boolean
    business_type?: 'club' | 'academy' | null
    city?: string | null
    onboarding_status?: 'not_started' | 'in_progress' | 'completed' | null
    onboarding_step?: number | null
    permissions?: string[] | null // For Modular Staff Permissions
    job_title?: string | null
}

export interface Payment {
    id: string
    user_id: string
    amount: number
    method: 'Cash' | 'Zelle' | 'PagoMovil' | 'Facebank'
    reference_number?: string
    sender_name?: string
    cedula?: string
    proof_url?: string
    status: 'pending' | 'approved' | 'rejected'
    month_paid: string
    created_at: string
    invoice_number?: string
    denial_reason?: string
    notes?: string
}

export type TrainingType = 'Yoga' | 'Functional' | 'Hyrox' | 'Crossfit' | 'Other'

export interface Coach {
    id: string
    name: string
    specialty?: string | null
    specialties?: string[] | null
    created_at: string
}

export interface TrainingSession {
    id: string
    title: string
    description: string | null
    start_time: string // ISO string
    end_time: string // ISO string
    capacity: number
    instructor: string | null // Keep for legacy or fallback
    coach_id?: string | null
    coach?: Coach | null // For joined queries
    type: TrainingType
    created_at: string
    participant_count?: number
}

export interface Registration {
    id: string
    user_id: string
    training_id: string
    status: 'confirmed' | 'cancelled' | 'waitlist'
    created_at: string
}

export interface BookingLog {
    id: string
    booking_id: string
    user_id: string | null
    action: 'created' | 'updated' | 'cancelled' | 'payment_updated'
    notes: string | null
    created_at: string
    user?: {
        full_name: string | null
        email: string | null
    }
}
