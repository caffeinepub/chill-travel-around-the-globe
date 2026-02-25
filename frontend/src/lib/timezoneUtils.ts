/**
 * Time Zone Utilities
 * Handles time zone boundary detection and local time calculations
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

// Global cache for timezone data
declare global {
  interface Window {
    TZ_DATA?: TimeZoneData;
  }
}

let isLoading = false;
let loadPromise: Promise<TimeZoneData> | null = null;

const DB_NAME = 'timezone-db';
const DB_VERSION = 1;
const STORE_NAME = 'timezone-store';
const CACHE_KEY = 'timezone-geojson-data';

// IndexedDB helper functions
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const getFromDB = async <T,>(key: string): Promise<T | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (error) {
    console.error('Error getting from IndexedDB:', error);
    return null;
  }
};

const saveToDB = async <T,>(key: string, value: T): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    throw error;
  }
};

/**
 * Load timezone JSON from IndexedDB
 */
async function loadTimezoneJson(): Promise<TimeZoneData | null> {
  try {
    const data = await getFromDB<TimeZoneData>(CACHE_KEY);
    return data;
  } catch (error) {
    console.error('Error loading timezone data from IndexedDB:', error);
    return null;
  }
}

/**
 * Validate timezone data structure
 */
function validateTimeZoneData(data: any): data is TimeZoneData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (data.type !== 'FeatureCollection') {
    return false;
  }

  if (!Array.isArray(data.features)) {
    return false;
  }

  return true;
}

/**
 * Load time zone boundary data - prioritizes backend, then IndexedDB
 */
export async function loadTimeZoneData(): Promise<TimeZoneData> {
  // Check if already cached in window
  if (window.TZ_DATA) {
    console.log(`Timezone data loaded from window: ${window.TZ_DATA.features.length} features`);
    return window.TZ_DATA;
  }

  if (loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      // Step 1: Check IndexedDB first for faster initial load
      console.log('Attempting to load timezone data from IndexedDB...');
      const idbData = await loadTimezoneJson();
      
      if (idbData && validateTimeZoneData(idbData) && idbData.features.length > 0) {
        console.log(`Loaded timezone data from IndexedDB: ${idbData.features.length} features`);
        window.TZ_DATA = idbData;
      }

      // Step 2: Try to fetch from backend (this will update cache if newer data exists)
      try {
        console.log('Fetching timezone data from backend...');
        const { createActorWithConfig } = await import('@/config');
        const backend = await createActorWithConfig();
        
        const jsonText = await backend.getTimezoneGeoJson();
        
        if (jsonText && jsonText.trim() !== '') {
          const data: TimeZoneData = JSON.parse(jsonText);
          
          if (validateTimeZoneData(data) && data.features.length > 0) {
            console.log(`Successfully fetched timezone data from backend: ${data.features.length} features`);
            
            // Cache to window
            window.TZ_DATA = data;
            
            // Cache to IndexedDB for offline use
            try {
              await saveToDB(CACHE_KEY, data);
              console.log('Timezone data cached to IndexedDB for offline use');
            } catch (cacheError) {
              console.warn('Failed to cache timezone data to IndexedDB:', cacheError);
            }
            
            isLoading = false;
            return data;
          }
        }
      } catch (backendError) {
        console.warn('Failed to fetch from backend, using IndexedDB cache:', backendError);
      }

      // Step 3: If we have IndexedDB data, use it
      if (window.TZ_DATA) {
        isLoading = false;
        return window.TZ_DATA;
      }

      // Step 4: No data available
      console.warn('No timezone data available from backend or IndexedDB');
      isLoading = false;
      loadPromise = null;
      
      // Return empty FeatureCollection
      const emptyData: TimeZoneData = {
        type: 'FeatureCollection',
        features: []
      };
      window.TZ_DATA = emptyData;
      return emptyData;
    } catch (error) {
      isLoading = false;
      loadPromise = null;
      console.error('Error loading timezone data:', error);
      
      // Return empty FeatureCollection on error
      const emptyData: TimeZoneData = {
        type: 'FeatureCollection',
        features: []
      };
      window.TZ_DATA = emptyData;
      return emptyData;
    }
  })();

  return loadPromise;
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if point is in multi-polygon
 */
