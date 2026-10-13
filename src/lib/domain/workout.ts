import { isValidTimezone } from "@/lib/validation/profile";

/**
 * Calculates the local calendar activity date (YYYY-MM-DD) for a given UTC timestamp
 * within a specific IANA timezone.
 *
 * Falls back to 'UTC' if the timezone is invalid or unparseable.
 *
 * @param date - The JavaScript Date to convert (defaults to now)
 * @param timeZone - The IANA timezone string (e.g., 'Asia/Kolkata', 'America/New_York')
 * @returns An ISO-8601 date string formatted as YYYY-MM-DD
 */
export function calculateActivityDate(
  date: Date = new Date(),
  timeZone: string = "Asia/Kolkata"
): string {
  const safeTimezone = isValidTimezone(timeZone) ? timeZone : "UTC";

  // Use Intl.DateTimeFormat with en-CA (which naturally outputs YYYY-MM-DD)
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}
