export type BusinessType = 'club' | 'academy'

export interface Business {
    id: string
    owner_id: string
    type: BusinessType
    name: string
    fiscal_id?: string | null
    city?: string | null
    state?: string | null
    logo_url?: string | null
    phone?: string | null
    email?: string | null

    // Club Specifics
    court_count?: number | null
    surface_type?: string | null
    is_covered?: boolean | null
    hourly_rate?: number | null
    lighting_cost?: number | null

    // Academy Specifics
    specialty?: string | null
    monthly_fee?: number | null
    registration_fee?: number | null

    // JSONB Fields
    operating_hours?: OperatingHours | null
    payment_methods?: PaymentMethodConfig[] | null
    booking_rules?: BookingRules | null
    coaches?: CoachInfo[] | null
    programs?: ProgramInfo[] | null

    created_at: string
    updated_at: string
}

export interface OperatingHours {
    start: string // "07:00"
    end: string // "22:00"
    days?: string[] // ["mon", "tue", ...]
}

export interface PaymentMethodConfig {
    type: 'cash' | 'zelle' | 'pago_movil' | 'card'
    enabled: boolean
    details?: string | {
        email?: string
        phone?: string
        bank?: string
        id_doc?: string
        [key: string]: any
    }
    require_proof?: boolean // For cash/transfers
}

export interface BookingRules {
    min_time_minutes: number
    max_time_minutes: number
    cancellation_hours: number
}

export interface CoachInfo {
    id: string
    name: string
    specialty: string
}

export interface ProgramInfo {
    id: string
    name: string
    description: string
}

export interface OnboardingState {
    step: number
    data: Partial<Business>
}
