import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseISO, format as formatDateFns } from "date-fns"
import { toZonedTime, format as formatZoned } from "date-fns-tz"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const TIMEZONE = 'America/Caracas'

/**
 * Converts a UTC string (from DB) to a Zoneless Date object representing the time in Caracas.
 * E.g. '2026-01-26T23:00:00Z' (which is Jan 26 19:00 in Caracas) 
 * OR '2026-01-27T03:00:00Z' (which is Jan 26 23:00 in Caracas)
 * will effectively represent "Jan 26 23:00" in the Date object components.
 */
export function toLocalTime(dateStr: string | Date): Date {
  return toZonedTime(dateStr, TIMEZONE)
}

/**
 * Safe formatter that respects the project's timezone logic.
 */
export function formatLocal(date: Date | string, formatStr: string): string {
  const zoned = toZonedTime(date, TIMEZONE)
  return formatZoned(zoned, formatStr, { timeZone: TIMEZONE })
}