function pointInMultiPolygon(point: [number, number], multiPolygon: number[][][]): boolean {
  for (const polygon of multiPolygon) {
    if (pointInPolygon(point, polygon)) {
      return true;
    }
  }
  return false;
}

/**
 * Find time zone for given latitude and longitude
 */
export function findTimeZone(lat: number, lon: number): {
  tzid: string;
  utcOffset: number;
  localTime: string;
  displayName: string;
} | null {
  if (!window.TZ_DATA) {
    console.warn('Time zone data not loaded');
    return null;
  }

  const point: [number, number] = [lon, lat];

  // Search through all time zone features
  for (const feature of window.TZ_DATA.features) {
    const { geometry, properties } = feature;
    let isInside = false;

    if (geometry.type === 'Polygon') {
      // Check each ring (first is outer boundary, rest are holes)
      const rings = geometry.coordinates as number[][][];
      if (rings.length > 0) {
        isInside = pointInPolygon(point, rings[0]);
        // Check holes
        for (let i = 1; i < rings.length; i++) {
          if (pointInPolygon(point, rings[i])) {
            isInside = false;
            break;
          }
        }
      }
    } else if (geometry.type === 'MultiPolygon') {
      const polygons = geometry.coordinates as number[][][][];
      for (const polygon of polygons) {
        if (polygon.length > 0) {
          let polyInside = pointInPolygon(point, polygon[0]);
          // Check holes
          for (let i = 1; i < polygon.length; i++) {
            if (pointInPolygon(point, polygon[i])) {
              polyInside = false;
              break;
            }
          }
          if (polyInside) {
            isInside = true;
            break;
          }
        }
      }
    }

    if (isInside) {
      const tzid = properties.tzid;
      
      // Calculate UTC offset and local time using Intl API
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tzid,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZoneName: 'short'
        });

        const parts = formatter.formatToParts(now);
        const timeParts = parts.filter(p => ['hour', 'minute', 'second'].includes(p.type));
        const localTime = timeParts.map(p => p.value).join(':');
        
        const timeZoneNamePart = parts.find(p => p.type === 'timeZoneName');
        const timeZoneName = timeZoneNamePart ? timeZoneNamePart.value : '';

        // Calculate UTC offset
        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tzid }));
        const utcOffset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);

        // Create display name
        const offsetSign = utcOffset >= 0 ? '+' : '';
        const offsetHours = Math.floor(Math.abs(utcOffset));
        const offsetMinutes = Math.round((Math.abs(utcOffset) - offsetHours) * 60);
        const offsetStr = `UTC${offsetSign}${offsetHours}${offsetMinutes > 0 ? `:${offsetMinutes.toString().padStart(2, '0')}` : ''}`;

        return {
          tzid,
          utcOffset,
          localTime,
          displayName: `${tzid.replace(/_/g, ' ')} (${offsetStr})`
        };
      } catch (error) {
        console.error('Error calculating time zone info:', error);
        return {
          tzid,
          utcOffset: 0,
          localTime: 'N/A',
          displayName: tzid.replace(/_/g, ' ')
        };
      }
    }
  }

  // Fallback to UTC for ocean/unknown areas
  const now = new Date();
  const utcTime = now.toISOString().split('T')[1].split('.')[0];
  
  return {
    tzid: 'Etc/UTC',
    utcOffset: 0,
    localTime: utcTime,
    displayName: 'UTC+0 (Ocean/International Waters)'
  };
}

/**
 * Get all time zone boundaries for visualization
 */
export function getTimeZoneBoundaries(): TimeZoneFeature[] {
  if (!window.TZ_DATA) {
    return [];
  }
  return window.TZ_DATA.features;
}

/**
 * Check if time zone data is loaded
 */
export function isTimeZoneDataLoaded(): boolean {
  return !!window.TZ_DATA;
}

/**
 * Check if time zone data is currently loading
 */
export function isTimeZoneDataLoading(): boolean {
  return isLoading;
}
