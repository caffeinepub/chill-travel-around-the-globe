import { ScheduleItem } from '@/backend';

/**
 * Color palette for day labels (D1, D2, D3, etc.)
 * Using vibrant, distinct colors for better visibility
 */
const DAY_COLORS = [
  '#ef4444', // Red (Day 1)
  '#f97316', // Orange (Day 2)
  '#eab308', // Yellow (Day 3)
  '#22c55e', // Green (Day 4)
  '#06b6d4', // Cyan (Day 5)
  '#3b82f6', // Blue (Day 6)
  '#8b5cf6', // Purple (Day 7)
  '#ec4899', // Pink (Day 8)
  '#f43f5e', // Rose (Day 9)
  '#14b8a6', // Teal (Day 10)
];

/**
 * Get color for a given day index
 * Cycles through the color palette if there are more than 10 days
 */
export function getDayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

/**
 * Get day label (D1, D2, D3, etc.) for a given day index
 */
export function getDayLabel(dayIndex: number): string {
  return `D${dayIndex + 1}`;
}

/**
 * Compute day index for a schedule item based on its date
 * Returns the zero-based day index within the journey
 * 
 * @param itemDate - The date of the schedule item (nanoseconds)
 * @param allItems - All schedule items in the journey (for determining day sequence)
 * @returns Zero-based day index (0 for first day, 1 for second day, etc.)
 */
export function computeDayIndex(itemDate: bigint, allItems: ScheduleItem[]): number {
  // Convert all dates to calendar days (YYYY-MM-DD)
  const itemDateMs = Number(itemDate) / 1_000_000;
  const itemDay = new Date(itemDateMs).toISOString().split('T')[0];

  // Get unique days sorted chronologically
  const uniqueDays = Array.from(
    new Set(
      allItems.map(item => {
        const dateMs = Number(item.date) / 1_000_000;
        return new Date(dateMs).toISOString().split('T')[0];
      })
    )
  ).sort();

  // Find the index of the current item's day
  const dayIndex = uniqueDays.indexOf(itemDay);
  return dayIndex >= 0 ? dayIndex : 0;
}

/**
 * Get a human-readable day context string (weekday + date)
 * 
 * @param dateNs - Date in nanoseconds
 * @returns Formatted string like "Monday, Jan 15"
 */
export function getDayContextString(dateNs: bigint): string {
  try {
    const dateMs = Number(dateNs) / 1_000_000;
    const date = new Date(dateMs);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${weekday}, ${monthDay}`;
  } catch {
    return '';
  }
}
