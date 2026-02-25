import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { LocationInfo, Journey, CityRating, CityAlbum, MediaFile, MediaType, TravelSpot, SocialMediaLink, MusicAlbum, Song, WebsiteLayoutSettings, ScheduleItem, VibeItem, MapBookmark, GeonameCity } from '@/backend';

// Country name mapping for case-insensitive and alternative name support
const COUNTRY_NAME_MAP: Record<string, string> = {
  // Exact matches (normalized to lowercase)
  'united states': 'United States',
  'canada': 'Canada',
  'brazil': 'Brazil',
  'united kingdom': 'United Kingdom',
  'france': 'France',
  'germany': 'Germany',
  'india': 'India',
  'china': 'China',
  'australia': 'Australia',
  'japan': 'Japan',
  
  // Common alternative names
  'usa': 'United States',
  'us': 'United States',
  'america': 'United States',
  'united states of america': 'United States',
  'uk': 'United Kingdom',
  'britain': 'United Kingdom',
  'great britain': 'United Kingdom',
  'england': 'United Kingdom',
  'deutschland': 'Germany',
  'nippon': 'Japan',
  'nihon': 'Japan',
  'people\'s republic of china': 'China',
  'prc': 'China',
  'republic of india': 'India',
  'bharat': 'India',
  'commonwealth of australia': 'Australia',
  'aussie': 'Australia',
  'oz': 'Australia',
  'french republic': 'France',
  'federal republic of germany': 'Germany',
  'federative republic of brazil': 'Brazil',
  'brasil': 'Brazil',
};

interface LocationResult {
  coordinates: [number, number];
  name: string;
  searchQuery: string; // Original search query from user
  type: 'country' | 'city' | 'town' | 'village';
  country?: string;
  state?: string;
}

interface WebsiteLayoutPreferences {
  showMusicPlayer: boolean;
  defaultSearchPlace: string;
  showAllTravelSpots: boolean;
  rippleSize?: number;
  cityFontSize?: number;
}

function normalizeCountryName(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  return COUNTRY_NAME_MAP[normalized] || null;
}

// Validate social media URLs
function validateSocialMediaUrl(url: string): { isValid: boolean; platform: string; error?: string } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // YouTube validation
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      // Check for video ID patterns
      const youtubePatterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
        /youtu\.be\/([a-zA-Z0-9_-]+)/
      ];
      
      const hasValidPattern = youtubePatterns.some(pattern => pattern.test(url));
      if (!hasValidPattern) {
        return { isValid: false, platform: 'youtube', error: 'Invalid YouTube video URL format' };
      }
      
      return { isValid: true, platform: 'youtube' };
    }
    
    // Instagram validation
    if (hostname.includes('instagram.com')) {
      // Check for video/reel patterns
      const instagramPatterns = [
        /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
        /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
        /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/
      ];
      
      const hasValidPattern = instagramPatterns.some(pattern => pattern.test(url));
      if (!hasValidPattern) {
        return { isValid: false, platform: 'instagram', error: 'Invalid Instagram video URL format. Please use post, reel, or IGTV URLs.' };
      }
      
      return { isValid: true, platform: 'instagram' };
    }
    
    return { isValid: false, platform: 'unknown', error: 'Only YouTube and Instagram video URLs are supported' };
  } catch (error) {
    return { isValid: false, platform: 'unknown', error: 'Invalid URL format' };
  }
}

