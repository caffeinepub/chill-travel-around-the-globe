import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  LocationInfo,
  Journey,
  CityRating,
  CityAlbum,
  MediaFile,
  TravelSpot,
  SocialMediaLink,
  MusicAlbum,
  Song,
  WebsiteLayoutSettings,
  ScheduleItem,
  VibeItem,
  MapBookmark,
  GeonameCity,
  UserProfile,
} from '@/backend';

// ─── Country name mapping ─────────────────────────────────────────────────────

const COUNTRY_NAME_MAP: Record<string, string> = {
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
  "people's republic of china": 'China',
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

export const SUPPORTED_COUNTRIES: string[] = Array.from(
  new Set(Object.values(COUNTRY_NAME_MAP))
).sort();

interface LocationResult {
  coordinates: [number, number];
  name: string;
  searchQuery: string;
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

// ─── Social media URL validation ──────────────────────────────────────────────

export function validateSocialMediaUrl(url: string): { isValid: boolean; platform: string; error?: string } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const youtubePatterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
        /youtu\.be\/([a-zA-Z0-9_-]+)/,
      ];
      if (!youtubePatterns.some(p => p.test(url))) {
        return { isValid: false, platform: 'youtube', error: 'Invalid YouTube video URL format' };
      }
      return { isValid: true, platform: 'youtube' };
    }

    if (hostname.includes('instagram.com')) {
      const instagramPatterns = [
        /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
        /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
        /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/,
      ];
      if (!instagramPatterns.some(p => p.test(url))) {
        return { isValid: false, platform: 'instagram', error: 'Invalid Instagram video URL format. Please use post, reel, or IGTV URLs.' };
      }
      return { isValid: true, platform: 'instagram' };
    }

    return { isValid: false, platform: 'unknown', error: 'Only YouTube and Instagram video URLs are supported' };
  } catch {
    return { isValid: false, platform: 'unknown', error: 'Invalid URL format' };
  }
}

// ─── Geocoding ────────────────────────────────────────────────────────────────

