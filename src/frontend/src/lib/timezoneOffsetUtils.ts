/**
 * Timezone Offset Utilities
 * Helper functions to get timezone IDs for a given UTC offset with quarter-hour precision
 */

interface TimeZoneFeature {
  type: 'Feature';
  properties: {
    tzid: string;
    utc_offset?: number;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface TimeZoneData {
  type: 'FeatureCollection';
  features: TimeZoneFeature[];
}

// Constants for quarter-hour rounding
const EPS = 1e-9;
const MATCH_TOL = 0.126;

/**
 * Round offset to nearest quarter hour (0.25 hour increments)
 * Returns values like 5.75, 6.5, 8.75, etc.
 */
function roundToQuarterHour(hours: number): number {
  // Round to nearest 0.25 (quarter hour)
  return Math.round(hours * 4) / 4;
}

/**
 * Get all timezone IDs (tzids) for a given UTC offset with quarter-hour precision
 * @param tzData - Timezone GeoJSON data
 * @param utcOffset - UTC offset in hours (e.g., 8 for UTC+8, -5 for UTC-5, 5.75 for UTC+5:45)
 * @returns Array of timezone IDs matching the offset
 */
export function getTzidsForOffset(tzData: TimeZoneData, utcOffset: number): string[] {
  if (!tzData || !tzData.features) {
    console.warn('[TZ OFFSET] No timezone data available');
    return [];
  }

  const tzids: string[] = [];

  // Calculate offset for each timezone using Intl API
  const now = new Date();

  for (const feature of tzData.features) {
    const tzid = feature.properties.tzid;

    // Skip "Etc/" zones
    if (tzid.startsWith('Etc/')) continue;

    try {
      // Calculate UTC offset using Intl API (DST-aware)
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tzid }));
      const calculatedOffset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);

      // Round to nearest quarter hour
      const roundedOffset = roundToQuarterHour(calculatedOffset);

      // Compare with tolerance
      if (Math.abs(roundedOffset - utcOffset) < MATCH_TOL) {
        tzids.push(tzid);
      }
    } catch (error) {
      // Skip timezones that can't be processed
      console.warn(`[TZ OFFSET] Could not process timezone: ${tzid}`, error);
    }
  }

  console.log(`[TZ OFFSET] Found ${tzids.length} timezones for UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`);
  return tzids;
}
