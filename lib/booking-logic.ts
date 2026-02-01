import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const CLUB_TIMEZONE = 'America/Caracas';

export interface OpeningHour {
    dayOfWeek: number; // 0-6
    openTime: string; // "07:00"
    closeTime: string; // "23:00"
}

export interface PricingRule {
    days: number[];
    startTime: string;
    endTime: string;
    price: number;
    courtIds?: string[]; // Optional: if present, rule only applies to these courts
}

export interface Court {
    id: string; // Unique identifier (uuid)
    name: string; // "Cancha 1"
    type: 'indoor' | 'outdoor' | 'covered';
    isActive: boolean;
    basePrice?: number;
    surface?: string;
}

export interface BookingRules {
    defaultDuration: 90 | 120; // Minutes
    advanceBookingDays: number; // How far in future (days)
    cancellationWindow: number; // Hours before start
}

export interface EntityConfiguration {
    basePrice: number; // Standard price per block
    courts: Court[];
    bookingRules: BookingRules;

    // SQL Relational Fields
    openingHours?: OpeningHour[];
    pricingRules?: PricingRule[];
}

// Minimal booking interface for availability checks
export interface ExistingBooking {
    courtId: string;
    startTime: Date;
    endTime: Date;
}

export interface AvailableSlot {
    time: string; // "08:00"
    price: number;
    availableCourts: string[]; // Returns IDs of courts available at this time
}

function isTimeInRange(current: string, start: string, end: string): boolean {
    return current >= start && current < end;
}

/**
 * Utility function to calculate the price of a booking based on the configuration.
 * Implements specificity cascade: Dynamic Rule > Court Base Price > Club Base Price
 */
export function calculatePrice(bookingTime: Date, config: EntityConfiguration, courtId?: string, courtBasePrice?: number): number {

    // 1. Convert to Club Timezone for accurate Rules check
    // This ensures that 5PM UTC is treated as 1PM Caracas (or whatever the offset is)
    // The input 'bookingTime' is a JS Date (absolute time).
    const zonedDate = toZonedTime(bookingTime, CLUB_TIMEZONE);

    const dayOfWeek = zonedDate.getDay();
    const hours = zonedDate.getHours().toString().padStart(2, '0');
    const minutes = zonedDate.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    // 2. Level 1: Dynamic Pricing Rules
    if (config.pricingRules && config.pricingRules.length > 0) {
        for (const rule of config.pricingRules) {
            if (rule.days.includes(dayOfWeek)) {
                if (isTimeInRange(currentTime, rule.startTime, rule.endTime)) {

                    // Specificity Check
                    if (rule.courtIds && rule.courtIds.length > 0) {
                        if (!courtId) continue;
                        if (!rule.courtIds.includes(courtId)) continue;
                    }

                    return Number(rule.price);
                }
            }
        }
    }

    // 3. Level 2: Court Specific Base Price
    // Note: courtBasePrice is passed explicitly from the caller who knows which court is being queried
    if (courtBasePrice !== undefined && courtBasePrice !== null) {
        return Number(courtBasePrice);
    }

    // 4. Level 3: Club Global Base Price
    return config.basePrice;
}


/**
 * Generates available slots for a specific date given the entity config and existing bookings.
 */
export function getAvailableSlots(
    date: Date,
    config: EntityConfiguration,
    existingBookings: ExistingBooking[]
): AvailableSlot[] {
    const slots: AvailableSlot[] = [];

    // Ensure we are looking at the day in Club Time
    const zonedDate = toZonedTime(date, CLUB_TIMEZONE);
    const dayOfWeek = zonedDate.getDay();

    // 1. Determine Hours (Relational Only)
    let openStr, closeStr;

    if (config.openingHours && config.openingHours.length > 0) {
        const oh = config.openingHours.find(h => h.dayOfWeek === dayOfWeek);
        if (!oh) return []; // Closed for the day
        openStr = oh.openTime;
        closeStr = oh.closeTime;
        if (openStr.length > 5) openStr = openStr.substring(0, 5);
        if (closeStr.length > 5) closeStr = closeStr.substring(0, 5);
    } else {
        return [];
    }

    const durationMinutes = config.bookingRules.defaultDuration || 90;
    const [openHour, openMinute] = openStr.split(':').map(Number);
    const [closeHour, closeMinute] = closeStr.split(':').map(Number);

    // Current logic typically creates slots relative to the input 'date'.
    // Use proper timezone construction to ensure that 'currentSlot' is "07:00 Caracas" in UTC.

    const year = zonedDate.getFullYear();
    const month = zonedDate.getMonth();
    const day = zonedDate.getDate();

    const createZonedDate = (h: number, m: number) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        // This creates a string like "2024-02-05T07:00:00" (no Z).
        const isoLike = `${year}-${pad(month + 1)}-${pad(day)}T${pad(h)}:${pad(m)}:00`;
        // fromZonedTime treats this "wall clock time" as belonging to Caracas, and returns the absolute UTC Date.
        return fromZonedTime(isoLike, CLUB_TIMEZONE);
    };

    let currentSlot = createZonedDate(openHour, openMinute);
    const closeTime = createZonedDate(closeHour, closeMinute);

    // Iterate
    while (currentSlot.getTime() + (durationMinutes * 60 * 1000) <= closeTime.getTime()) {
        const slotEnd = new Date(currentSlot.getTime() + (durationMinutes * 60 * 1000));

        // Format time string for output (in Club Time)
        const slotInZone = toZonedTime(currentSlot, CLUB_TIMEZONE);
        const hours = slotInZone.getHours().toString().padStart(2, '0');
        const minutes = slotInZone.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;

        // Find which courts are FREE
        const availableCourts = config.courts
            .filter(court => court.isActive)
            .filter(court => {
                const hasConflict = existingBookings.some(booking => {
                    if (booking.courtId !== court.id) return false;
                    const bookingStart = new Date(booking.startTime);
                    const bookingEnd = new Date(booking.endTime);
                    return currentSlot < bookingEnd && slotEnd > bookingStart;
                });
                return !hasConflict;
            })
            .map(c => c.id);

        if (availableCourts.length > 0) {
            slots.push({
                time: timeString,
                price: calculatePrice(currentSlot, config), // Generic price since we aggregate
                availableCourts: availableCourts
            });
        }

        currentSlot = slotEnd;
    }

    return slots;
}

export function createDefaultConfig(): EntityConfiguration {
    return {
        basePrice: 40,
        courts: [],
        bookingRules: {
            defaultDuration: 90,
            advanceBookingDays: 14,
            cancellationWindow: 24
        },
        openingHours: [],
        pricingRules: []
    };
}
