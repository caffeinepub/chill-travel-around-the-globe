import { ScheduleItem } from '@/backend';

/**
 * Group schedule items by calendar day (date only, ignoring time)
 */
export function groupScheduleItemsByDay(items: Array<[ScheduleItem, [number, number]]>): Map<string, Array<[ScheduleItem, [number, number]]>> {
  const dayGroups = new Map<string, Array<[ScheduleItem, [number, number]]>>();

  items.forEach(([item, coords]) => {
    // Convert nanosecond timestamp to milliseconds and create date string (YYYY-MM-DD)
    const dateMs = Number(item.date) / 1_000_000;
    const date = new Date(dateMs);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (!dayGroups.has(dayKey)) {
      dayGroups.set(dayKey, []);
    }
    dayGroups.get(dayKey)!.push([item, coords]);
  });

  return dayGroups;
}

/**
 * Parse time string (HH:mm format) to minutes since midnight for sorting
 * Returns a large number for invalid times to push them to the end
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') {
    return 999999; // Invalid time goes to end
  }

  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) {
    return 999999;
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 999999;
  }

  return hours * 60 + minutes;
}

/**
 * Sort schedule items within a day by time (chronological order)
 */
export function sortScheduleItemsByTime(items: Array<[ScheduleItem, [number, number]]>): Array<[ScheduleItem, [number, number]]> {
  return [...items].sort((a, b) => {
    const timeA = parseTimeToMinutes(a[0].time);
    const timeB = parseTimeToMinutes(b[0].time);
    return timeA - timeB;
  });
}

/**
 * Build per-day route data with coordinates in chronological order
 * Returns an array of day groups, each containing sorted coordinates
 */
export function buildDayRoutes(items: Array<[ScheduleItem, [number, number]]>): Array<{
  dayKey: string;
  coordinates: Array<[number, number]>;
  items: Array<[ScheduleItem, [number, number]]>;
}> {
  const dayGroups = groupScheduleItemsByDay(items);
  const routes: Array<{
    dayKey: string;
    coordinates: Array<[number, number]>;
    items: Array<[ScheduleItem, [number, number]]>;
  }> = [];

  dayGroups.forEach((dayItems, dayKey) => {
    // Only create routes for days with 2+ items
    if (dayItems.length < 2) {
      return;
    }

    // Sort items by time
    const sortedItems = sortScheduleItemsByTime(dayItems);

    // Extract coordinates in chronological order
    const coordinates = sortedItems.map(([_, coords]) => coords);

    routes.push({
      dayKey,
      coordinates,
      items: sortedItems,
    });
  });

  return routes;
}
