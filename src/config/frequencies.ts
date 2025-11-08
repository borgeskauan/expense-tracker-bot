/**
 * Frequency constants and helpers for recurring expenses
 */

export const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;
export type Frequency = typeof FREQUENCIES[number];

/**
 * Validate frequency string
 */
export function isValidFrequency(freq: string): freq is Frequency {
  return FREQUENCIES.includes(freq as Frequency);
}

/**
 * Validate day of week (0-6, Sunday-Saturday)
 */
export function isValidDayOfWeek(day: number): boolean {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

/**
 * Validate day of month (1-31)
 */
export function isValidDayOfMonth(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

/**
 * Validate month of year (0-11, January-December)
 */
export function isValidMonthOfYear(month: number): boolean {
  return Number.isInteger(month) && month >= 0 && month <= 11;
}

/**
 * Calculate next due date based on start date and recurrence pattern
 */
export function calculateNextDueDate(
  startDate: Date,
  frequency: Frequency,
  interval: number = 1,
  dayOfWeek?: number,
  dayOfMonth?: number,
  monthOfYear?: number
): Date {
  const nextDue = new Date(startDate);
  
  switch (frequency) {
    case "daily":
      nextDue.setDate(nextDue.getDate() + interval);
      break;
      
    case "weekly":
      if (dayOfWeek === undefined) {
        throw new Error("dayOfWeek is required for weekly frequency");
      }
      if (!isValidDayOfWeek(dayOfWeek)) {
        throw new Error("dayOfWeek must be between 0 (Sunday) and 6 (Saturday)");
      }
      
      // Find next occurrence of the specified day of week
      const currentDay = nextDue.getDay();
      let daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
      
      // If it's the same day and we're starting today, move to next week
      if (daysUntilTarget === 0) {
        daysUntilTarget = 7;
      }
      
      nextDue.setDate(nextDue.getDate() + daysUntilTarget);
      
      // Add additional weeks if interval > 1
      if (interval > 1) {
        nextDue.setDate(nextDue.getDate() + (interval - 1) * 7);
      }
      break;
      
    case "monthly":
      if (dayOfMonth === undefined) {
        throw new Error("dayOfMonth is required for monthly frequency");
      }
      if (!isValidDayOfMonth(dayOfMonth)) {
        throw new Error("dayOfMonth must be between 1 and 31");
      }
      
      // Move to next month first
      nextDue.setMonth(nextDue.getMonth() + interval);
      
      // Set the day, handling months with fewer days
      const targetMonth = nextDue.getMonth();
      nextDue.setDate(Math.min(dayOfMonth, getDaysInMonth(nextDue.getFullYear(), targetMonth)));
      break;
      
    case "yearly":
      if (monthOfYear !== undefined) {
        if (!isValidMonthOfYear(monthOfYear)) {
          throw new Error("monthOfYear must be between 0 (January) and 11 (December)");
        }
        
        // Move to next year first
        nextDue.setFullYear(nextDue.getFullYear() + interval);
        
        // Set the target month
        nextDue.setMonth(monthOfYear);
        
        // Handle day-of-month edge cases (e.g., Feb 30 -> Feb 28/29)
        const targetMonth = nextDue.getMonth();
        const currentDay = nextDue.getDate();
        const daysInTargetMonth = getDaysInMonth(nextDue.getFullYear(), targetMonth);
        
        if (currentDay > daysInTargetMonth) {
          nextDue.setDate(daysInTargetMonth);
        }
      } else {
        // No month specified, just add years
        nextDue.setFullYear(nextDue.getFullYear() + interval);
      }
      break;
      
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
  
  return nextDue;
}

/**
 * Get number of days in a month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get human-readable frequency description
 */
export function getFrequencyDescription(
  frequency: Frequency,
  interval: number = 1,
  dayOfWeek?: number,
  dayOfMonth?: number,
  monthOfYear?: number
): string {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];
  
  switch (frequency) {
    case "daily":
      return interval === 1 ? "every day" : `every ${interval} days`;
      
    case "weekly":
      const dayName = dayOfWeek !== undefined ? dayNames[dayOfWeek] : "?";
      return interval === 1 
        ? `every ${dayName}` 
        : `every ${interval} weeks on ${dayName}`;
      
    case "monthly":
      const ordinal = getOrdinal(dayOfMonth || 1);
      return interval === 1 
        ? `monthly on the ${ordinal}` 
        : `every ${interval} months on the ${ordinal}`;
      
    case "yearly":
      if (monthOfYear !== undefined) {
        const monthName = monthNames[monthOfYear];
        return interval === 1 
          ? `yearly in ${monthName}` 
          : `every ${interval} years in ${monthName}`;
      }
      return interval === 1 ? "yearly" : `every ${interval} years`;
      
    default:
      return frequency;
  }
}

/**
 * Convert number to ordinal (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Get frequency enum description for AI
 */
export function getFrequenciesDescription(): string {
  return "Available frequencies: daily, weekly, monthly, yearly";
}
