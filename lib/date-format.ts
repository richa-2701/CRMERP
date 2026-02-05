// lib/date-format.ts
import { format } from 'date-fns';

/**
 * **DEFINITIVE, EXPLICIT UTC PARSING LOGIC**
 * This function correctly parses multiple date formats from the API and creates a valid Date object
 * representing that moment in time in UTC. This part is working correctly.
 * It handles:
 * 1. Microsoft's legacy format: "/Date(1760142600000)/"
 * 2. C#'s naive UTC string: "2025-10-11 06:00:00"
 * 
 * @param dateInput - The date string or Date object from the API.
 * @returns A valid Date object (representing a moment in UTC) or null if parsing fails.
 */
function parseAsUTCDate(dateInput?: string | Date): Date | null {
  // 1. Guard against invalid inputs or if it's already a Date object.
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string' && dateInput.trim() === '') return null;

  // 2. Handle Microsoft's "/Date(ticks)/" format first.
  const msDateRegex = /^\/Date\((\d+)\)\/$/;
  const msMatch = dateInput.match(msDateRegex);
  if (msMatch && msMatch[1]) {
    const ticks = parseInt(msMatch[1], 10);
    return !isNaN(ticks) ? new Date(ticks) : null;
  }

  // 3. Manually parse the "YYYY-MM-DD HH:mm:ss" string to create a reliable UTC date.
  const csharpDateRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
  const parts = dateInput.match(csharpDateRegex);

  if (parts) {
    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed in JS
    const day = parseInt(parts[3], 10);
    const hour = parseInt(parts[4], 10);
    const minute = parseInt(parts[5], 10);
    const second = parseInt(parts[6], 10);

    // Date.UTC() reliably creates a timestamp from UTC components.
    const utcTimestamp = Date.UTC(year, month, day, hour, minute, second);
    
    if (!isNaN(utcTimestamp)) {
      return new Date(utcTimestamp);
    }
  }
  
  // 4. Fallback for any other standard date strings.
  const fallbackDate = new Date(dateInput);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  console.error("Failed to parse an unrecognized date string format:", dateInput);
  return null;
}

/**
 * Formats a date from the API into a localized date and time string for the user.
 * 
 * @param dateInput - The date string or Date object from the API.
 */
export function formatDateTime(dateInput?: string | Date): string {
    const utcDate = parseAsUTCDate(dateInput); 
    
    if (!utcDate) return "N/A";
    
    try {
        // --- START OF FIX: Removed manual timezone offset ---
        // The original code manually added 5.5 hours, but the `format` function
        // ALSO automatically converts the time to the user's local timezone.
        // This resulted in the offset being applied twice.
        // The correct approach is to let `date-fns` handle the entire conversion.
        // It will correctly display the time for any user in any timezone.
        return format(utcDate, 'PPp'); 
        // --- END OF FIX ---

    } catch (error) {
        console.error("Error formatting datetime:", dateInput, error);
        return "Invalid DateTime";
    }
}

// Export the parser for use in other parts of the app (like sorting and status checks).
export { parseAsUTCDate };