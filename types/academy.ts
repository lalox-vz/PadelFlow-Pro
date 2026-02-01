// Academy-specific types

export interface AcademyStudent {
    id: string
    academy_id: string
    user_id?: string | null
    full_name: string
    email?: string | null
    phone?: string | null
    enrollment_date: string
    program_id?: string | null
    status: 'active' | 'inactive' | 'on_hold'
    attendance_rate: number
    payment_status: 'paid' | 'pending' | 'overdue'
    notes?: string | null
    created_at: string
    updated_at: string
}

export interface AcademyCoach {
    id: string
    academy_id: string
    user_id?: string | null
    name: string
    email?: string | null
    phone?: string | null
    specialty?: string | null
    experience_years: number
    rating: number
    availability: 'full_time' | 'part_time' | 'substitute'
    status: 'active' | 'on_leave' | 'inactive'
    bio?: string | null
    created_at: string
    updated_at: string
}

export interface AcademyClass {
    id: string
    academy_id: string
    coach_id?: string | null
    title: string
    description?: string | null
    day_of_week: number // 0-6 (Monday-Sunday)
    start_time: string // HH:MM format
    duration_minutes: number
    max_students: number
    current_students: number
    color: string
    status: 'active' | 'cancelled' | 'completed'
    recurring: boolean
    created_at: string
    updated_at: string
    // Joined data
    coach?: AcademyCoach
}

export interface ClassEnrollment {
    id: string
    student_id: string
    class_id: string
    enrolled_at: string
    status: 'active' | 'dropped' | 'completed'
}

// Extended types with joined data
export interface AcademyStudentWithProgram extends AcademyStudent {
    program?: string
    classes_enrolled?: number
}

export interface AcademyCoachWithStats extends AcademyCoach {
    students_assigned: number
    classes_this_month: number
}