// Geocoding function using Nominatim API (OpenStreetMap)
async function geocodeLocation(query: string): Promise<LocationResult | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&addressdetails=1&extratags=1`,
      {
        headers: {
          'User-Agent': 'LocationMapExplorer/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    // Determine location type based on OSM data
    let locationType: 'country' | 'city' | 'town' | 'village' = 'city';
    
    if (result.type === 'country' || result.class === 'boundary') {
      locationType = 'country';
    } else if (result.type === 'city' || result.class === 'place') {
      if (result.type === 'village' || result.type === 'hamlet') {
        locationType = 'village';
      } else if (result.type === 'town') {
        locationType = 'town';
      } else {
        locationType = 'city';
      }
    }

    // Extract location details
    const address = result.address || {};
    const displayName = result.display_name || query;
    
    // Get the primary name (city, town, country, etc.)
    const name = address.city || 
                 address.town || 
                 address.village || 
                 address.country || 
                 result.name || 
                 query;

    return {
      coordinates: [lat, lng],
      name: name,
      searchQuery: query, // Preserve original search query
      type: locationType,
      country: address.country,
      state: address.state || address.region
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Validate if a location is searchable (can be found on the map)
export async function validateLocationSearchable(location: string): Promise<boolean> {
  if (!location || location.trim() === '') {
    return false;
  }

  try {
    // First try to find it in our supported countries list
    const normalizedCountryName = normalizeCountryName(location);
    if (normalizedCountryName) {
      return true;
    }

    // Then try geocoding API
    const result = await geocodeLocation(location.trim());
    return result !== null;
  } catch (error) {
    console.error('Location validation error:', error);
    return false;
  }
}

// Geocode a travel spot within a city context
async function geocodeTravelSpot(spotName: string, cityName: string): Promise<[number, number] | null> {
  try {
    // Try searching for the specific spot within the city
    const fullQuery = `${spotName}, ${cityName}`;
    const encodedQuery = encodeURIComponent(fullQuery);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'LocationMapExplorer/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }

    // If specific spot not found, try just the spot name
    const spotOnlyQuery = encodeURIComponent(spotName);
    const spotResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${spotOnlyQuery}&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'LocationMapExplorer/1.0'
        }
      }
    );

    if (spotResponse.ok) {
      const spotData = await spotResponse.json();
      
      // Look for results that might be in the same city/region
      for (const result of spotData) {
        const address = result.address || {};
        const resultCity = address.city || address.town || address.village;
        
        if (resultCity && resultCity.toLowerCase().includes(cityName.toLowerCase())) {
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            return [lat, lng];
          }
        }
      }
      
      // If no city match, use the first result if it exists
      if (spotData.length > 0) {
        const result = spotData[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          return [lat, lng];
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Travel spot geocoding error:', error);
    return null;
  }
}

export function useGetCountryCoordinates() {
  const { actor } = useActor();

  return useMutation<[number, number] | null, Error, string>({
    mutationFn: async (countryName: string) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      
      // Normalize the country name for case-insensitive and alternative name support
      const normalizedName = normalizeCountryName(countryName);
      
      if (!normalizedName) {
        // Return null for unsupported countries instead of throwing an error
        return null;
      }
      
      // Initialize coordinates if needed
      await actor.initializeCoordinates();
      
      // Get country coordinates using the normalized name
      const result = await actor.getCountryCoordinates(normalizedName);
      return result;
    },
  });
}

export function useSearchLocation() {
  const { actor } = useActor();

  return useMutation<LocationResult | null, Error, string>({
    mutationFn: async (locationName: string) => {
      // First try to find it in our supported countries list
      const normalizedCountryName = normalizeCountryName(locationName);
      
      if (normalizedCountryName && actor) {
        try {
          await actor.initializeCoordinates();
          const countryCoords = await actor.getCountryCoordinates(normalizedCountryName);
          
          if (countryCoords) {
            return {
              coordinates: countryCoords,
              name: normalizedCountryName,
              searchQuery: locationName, // Preserve original search query
              type: 'country'
            };
          }
        } catch (error) {
          console.error('Backend country search failed:', error);
        }
      }
      
      // If not found in backend or backend fails, try geocoding API
      return await geocodeLocation(locationName);
    },
  });
}

// Location Information Management Hooks
export function useGetLocationInfo(locationName: string) {
  const { actor, isFetching } = useActor();

  return useQuery<LocationInfo | null>({
    queryKey: ['locationInfo', locationName],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getLocationInfo(locationName);
    },
    enabled: !!actor && !isFetching && !!locationName,
  });
}

export function useGetAllLocationInfo() {
  const { actor, isFetching } = useActor();

  return useQuery<LocationInfo[]>({
    queryKey: ['allLocationInfo'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllLocationInfo();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddLocationInfo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, {
    name: string;
    coordinates: [number, number];
    photoPath?: string;
  }>({
    mutationFn: async ({ name, coordinates, photoPath }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      await actor.addLocationInfo(name, coordinates, photoPath || null);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch location info queries
      queryClient.invalidateQueries({ queryKey: ['locationInfo', variables.name] });
      queryClient.invalidateQueries({ queryKey: ['allLocationInfo'] });
    },
  });
}

export function useUpdateLocationInfo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    name: string;
    photoPath?: string;
  }>({
    mutationFn: async ({ name, photoPath }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.updateLocationInfo(name, photoPath || null);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch location info queries
      queryClient.invalidateQueries({ queryKey: ['locationInfo', variables.name] });
      queryClient.invalidateQueries({ queryKey: ['allLocationInfo'] });
    },
  });
}

export function useDeleteLocationInfo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: async (name: string) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.deleteLocationInfo(name);
    },
    onSuccess: (_, name) => {
      // Invalidate and refetch location info queries
      queryClient.invalidateQueries({ queryKey: ['locationInfo', name] });
      queryClient.invalidateQueries({ queryKey: ['allLocationInfo'] });
    },
  });
}

// Journey Management Hooks
export function useGetAllJourneys() {
  const { actor, isFetching } = useActor();

  return useQuery<Journey[]>({
    queryKey: ['allJourneys'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllJourneys();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUpcomingJourneys() {
  const { actor, isFetching } = useActor();

  return useQuery<Journey[]>({
    queryKey: ['upcomingJourneys'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUpcomingJourneys();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPreviousJourneys() {
  const { actor, isFetching } = useActor();

  return useQuery<Journey[]>({
    queryKey: ['previousJourneys'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPreviousJourneys();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddJourney() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, {
    city: string;
    startDate: bigint;
    endDate: bigint;
  }>({
    mutationFn: async ({ city, startDate, endDate }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      await actor.addJourney(city, startDate, endDate);
    },
    onSuccess: () => {
      // Invalidate and refetch journey queries
      queryClient.invalidateQueries({ queryKey: ['allJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['previousJourneys'] });
    },
  });
}

export function useUpdateJourney() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    startDate: bigint;
    endDate: bigint;
  }>({
    mutationFn: async ({ city, startDate, endDate }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.updateJourney(city, startDate, endDate);
    },
    onSuccess: () => {
      // Invalidate and refetch journey queries
      queryClient.invalidateQueries({ queryKey: ['allJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['previousJourneys'] });
    },
  });
}

export function useDeleteJourney() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: async (city: string) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.deleteJourney(city);
    },
    onSuccess: () => {
      // Invalidate and refetch journey queries
      queryClient.invalidateQueries({ queryKey: ['allJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['previousJourneys'] });
    },
  });
}

// Schedule Management Hooks - Updated to be journey-specific
export function useGetScheduleItems(journeyCity: string) {
  const { actor, isFetching } = useActor();

  return useQuery<ScheduleItem[]>({
    queryKey: ['scheduleItems', journeyCity],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getScheduleItems(journeyCity);
    },
    enabled: !!actor && !isFetching && !!journeyCity,
  });
}

export function useGetJourneyScheduleWithDays(journeyCity: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[string, ScheduleItem[]]>>({
    queryKey: ['journeyScheduleWithDays', journeyCity],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getJourneyScheduleWithDays(journeyCity);
    },
    enabled: !!actor && !isFetching && !!journeyCity,
  });
}

export function useGetAllScheduleItems() {
  const { actor, isFetching } = useActor();

  return useQuery<ScheduleItem[]>({
    queryKey: ['allScheduleItems'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllScheduleItems();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllScheduleItemsWithCoordinates() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[ScheduleItem, [number, number]]>>({
    queryKey: ['allScheduleItemsWithCoordinates'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllScheduleItemsWithCoordinates();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddScheduleItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, {
    journeyCity: string;
    date: bigint;
    time: string;
    location: string;
    activity: string;
  }>({
    mutationFn: async ({ journeyCity, date, time, location, activity }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      // Since location is now mandatory, we can pass it directly as a string
      await actor.addScheduleItem(journeyCity, date, time, location, activity);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch schedule queries
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItems'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItemsWithCoordinates'] });
    },
  });
}

export function useUpdateScheduleItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    journeyCity: string;
    date: bigint;
    time: string;
    location: string;
    activity: string;
  }>({
    mutationFn: async ({ journeyCity, date, time, location, activity }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      // Since location is now mandatory, we can pass it directly as a string
      return actor.updateScheduleItem(journeyCity, date, time, location, activity);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch schedule queries
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItems'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItemsWithCoordinates'] });
    },
  });
}

export function useDeleteScheduleItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    journeyCity: string;
    date: bigint;
    time: string;
  }>({
    mutationFn: async ({ journeyCity, date, time }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.deleteScheduleItem(journeyCity, date, time);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch schedule queries
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItems'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItemsWithCoordinates'] });
    },
  });
}

export function useReorderScheduleItems() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    journeyCity: string;
    newOrder: ScheduleItem[];
  }>({
    mutationFn: async ({ journeyCity, newOrder }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.reorderScheduleItems(journeyCity, newOrder);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch schedule queries
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItems'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItemsWithCoordinates'] });
    },
  });
}

// City Rating Management Hooks
export function useGetAllCityRatings() {
  const { actor, isFetching } = useActor();

  return useQuery<CityRating[]>({
    queryKey: ['allCityRatings'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCityRatings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCityRating(city: string) {
  const { actor, isFetching } = useActor();

  return useQuery<CityRating | null>({
    queryKey: ['cityRating', city],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCityRating(city);
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

export function useGetCityRatingForPopup(city: string) {
  const { actor, isFetching } = useActor();

  return useQuery<number | null>({
    queryKey: ['cityRatingForPopup', city],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCityRatingForPopup(city);
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

export function useGetAverageCityRating(city: string) {
  const { actor, isFetching } = useActor();

  return useQuery<number>({
    queryKey: ['averageCityRating', city],
    queryFn: async () => {
      if (!actor) return 0;
      return actor.getAverageCityRating(city);
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

export function useGetCityComments(city: string) {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['cityComments', city],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCityComments(city);
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

export function useAddCityRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, {
    city: string;
    rating: number;
    comment: string;
  }>({
    mutationFn: async ({ city, rating, comment }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      await actor.addCityRating(city, rating, comment);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch city rating queries
      queryClient.invalidateQueries({ queryKey: ['allCityRatings'] });
      queryClient.invalidateQueries({ queryKey: ['cityRating', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['cityRatingForPopup', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['averageCityRating', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['cityComments', variables.city] });
    },
  });
}

export function useUpdateCityRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    rating: number;
    comment: string;
  }>({
    mutationFn: async ({ city, rating, comment }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.updateCityRating(city, rating, comment);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch city rating queries
      queryClient.invalidateQueries({ queryKey: ['allCityRatings'] });
      queryClient.invalidateQueries({ queryKey: ['cityRating', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['cityRatingForPopup', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['averageCityRating', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['cityComments', variables.city] });
    },
  });
}

export function useDeleteCityRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: async (city: string) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.deleteCityRating(city);
    },
    onSuccess: (_, city) => {
      // Invalidate and refetch city rating queries
      queryClient.invalidateQueries({ queryKey: ['allCityRatings'] });
      queryClient.invalidateQueries({ queryKey: ['cityRating', city] });
      queryClient.invalidateQueries({ queryKey: ['cityRatingForPopup', city] });
      queryClient.invalidateQueries({ queryKey: ['averageCityRating', city] });
      queryClient.invalidateQueries({ queryKey: ['cityComments', city] });
    },
  });
}

// City Album Management Hooks
export function useGetAllCityAlbums() {
  const { actor, isFetching } = useActor();

  return useQuery<CityAlbum[]>({
    queryKey: ['allCityAlbums'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCityAlbums();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCityAlbum(city: string) {
  const { actor, isFetching } = useActor();

  return useQuery<CityAlbum | null>({
    queryKey: ['cityAlbum', city],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCityAlbum(city);
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

export function useGetCityAlbumForPopup(city: string) {
  const { actor, isFetching } = useActor();

  return useQuery<CityAlbum | null>({
    queryKey: ['cityAlbumForPopup', city],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCityAlbumForPopup(city);
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

export function useAddCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, {
    city: string;
    mediaFiles: MediaFile[];
    socialMediaLinks: SocialMediaLink[];
  }>({
    mutationFn: async ({ city, mediaFiles, socialMediaLinks }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      await actor.addCityAlbum(city, mediaFiles, socialMediaLinks);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch city album queries
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbumForPopup', variables.city] });
    },
  });
}

export function useUpdateCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    mediaFiles: MediaFile[];
    socialMediaLinks: SocialMediaLink[];
  }>({
    mutationFn: async ({ city, mediaFiles, socialMediaLinks }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.updateCityAlbum(city, mediaFiles, socialMediaLinks);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch city album queries
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbumForPopup', variables.city] });
    },
  });
}

export function useDeleteCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: async (city: string) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.deleteCityAlbum(city);
    },
    onSuccess: (_, city) => {
      // Invalidate and refetch city album queries
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', city] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbumForPopup', city] });
    },
  });
}

export function useAddMediaToCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    mediaFile: MediaFile;
  }>({
    mutationFn: async ({ city, mediaFile }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.addMediaToCityAlbum(city, mediaFile);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch city album queries
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbumForPopup', variables.city] });
    },
  });
}

export function useRemoveMediaFromCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    mediaPath: string;
  }>({
    mutationFn: async ({ city, mediaPath }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.removeMediaFromCityAlbum(city, mediaPath);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch city album queries
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbumForPopup', variables.city] });
    },
  });
}

// Social Media Link Management Hooks
export function useAddSocialMediaLinkToCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    url: string;
  }>({
    mutationFn: async ({ city, url }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      
      // Validate the URL
      const validation = validateSocialMediaUrl(url);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid social media URL');
      }
      
      // Create social media link object
      const socialMediaLink: SocialMediaLink = {
        url,
        platform: validation.platform,
        addedAt: BigInt(Date.now() * 1000000) // Convert to nanoseconds
      };
      
      return actor.addSocialMediaLinkToCityAlbum(city, socialMediaLink);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch city album queries
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbumForPopup', variables.city] });
    },
  });
}

export function useRemoveSocialMediaLinkFromCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    url: string;
  }>({
    mutationFn: async ({ city, url }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.removeSocialMediaLinkFromCityAlbum(city, url);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch city album queries
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbumForPopup', variables.city] });
    },
  });
}

// Travel Spot Management Hooks
export function useGetTravelSpots(city: string) {
  const { actor, isFetching } = useActor();

  return useQuery<TravelSpot[]>({
    queryKey: ['travelSpots', city],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTravelSpots(city);
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

export function useGetAllTravelSpots() {
  const { actor, isFetching } = useActor();

  return useQuery<TravelSpot[]>({
    queryKey: ['allTravelSpots'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTravelSpots();
    },
    enabled: !!actor && !isFetching,
  });
}

// New hook to get all travel spots for map display
export function useGetAllTravelSpotsForMap() {
  const { actor, isFetching } = useActor();

  return useQuery<TravelSpot[]>({
    queryKey: ['allTravelSpotsForMap'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTravelSpotsForMap();
    },
    enabled: !!actor && !isFetching,
  });
}

// New hooks for Vibes panel hierarchical navigation
export function useGetTravelSpotSummaryByCity() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[string, bigint]>>({
    queryKey: ['travelSpotSummaryByCity'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTravelSpotSummaryByCity();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTravelSpotTypeBreakdown(city: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[string, bigint]>>({
    queryKey: ['travelSpotTypeBreakdown', city],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTravelSpotTypeBreakdown(city);
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

export function useGetTravelSpotsByCityAndType(city: string, spotType: string) {
  const { actor, isFetching } = useActor();

  return useQuery<TravelSpot[]>({
    queryKey: ['travelSpotsByCityAndType', city, spotType],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTravelSpotsByCityAndType(city, spotType);
    },
    enabled: !!actor && !isFetching && !!city && !!spotType,
  });
}

// New hook for getting all bookmarks and travel spots grouped by city
export function useGetAllBookmarksAndTravelSpotsByCity() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[string, VibeItem[]]>>({
    queryKey: ['allBookmarksAndTravelSpotsByCity'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllBookmarksAndTravelSpotsByCity();
    },
    enabled: !!actor && !isFetching,
  });
}

// Map Bookmark Management Hooks
export function useGetMapBookmarks() {
  const { actor, isFetching } = useActor();

  return useQuery<MapBookmark[]>({
    queryKey: ['mapBookmarks'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMapBookmarks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMapBookmarksByCity(city: string) {
  const { actor, isFetching } = useActor();

  return useQuery<MapBookmark[]>({
    queryKey: ['mapBookmarksByCity', city],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMapBookmarksByCity(city);
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

export function useAddMapBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, {
    coordinates: [number, number];
    name: string;
    description: string;
    city: string;
  }>({
    mutationFn: async ({ coordinates, name, description, city }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      await actor.addMapBookmark(coordinates, name, description, city);
    },
    onSuccess: () => {
      // Invalidate and refetch bookmark queries
      queryClient.invalidateQueries({ queryKey: ['mapBookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['mapBookmarksByCity'] });
      queryClient.invalidateQueries({ queryKey: ['allBookmarksAndTravelSpotsByCity'] });
    },
  });
}

export function useUpdateMapBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    coordinates: [number, number];
    name: string;
    description: string;
    city: string;
  }>({
    mutationFn: async ({ coordinates, name, description, city }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.updateMapBookmark(coordinates, name, description, city);
    },
    onSuccess: () => {
      // Invalidate and refetch bookmark queries
      queryClient.invalidateQueries({ queryKey: ['mapBookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['mapBookmarksByCity'] });
      queryClient.invalidateQueries({ queryKey: ['allBookmarksAndTravelSpotsByCity'] });
    },
  });
}

export function useDeleteMapBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: async (name: string) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.deleteMapBookmark(name);
    },
    onSuccess: () => {
      // Invalidate and refetch bookmark queries
      queryClient.invalidateQueries({ queryKey: ['mapBookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['mapBookmarksByCity'] });
      queryClient.invalidateQueries({ queryKey: ['allBookmarksAndTravelSpotsByCity'] });
    },
  });
}

export function useAddTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, {
    city: string;
    name: string;
    description?: string;
    spotType: string;
    rating: number;
  }>({
    mutationFn: async ({ city, name, description, spotType, rating }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      
      // Geocode the travel spot to get real coordinates
      const coordinates = await geocodeTravelSpot(name, city);
      
      if (!coordinates) {
        throw new Error(`Could not find coordinates for "${name}" in ${city}. Please check the spelling or try a more specific location name.`);
      }
      
      await actor.addTravelSpot(city, name, description || null, coordinates, spotType, rating);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch travel spot queries
      queryClient.invalidateQueries({ queryKey: ['travelSpots', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotSummaryByCity'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotTypeBreakdown', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotsByCityAndType', variables.city, variables.spotType] });
      queryClient.invalidateQueries({ queryKey: ['allBookmarksAndTravelSpotsByCity'] });
    },
  });
}

export function useUpdateTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    name: string;
    description?: string;
    coordinates?: [number, number];
    spotType: string;
    rating: number;
  }>({
    mutationFn: async ({ city, name, description, coordinates, spotType, rating }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      
      // Use provided coordinates or keep existing ones (get from backend)
      let finalCoordinates = coordinates;
      if (!finalCoordinates) {
        const existingSpots = await actor.getTravelSpots(city);
        const existingSpot = existingSpots.find(spot => spot.name === name);
        if (existingSpot) {
          finalCoordinates = existingSpot.coordinates;
        } else {
          throw new Error('Travel spot not found');
        }
      }
      
      return actor.updateTravelSpot(city, name, description || null, finalCoordinates, spotType, rating);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch travel spot queries
      queryClient.invalidateQueries({ queryKey: ['travelSpots', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotMediaFiles', variables.city, variables.name] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotSocialMediaLinks', variables.city, variables.name] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotSummaryByCity'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotTypeBreakdown', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotsByCityAndType', variables.city, variables.spotType] });
      queryClient.invalidateQueries({ queryKey: ['allBookmarksAndTravelSpotsByCity'] });
    },
  });
}

export function useDeleteTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    name: string;
  }>({
    mutationFn: async ({ city, name }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.deleteTravelSpot(city, name);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch travel spot queries
      queryClient.invalidateQueries({ queryKey: ['travelSpots', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotMediaFiles', variables.city, variables.name] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotSocialMediaLinks', variables.city, variables.name] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotSummaryByCity'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotTypeBreakdown', variables.city] });
      // Invalidate all city and type combinations since we don't know the spot type
      queryClient.invalidateQueries({ queryKey: ['travelSpotsByCityAndType'] });
      queryClient.invalidateQueries({ queryKey: ['allBookmarksAndTravelSpotsByCity'] });
    },
  });
}

// Travel Spot Media Management Hooks
export function useGetTravelSpotMediaFiles(city: string, spotName: string) {
  const { actor, isFetching } = useActor();

  return useQuery<MediaFile[]>({
    queryKey: ['travelSpotMediaFiles', city, spotName],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTravelSpotMediaFiles(city, spotName);
    },
    enabled: !!actor && !isFetching && !!city && !!spotName,
  });
}

export function useAddMediaToTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    spotName: string;
    mediaFile: MediaFile;
  }>({
    mutationFn: async ({ city, spotName, mediaFile }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.addMediaToTravelSpot(city, spotName, mediaFile);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch travel spot media queries
      queryClient.invalidateQueries({ queryKey: ['travelSpotMediaFiles', variables.city, variables.spotName] });
      queryClient.invalidateQueries({ queryKey: ['travelSpots', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
    },
  });
}

export function useRemoveMediaFromTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    spotName: string;
    mediaPath: string;
  }>({
    mutationFn: async ({ city, spotName, mediaPath }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.removeMediaFromTravelSpot(city, spotName, mediaPath);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch travel spot media queries
      queryClient.invalidateQueries({ queryKey: ['travelSpotMediaFiles', variables.city, variables.spotName] });
      queryClient.invalidateQueries({ queryKey: ['travelSpots', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
    },
  });
}

// Travel Spot Social Media Link Management Hooks
export function useGetTravelSpotSocialMediaLinks(city: string, spotName: string) {
  const { actor, isFetching } = useActor();

  return useQuery<SocialMediaLink[]>({
    queryKey: ['travelSpotSocialMediaLinks', city, spotName],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTravelSpotSocialMediaLinks(city, spotName);
    },
    enabled: !!actor && !isFetching && !!city && !!spotName,
  });
}

export function useAddSocialMediaLinkToTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    spotName: string;
    url: string;
  }>({
    mutationFn: async ({ city, spotName, url }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      
      // Validate the URL
      const validation = validateSocialMediaUrl(url);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid social media URL');
      }
      
      // Create social media link object
      const socialMediaLink: SocialMediaLink = {
        url,
        platform: validation.platform,
        addedAt: BigInt(Date.now() * 1000000) // Convert to nanoseconds
      };
      
      return actor.addSocialMediaLinkToTravelSpot(city, spotName, socialMediaLink);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch travel spot social media queries
      queryClient.invalidateQueries({ queryKey: ['travelSpotSocialMediaLinks', variables.city, variables.spotName] });
      queryClient.invalidateQueries({ queryKey: ['travelSpots', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
    },
  });
}

export function useRemoveSocialMediaLinkFromTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    city: string;
    spotName: string;
    url: string;
  }>({
    mutationFn: async ({ city, spotName, url }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.removeSocialMediaLinkFromTravelSpot(city, spotName, url);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch travel spot social media queries
      queryClient.invalidateQueries({ queryKey: ['travelSpotSocialMediaLinks', variables.city, variables.spotName] });
      queryClient.invalidateQueries({ queryKey: ['travelSpots', variables.city] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
    },
  });
}

// Music Album Management Hooks
export function useGetAllMusicAlbums() {
  const { actor, isFetching } = useActor();

  return useQuery<MusicAlbum[]>({
    queryKey: ['allMusicAlbums'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMusicAlbums();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMusicAlbum(title: string) {
  const { actor, isFetching } = useActor();

  return useQuery<MusicAlbum | null>({
    queryKey: ['musicAlbum', title],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMusicAlbum(title);
    },
    enabled: !!actor && !isFetching && !!title,
  });
}

export function useAddMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, {
    title: string;
    description: string;
    songs: Song[];
  }>({
    mutationFn: async ({ title, description, songs }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      await actor.addMusicAlbum(title, description, songs);
    },
    onSuccess: () => {
      // Invalidate and refetch music album queries
      queryClient.invalidateQueries({ queryKey: ['allMusicAlbums'] });
    },
  });
}

export function useUpdateMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    title: string;
    description: string;
    songs: Song[];
  }>({
    mutationFn: async ({ title, description, songs }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.updateMusicAlbum(title, description, songs);
    },
    onSuccess: () => {
      // Invalidate and refetch music album queries
      queryClient.invalidateQueries({ queryKey: ['allMusicAlbums'] });
    },
  });
}

export function useDeleteMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: async (title: string) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.deleteMusicAlbum(title);
    },
    onSuccess: () => {
      // Invalidate and refetch music album queries
      queryClient.invalidateQueries({ queryKey: ['allMusicAlbums'] });
    },
  });
}

export function useAddSongToMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    title: string;
    song: Song;
  }>({
    mutationFn: async ({ title, song }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.addSongToMusicAlbum(title, song);
    },
    onSuccess: () => {
      // Invalidate and refetch music album queries
      queryClient.invalidateQueries({ queryKey: ['allMusicAlbums'] });
    },
  });
}

export function useRemoveSongFromMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, {
    title: string;
    songTitle: string;
  }>({
    mutationFn: async ({ title, songTitle }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.removeSongFromMusicAlbum(title, songTitle);
    },
    onSuccess: () => {
      // Invalidate and refetch music album queries
      queryClient.invalidateQueries({ queryKey: ['allMusicAlbums'] });
    },
  });
}

export function useGetMusicAlbumSongs(title: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Song[]>({
    queryKey: ['musicAlbumSongs', title],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMusicAlbumSongs(title);
    },
    enabled: !!actor && !isFetching && !!title,
  });
}

// Website Layout Preferences Hooks (now using backend)
export function useGetWebsiteLayoutPreferences() {
  const { actor, isFetching } = useActor();

  return useQuery<WebsiteLayoutPreferences>({
    queryKey: ['websiteLayoutPreferences'],
    queryFn: async () => {
      if (!actor) {
        // Return default preferences if no backend
        return { 
          showMusicPlayer: true, 
          defaultSearchPlace: 'Hong Kong', 
          showAllTravelSpots: true,
          rippleSize: 0.5,
          cityFontSize: 8.0
        };
      }
      
      try {
        const settings = await actor.getWebsiteLayoutSettings();
        if (settings) {
          return {
            showMusicPlayer: settings.showMusicPlayerBar,
            defaultSearchPlace: settings.defaultSearchPlace,
            showAllTravelSpots: settings.showAllTravelSpots,
            rippleSize: settings.rippleSize,
            cityFontSize: settings.cityFontSize
          };
        }
        
        // Return default preferences if no settings found
        return { 
          showMusicPlayer: true, 
          defaultSearchPlace: 'Hong Kong', 
          showAllTravelSpots: true,
          rippleSize: 0.5,
          cityFontSize: 8.0
        };
      } catch (error) {
        console.error('Error loading layout preferences:', error);
        return { 
          showMusicPlayer: true, 
          defaultSearchPlace: 'Hong Kong', 
          showAllTravelSpots: true,
          rippleSize: 0.5,
          cityFontSize: 8.0
        };
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveWebsiteLayoutPreferences() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, Partial<WebsiteLayoutPreferences>>({
    mutationFn: async (preferences) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      
      try {
        // Get current preferences
        const current = queryClient.getQueryData<WebsiteLayoutPreferences>(['websiteLayoutPreferences']) || { 
          showMusicPlayer: true, 
          defaultSearchPlace: 'Hong Kong',
          showAllTravelSpots: true,
          rippleSize: 0.5,
          cityFontSize: 8.0
        };
        
        // Merge with new preferences
        const updated = { ...current, ...preferences };
        
        // Check if settings exist
        const existingSettings = await actor.getWebsiteLayoutSettings();
        
        if (existingSettings) {
          // Update existing settings - pass 5 parameters (no theme)
          await actor.updateWebsiteLayoutSettings(
            updated.showMusicPlayer, 
            updated.defaultSearchPlace, 
            updated.showAllTravelSpots,
            updated.rippleSize || 0.5,
            updated.cityFontSize || 8.0
          );
        } else {
          // Add new settings - pass 5 parameters (no theme)
          await actor.addWebsiteLayoutSettings(
            updated.showMusicPlayer, 
            updated.defaultSearchPlace, 
            updated.showAllTravelSpots,
            updated.rippleSize || 0.5,
            updated.cityFontSize || 8.0
          );
        }
      } catch (error) {
        console.error('Error saving layout preferences:', error);
        throw new Error('Failed to save layout preferences');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch preferences
      queryClient.invalidateQueries({ queryKey: ['websiteLayoutPreferences'] });
    },
  });
}

// New hook for getting display settings
export function useGetDisplaySettings() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean | null>({
    queryKey: ['displaySettings'],
    queryFn: async () => {
      if (!actor) return true; // Default to showing all travel spots
      return actor.getDisplaySettings();
    },
    enabled: !!actor && !isFetching,
  });
}

// Geoname City Management Hooks
export function useImportCities() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, GeonameCity[]>({
    mutationFn: async (cities: GeonameCity[]) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      await actor.importCities(cities);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citiesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['searchCities'] });
      queryClient.invalidateQueries({ queryKey: ['allCities'] });
    },
  });
}

// New hook for browsing all cities with pagination
export function useGetCitiesPaginated(page: number, pageSize: number) {
  const { actor, isFetching } = useActor();

  return useQuery<GeonameCity[]>({
    queryKey: ['citiesPaginated', page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCitiesPaginated(BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSearchCities(searchTerm: string, page: number, pageSize: number) {
  const { actor, isFetching } = useActor();

  return useQuery<GeonameCity[]>({
    queryKey: ['searchCities', searchTerm, page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.searchCities(searchTerm, BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !isFetching && !!searchTerm.trim(),
  });
}

export function useAddCity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, GeonameCity>({
    mutationFn: async (city: GeonameCity) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      await actor.addCity(city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citiesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['searchCities'] });
      queryClient.invalidateQueries({ queryKey: ['allCities'] });
    },
  });
}

export function useUpdateCity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, { name: string; city: GeonameCity }>({
    mutationFn: async ({ name, city }) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.updateCity(name, city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citiesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['searchCities'] });
      queryClient.invalidateQueries({ queryKey: ['allCities'] });
    },
  });
}

export function useDeleteCity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: async (name: string) => {
      if (!actor) {
        throw new Error('Backend actor not available');
      }
      return actor.deleteCity(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citiesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['searchCities'] });
      queryClient.invalidateQueries({ queryKey: ['allCities'] });
    },
  });
}

// Export the list of supported countries for UI feedback
export const SUPPORTED_COUNTRIES = [
  'United States',
  'Canada', 
  'Brazil',
  'United Kingdom',
  'France',
  'Germany',
  'India',
  'China',
  'Australia',
  'Japan'
];

// Export function to get alternative names for a country
export function getCountryAlternatives(countryName: string): string[] {
  const alternatives: string[] = [];
  const normalizedInput = countryName.toLowerCase().trim();
  
  for (const [alt, canonical] of Object.entries(COUNTRY_NAME_MAP)) {
    if (canonical.toLowerCase() === normalizedInput) {
      alternatives.push(alt);
    }
  }
  
  return alternatives.filter(alt => alt !== normalizedInput);
}

// Export validation function for use in components
export { validateSocialMediaUrl };
