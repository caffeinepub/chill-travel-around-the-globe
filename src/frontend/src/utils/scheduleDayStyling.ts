/**
 * Utility functions for schedule day-based styling (labels and colors)
 */

// Day color palette - each day gets a distinct color
const DAY_COLORS = [
  '#3b82f6', // Day 1: Blue
  '#10b981', // Day 2: Green
  '#f59e0b', // Day 3: Amber
  '#ef4444', // Day 4: Red
  '#8b5cf6', // Day 5: Purple
  '#ec4899', // Day 6: Pink
  '#06b6d4', // Day 7: Cyan
  '#f97316', // Day 8: Orange
  '#14b8a6', // Day 9: Teal
  '#a855f7', // Day 10: Violet
];

/**
 * Get color for a specific day index (0-based)
 * Uses modulo to cycle through colors if there are more days than colors
 */
export function getDayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

/**
 * Convert 0-based day index to day label (e.g., 0 -> "D1", 1 -> "D2")
 */
export function getDayLabel(dayIndex: number): string {
  return `D${dayIndex + 1}`;
}

/**
 * Compute day index for a schedule item within a journey's schedule
 * Groups schedule items by date and returns the day index (0-based)
 */
export function computeDayIndex(
  scheduleItem: { date: bigint },
  allScheduleItems: { date: bigint }[]
): number {
  // Sort all items by date
  const sortedItems = [...allScheduleItems].sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return 0;
  });

  // Find unique dates to determine day groupings
  const uniqueDates: bigint[] = [];
  sortedItems.forEach(item => {
    if (!uniqueDates.some(d => d === item.date)) {
      uniqueDates.push(item.date);
    }
  });

  // Find which day index this schedule item belongs to
  const dayIndex = uniqueDates.findIndex(d => d === scheduleItem.date);
  return dayIndex >= 0 ? dayIndex : 0;
}