async function geocodeLocation(query: string): Promise<LocationResult | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&addressdetails=1&extratags=1`,
      { headers: { 'User-Agent': 'LocationMapExplorer/1.0' } }
    );
    if (!response.ok) throw new Error('Geocoding request failed');

    const data = await response.json();
    if (!data || data.length === 0) return null;

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (isNaN(lat) || isNaN(lng)) return null;

    let locationType: 'country' | 'city' | 'town' | 'village' = 'city';
    if (result.type === 'country' || result.class === 'boundary') {
      locationType = 'country';
    } else if (result.type === 'village' || result.type === 'hamlet') {
      locationType = 'village';
    } else if (result.type === 'town') {
      locationType = 'town';
    }

    const address = result.address || {};
    const name = address.city || address.town || address.village || address.country || result.name || query;

    return {
      coordinates: [lat, lng],
      name,
      searchQuery: query,
      type: locationType,
      country: address.country,
      state: address.state || address.region,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function validateLocationSearchable(location: string): Promise<boolean> {
  if (!location || location.trim() === '') return false;
  try {
    if (normalizeCountryName(location)) return true;
    const result = await geocodeLocation(location.trim());
    return result !== null;
  } catch {
    return false;
  }
}

// ─── Search hooks ─────────────────────────────────────────────────────────────

export function useGetCountryCoordinates() {
  const { actor } = useActor();

  return useMutation<[number, number] | null, Error, string>({
    mutationFn: async (countryName: string) => {
      if (!actor) throw new Error('Backend actor not available');
      const normalizedName = normalizeCountryName(countryName);
      if (!normalizedName) return null;
      await actor.initializeCoordinates();
      return actor.getCountryCoordinates(normalizedName);
    },
  });
}

export function useSearchLocation() {
  const { actor } = useActor();

  return useMutation<LocationResult | null, Error, string>({
    mutationFn: async (locationName: string) => {
      const normalizedCountryName = normalizeCountryName(locationName);
      if (normalizedCountryName && actor) {
        try {
          await actor.initializeCoordinates();
          const countryCoords = await actor.getCountryCoordinates(normalizedCountryName);
          if (countryCoords) {
            return { coordinates: countryCoords, name: normalizedCountryName, searchQuery: locationName, type: 'country' };
          }
        } catch {
          // fall through to geocoding
        }
      }
      return geocodeLocation(locationName);
    },
  });
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Location Info ────────────────────────────────────────────────────────────

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
  return useMutation<void, Error, { name: string; coordinates: [number, number]; photoPath: string | null }>({
    mutationFn: async ({ name, coordinates, photoPath }) => {
      if (!actor) throw new Error('Backend actor not available');
      await actor.addLocationInfo(name, coordinates, photoPath);
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['locationInfo', v.name] });
      queryClient.invalidateQueries({ queryKey: ['allLocationInfo'] });
    },
  });
}

export function useUpdateLocationInfo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { name: string; photoPath: string | null }>({
    mutationFn: async ({ name, photoPath }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.updateLocationInfo(name, photoPath);
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['locationInfo', v.name] });
      queryClient.invalidateQueries({ queryKey: ['allLocationInfo'] });
    },
  });
}

export function useDeleteLocationInfo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (name) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.deleteLocationInfo(name);
    },
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['locationInfo', name] });
      queryClient.invalidateQueries({ queryKey: ['allLocationInfo'] });
    },
  });
}

// ─── Journeys ─────────────────────────────────────────────────────────────────

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
  return useMutation<void, Error, { title: string; city: string; startDate: bigint; endDate: bigint }>({
    mutationFn: async ({ title, city, startDate, endDate }) => {
      if (!actor) throw new Error('Backend actor not available');
      await actor.addJourney(title, city, startDate, endDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['previousJourneys'] });
    },
  });
}

export function useUpdateJourney() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; startDate: bigint; endDate: bigint }>({
    mutationFn: async ({ city, startDate, endDate }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.updateJourney(city, startDate, endDate);
    },
    onSuccess: () => {
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
    mutationFn: async (city) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.deleteJourney(city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['previousJourneys'] });
    },
  });
}

// ─── Schedule Items ───────────────────────────────────────────────────────────
// NOTE: journeyId is the journey's unique title, used as the storage key.
// This ensures each journey has its own independent schedule, even when
// multiple journeys share the same city.

export function useGetScheduleItems(journeyId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ScheduleItem[]>({
    queryKey: ['scheduleItems', journeyId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getScheduleItems(journeyId);
    },
    enabled: !!actor && !isFetching && !!journeyId,
  });
}

export function useGetJourneyScheduleWithDays(journeyId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, ScheduleItem[]]>>({
    queryKey: ['journeyScheduleWithDays', journeyId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getJourneyScheduleWithDays(journeyId);
    },
    enabled: !!actor && !isFetching && !!journeyId,
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
  return useMutation<void, Error, { journeyId: string; date: bigint; time: string; location: string; activity: string }>({
    mutationFn: async ({ journeyId, date, time, location, activity }) => {
      if (!actor) throw new Error('Backend actor not available');
      await actor.addScheduleItem(journeyId, date, time, location, activity);
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', v.journeyId] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', v.journeyId] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItems'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItemsWithCoordinates'] });
    },
  });
}

export function useUpdateScheduleItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { journeyId: string; date: bigint; time: string; location: string; activity: string }>({
    mutationFn: async ({ journeyId, date, time, location, activity }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.updateScheduleItem(journeyId, date, time, location, activity);
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', v.journeyId] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', v.journeyId] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItems'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItemsWithCoordinates'] });
    },
  });
}

export function useDeleteScheduleItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { journeyId: string; date: bigint; time: string }>({
    mutationFn: async ({ journeyId, date, time }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.deleteScheduleItem(journeyId, date, time);
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', v.journeyId] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', v.journeyId] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItems'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItemsWithCoordinates'] });
    },
  });
}

export function useReorderScheduleItems() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { journeyId: string; newOrder: ScheduleItem[] }>({
    mutationFn: async ({ journeyId, newOrder }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.reorderScheduleItems(journeyId, newOrder);
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', v.journeyId] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', v.journeyId] });
    },
  });
}

// ─── City Ratings ─────────────────────────────────────────────────────────────

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

export function useAddCityRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, { city: string; rating: number; comment: string }>({
    mutationFn: async ({ city, rating, comment }) => {
      if (!actor) throw new Error('Backend actor not available');
      await actor.addCityRating(city, rating, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCityRatings'] });
    },
  });
}

export function useUpdateCityRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; rating: number; comment: string }>({
    mutationFn: async ({ city, rating, comment }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.updateCityRating(city, rating, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCityRatings'] });
    },
  });
}

export function useDeleteCityRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (city) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.deleteCityRating(city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCityRatings'] });
    },
  });
}

// ─── City Albums ──────────────────────────────────────────────────────────────

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

export function useAddCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, { city: string; mediaFiles: MediaFile[]; socialMediaLinks: SocialMediaLink[] }>({
    mutationFn: async ({ city, mediaFiles, socialMediaLinks }) => {
      if (!actor) throw new Error('Backend actor not available');
      await actor.addCityAlbum(city, mediaFiles, socialMediaLinks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
    },
  });
}

export function useUpdateCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; mediaFiles: MediaFile[]; socialMediaLinks: SocialMediaLink[] }>({
    mutationFn: async ({ city, mediaFiles, socialMediaLinks }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.updateCityAlbum(city, mediaFiles, socialMediaLinks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
    },
  });
}

export function useDeleteCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (city) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.deleteCityAlbum(city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
    },
  });
}

export function useAddMediaToCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; mediaFile: MediaFile }>({
    mutationFn: async ({ city, mediaFile }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.addMediaToCityAlbum(city, mediaFile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
    },
  });
}

export function useRemoveMediaFromCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; mediaPath: string }>({
    mutationFn: async ({ city, mediaPath }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.removeMediaFromCityAlbum(city, mediaPath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
    },
  });
}

export function useAddSocialMediaLinkToCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; url: string }>({
    mutationFn: async ({ city, url }) => {
      if (!actor) throw new Error('Backend actor not available');
      const validation = validateSocialMediaUrl(url);
      const socialMediaLink: SocialMediaLink = {
        url,
        platform: validation.platform,
        addedAt: BigInt(Date.now() * 1000000),
      };
      return actor.addSocialMediaLinkToCityAlbum(city, socialMediaLink);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
    },
  });
}

export function useRemoveSocialMediaLinkFromCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; url: string }>({
    mutationFn: async ({ city, url }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.removeSocialMediaLinkFromCityAlbum(city, url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCityAlbums'] });
    },
  });
}

// ─── Travel Spots ─────────────────────────────────────────────────────────────

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

export function useAddTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, { city: string; name: string; description: string | null; coordinates: [number, number]; spotType: string; rating: number }>({
    mutationFn: async ({ city, name, description, coordinates, spotType, rating }) => {
      if (!actor) throw new Error('Backend actor not available');
      await actor.addTravelSpot(city, name, description, coordinates, spotType, rating);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
    },
  });
}

export function useUpdateTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; name: string; description: string | null; coordinates: [number, number]; spotType: string; rating: number }>({
    mutationFn: async ({ city, name, description, coordinates, spotType, rating }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.updateTravelSpot(city, name, description, coordinates, spotType, rating);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
    },
  });
}

export function useDeleteTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; name: string }>({
    mutationFn: async ({ city, name }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.deleteTravelSpot(city, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
    },
  });
}

export function useAddMediaToTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; spotName: string; mediaFile: MediaFile }>({
    mutationFn: async ({ city, spotName, mediaFile }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.addMediaToTravelSpot(city, spotName, mediaFile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
    },
  });
}

export function useRemoveMediaFromTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; spotName: string; mediaPath: string }>({
    mutationFn: async ({ city, spotName, mediaPath }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.removeMediaFromTravelSpot(city, spotName, mediaPath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
    },
  });
}

export function useAddSocialMediaLinkToTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; spotName: string; url: string }>({
    mutationFn: async ({ city, spotName, url }) => {
      if (!actor) throw new Error('Backend actor not available');
      const validation = validateSocialMediaUrl(url);
      const socialMediaLink: SocialMediaLink = {
        url,
        platform: validation.platform,
        addedAt: BigInt(Date.now() * 1000000),
      };
      return actor.addSocialMediaLinkToTravelSpot(city, spotName, socialMediaLink);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
    },
  });
}

export function useRemoveSocialMediaLinkFromTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { city: string; spotName: string; url: string }>({
    mutationFn: async ({ city, spotName, url }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.removeSocialMediaLinkFromTravelSpot(city, spotName, url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
    },
  });
}

// ─── Music Albums ─────────────────────────────────────────────────────────────

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

export function useAddMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, { title: string; description: string; songs: Song[] }>({
    mutationFn: async ({ title, description, songs }) => {
      if (!actor) throw new Error('Backend actor not available');
      await actor.addMusicAlbum(title, description, songs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMusicAlbums'] });
    },
  });
}

export function useUpdateMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { title: string; description: string; songs: Song[] }>({
    mutationFn: async ({ title, description, songs }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.updateMusicAlbum(title, description, songs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMusicAlbums'] });
    },
  });
}

export function useDeleteMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (title) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.deleteMusicAlbum(title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMusicAlbums'] });
    },
  });
}

export function useAddSongToMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { title: string; song: Song }>({
    mutationFn: async ({ title, song }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.addSongToMusicAlbum(title, song);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMusicAlbums'] });
    },
  });
}

export function useRemoveSongFromMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { title: string; songTitle: string }>({
    mutationFn: async ({ title, songTitle }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.removeSongFromMusicAlbum(title, songTitle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMusicAlbums'] });
    },
  });
}

// ─── Website Layout ───────────────────────────────────────────────────────────

export function useGetWebsiteLayoutSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<WebsiteLayoutSettings | null>({
    queryKey: ['websiteLayoutSettings'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getWebsiteLayoutSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias used by many components
export function useGetWebsiteLayoutPreferences() {
  const { actor, isFetching } = useActor();
  return useQuery<WebsiteLayoutPreferences | null>({
    queryKey: ['websiteLayoutSettings'],
    queryFn: async () => {
      if (!actor) return null;
      const settings = await actor.getWebsiteLayoutSettings();
      if (!settings) return null;
      return {
        showMusicPlayer: settings.showMusicPlayerBar,
        defaultSearchPlace: settings.defaultSearchPlace,
        showAllTravelSpots: settings.showAllTravelSpots,
        rippleSize: settings.rippleSize,
        cityFontSize: settings.cityFontSize,
      };
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveWebsiteLayoutPreferences() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void | boolean, Error, {
    showMusicPlayerBar: boolean;
    defaultSearchPlace: string;
    showAllTravelSpots: boolean;
    rippleSize: number;
    cityFontSize: number;
  }>({
    mutationFn: async ({ showMusicPlayerBar, defaultSearchPlace, showAllTravelSpots, rippleSize, cityFontSize }) => {
      if (!actor) throw new Error('Backend actor not available');
      const existing = await actor.getWebsiteLayoutSettings();
      if (existing) {
        return actor.updateWebsiteLayoutSettings(showMusicPlayerBar, defaultSearchPlace, showAllTravelSpots, rippleSize, cityFontSize);
      } else {
        return actor.addWebsiteLayoutSettings(showMusicPlayerBar, defaultSearchPlace, showAllTravelSpots, rippleSize, cityFontSize);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteLayoutSettings'] });
    },
  });
}

// ─── Map Bookmarks ────────────────────────────────────────────────────────────

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

// Alias
export function useGetAllMapBookmarks() {
  return useGetMapBookmarks();
}

export function useAddMapBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, { coordinates: [number, number]; name: string; description: string; city: string }>({
    mutationFn: async ({ coordinates, name, description, city }) => {
      if (!actor) throw new Error('Backend actor not available');
      await actor.addMapBookmark(coordinates, name, description, city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapBookmarks'] });
    },
  });
}

export function useUpdateMapBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { coordinates: [number, number]; name: string; description: string; city: string }>({
    mutationFn: async ({ coordinates, name, description, city }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.updateMapBookmark(coordinates, name, description, city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapBookmarks'] });
    },
  });
}

export function useDeleteMapBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (name) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.deleteMapBookmark(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapBookmarks'] });
    },
  });
}

// ─── Vibes ────────────────────────────────────────────────────────────────────

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

export function useGetAllCitiesWithRatingsAndTravelSpots() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, number | null, TravelSpot[]]>>({
    queryKey: ['allCitiesWithRatingsAndTravelSpots'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCitiesWithRatingsAndTravelSpots();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Geoname Cities ───────────────────────────────────────────────────────────

export function useSearchCities(searchTerm: string, page: number = 0, pageSize: number = 20) {
  const { actor, isFetching } = useActor();
  return useQuery<GeonameCity[]>({
    queryKey: ['searchCities', searchTerm, page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.searchCities(searchTerm, BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !isFetching && searchTerm.trim().length > 0,
  });
}

export function useGetCitiesPaginated(page: number = 0, pageSize: number = 20) {
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

export function useImportCities() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, GeonameCity[]>({
    mutationFn: async (cities) => {
      if (!actor) throw new Error('Backend actor not available');
      await actor.importCities(cities);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citiesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['searchCities'] });
    },
  });
}

export function useAddCity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, GeonameCity>({
    mutationFn: async (city) => {
      if (!actor) throw new Error('Backend actor not available');
      await actor.addCity(city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citiesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['searchCities'] });
    },
  });
}

export function useUpdateCity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { name: string; city: GeonameCity }>({
    mutationFn: async ({ name, city }) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.updateCity(name, city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citiesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['searchCities'] });
    },
  });
}

export function useDeleteCity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: async (name) => {
      if (!actor) throw new Error('Backend actor not available');
      return actor.deleteCity(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citiesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['searchCities'] });
    },
  });
}
