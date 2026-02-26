import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  Journey,
  CityRating,
  CityAlbum,
  TravelSpot,
  MusicAlbum,
  WebsiteLayoutSettings,
  ScheduleItem,
  MapBookmark,
  GeonameCity,
  MediaFile,
  SocialMediaLink,
  Song,
  LocationInfo,
  UserProfile,
  VibeItem,
} from '../backend';

// ─── Social Media URL Validation ────────────────────────────────────────────

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
      const hasValidPattern = youtubePatterns.some(p => p.test(url));
      if (!hasValidPattern) {
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
      const hasValidPattern = instagramPatterns.some(p => p.test(url));
      if (!hasValidPattern) {
        return {
          isValid: false,
          platform: 'instagram',
          error: 'Invalid Instagram video URL format. Please use post, reel, or IGTV URLs.',
        };
      }
      return { isValid: true, platform: 'instagram' };
    }

    return { isValid: false, platform: 'unknown', error: 'Only YouTube and Instagram video URLs are supported' };
  } catch {
    return { isValid: false, platform: 'unknown', error: 'Invalid URL format' };
  }
}

// ─── Geocoding ───────────────────────────────────────────────────────────────

interface LocationResult {
  coordinates: [number, number];
  name: string;
  searchQuery: string;
  type: 'country' | 'city' | 'town' | 'village';
  country?: string;
  state?: string;
}

const COUNTRY_NAME_MAP: Record<string, string> = {
  'united states': 'United States',
  canada: 'Canada',
  brazil: 'Brazil',
  'united kingdom': 'United Kingdom',
  france: 'France',
  germany: 'Germany',
  india: 'India',
  china: 'China',
  australia: 'Australia',
  japan: 'Japan',
  usa: 'United States',
  us: 'United States',
  america: 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
  britain: 'United Kingdom',
  'great britain': 'United Kingdom',
  england: 'United Kingdom',
  deutschland: 'Germany',
  nippon: 'Japan',
  nihon: 'Japan',
  "people's republic of china": 'China',
  prc: 'China',
  'republic of india': 'India',
  bharat: 'India',
  'commonwealth of australia': 'Australia',
  aussie: 'Australia',
  oz: 'Australia',
  'french republic': 'France',
  'federal republic of germany': 'Germany',
  'federative republic of brazil': 'Brazil',
  brasil: 'Brazil',
};

export const SUPPORTED_COUNTRIES = Object.values(COUNTRY_NAME_MAP).filter(
  (v, i, a) => a.indexOf(v) === i
);

function normalizeCountryName(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  return COUNTRY_NAME_MAP[normalized] || null;
}

async function geocodeLocation(query: string): Promise<LocationResult | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&addressdetails=1&extratags=1`,
      { headers: { 'User-Agent': 'LocationMapExplorer/1.0' } }
    );
    if (!response.ok) return null;
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
    const name =
      address.city || address.town || address.village || address.country || result.name || query;

    return {
      coordinates: [lat, lng],
      name,
      searchQuery: query,
      type: locationType,
      country: address.country,
      state: address.state || address.region,
    };
  } catch {
    return null;
  }
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
            return {
              coordinates: countryCoords,
              name: normalizedCountryName,
              searchQuery: locationName,
              type: 'country',
            };
          }
        } catch {
          // fall through to geocoding
        }
      }
      return await geocodeLocation(locationName);
    },
  });
}

// ─── Website Layout Preferences (local wrapper around WebsiteLayoutSettings) ─

interface WebsiteLayoutPreferences {
  showMusicPlayer: boolean;
  defaultSearchPlace: string;
  showAllTravelSpots: boolean;
  rippleSize?: number;
  cityFontSize?: number;
}

function settingsToPreferences(s: WebsiteLayoutSettings): WebsiteLayoutPreferences {
  return {
    showMusicPlayer: s.showMusicPlayerBar,
    defaultSearchPlace: s.defaultSearchPlace,
    showAllTravelSpots: s.showAllTravelSpots,
    rippleSize: s.rippleSize,
    cityFontSize: s.cityFontSize,
  };
}

export function useGetWebsiteLayoutPreferences() {
  const { actor, isFetching } = useActor();

  return useQuery<WebsiteLayoutPreferences | null>({
    queryKey: ['websiteLayoutPreferences'],
    queryFn: async () => {
      if (!actor) return null;
      const settings = await actor.getWebsiteLayoutSettings();
      if (!settings) return null;
      return settingsToPreferences(settings);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveWebsiteLayoutPreferences() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: Partial<WebsiteLayoutPreferences>) => {
      if (!actor) throw new Error('Actor not available');

      const existing = await actor.getWebsiteLayoutSettings();
      const current: WebsiteLayoutPreferences = existing
        ? settingsToPreferences(existing)
        : { showMusicPlayer: true, defaultSearchPlace: 'Hong Kong', showAllTravelSpots: false };

      const merged: WebsiteLayoutPreferences = { ...current, ...prefs };

      if (existing) {
        return actor.updateWebsiteLayoutSettings(
          merged.showMusicPlayer,
          merged.defaultSearchPlace,
          merged.showAllTravelSpots,
          merged.rippleSize ?? 0.5,
          merged.cityFontSize ?? 8.0
        );
      } else {
        return actor.addWebsiteLayoutSettings(
          merged.showMusicPlayer,
          merged.defaultSearchPlace,
          merged.showAllTravelSpots,
          merged.rippleSize ?? 0.5,
          merged.cityFontSize ?? 8.0
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteLayoutPreferences'] });
      queryClient.invalidateQueries({ queryKey: ['websiteLayoutSettings'] });
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

// ─── Journeys ─────────────────────────────────────────────────────────────────

export function useGetAllJourneys() {
  const { actor, isFetching } = useActor();

  return useQuery<Journey[]>({
    queryKey: ['journeys'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllJourneys();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetLiveJourneys() {
  const { actor, isFetching } = useActor();

  return useQuery<Journey[]>({
    queryKey: ['liveJourneys'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLiveJourneys();
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

  return useMutation({
    mutationFn: async ({
      city,
      customTitle,
      startDate,
      endDate,
    }: {
      city: string;
      customTitle: string | null;
      startDate: bigint;
      endDate: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addJourney(city, customTitle, startDate, endDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      queryClient.invalidateQueries({ queryKey: ['liveJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['previousJourneys'] });
    },
  });
}

export function useUpdateJourney() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      city,
      customTitle,
      startDate,
      endDate,
    }: {
      id: bigint;
      city: string;
      customTitle: string | null;
      startDate: bigint;
      endDate: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateJourney(id, city, customTitle, startDate, endDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      queryClient.invalidateQueries({ queryKey: ['liveJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['previousJourneys'] });
    },
  });
}

export function useDeleteJourney() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteJourney(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      queryClient.invalidateQueries({ queryKey: ['liveJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['previousJourneys'] });
    },
  });
}

// ─── City Ratings ─────────────────────────────────────────────────────────────

export function useGetAllCityRatings() {
  const { actor, isFetching } = useActor();

  return useQuery<CityRating[]>({
    queryKey: ['cityRatings'],
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

/** Alias kept for backward compatibility with MapComponent */
export function useGetCityRatingForPopup(city: string) {
  return useGetCityRating(city);
}

export function useAddCityRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ city, rating, comment }: { city: string; rating: number; comment: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addCityRating(city, rating, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cityRatings'] });
    },
  });
}

export function useUpdateCityRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ city, rating, comment }: { city: string; rating: number; comment: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateCityRating(city, rating, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cityRatings'] });
    },
  });
}

export function useDeleteCityRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (city: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCityRating(city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cityRatings'] });
    },
  });
}

// ─── City Albums ──────────────────────────────────────────────────────────────

export function useGetAllCityAlbums() {
  const { actor, isFetching } = useActor();

  return useQuery<CityAlbum[]>({
    queryKey: ['cityAlbums'],
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

  return useMutation({
    mutationFn: async ({
      city,
      mediaFiles,
      socialMediaLinks,
    }: {
      city: string;
      mediaFiles: MediaFile[];
      socialMediaLinks: SocialMediaLink[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addCityAlbum(city, mediaFiles, socialMediaLinks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
    },
  });
}

export function useUpdateCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      city,
      mediaFiles,
      socialMediaLinks,
    }: {
      city: string;
      mediaFiles: MediaFile[];
      socialMediaLinks: SocialMediaLink[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateCityAlbum(city, mediaFiles, socialMediaLinks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
    },
  });
}

export function useDeleteCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (city: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCityAlbum(city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
    },
  });
}

export function useAddMediaToCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ city, mediaFile }: { city: string; mediaFile: MediaFile }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addMediaToCityAlbum(city, mediaFile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
    },
  });
}

export function useRemoveMediaFromCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ city, mediaPath }: { city: string; mediaPath: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeMediaFromCityAlbum(city, mediaPath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
    },
  });
}

export function useAddSocialMediaLinkToCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ city, socialMediaLink }: { city: string; socialMediaLink: SocialMediaLink }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addSocialMediaLinkToCityAlbum(city, socialMediaLink);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
    },
  });
}

export function useRemoveSocialMediaLinkFromCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ city, url }: { city: string; url: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeSocialMediaLinkFromCityAlbum(city, url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
    },
  });
}

// ─── Travel Spots ─────────────────────────────────────────────────────────────

export function useGetAllTravelSpots() {
  const { actor, isFetching } = useActor();

  return useQuery<TravelSpot[]>({
    queryKey: ['travelSpots'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTravelSpots();
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

export function useGetAllTravelSpotsForMap() {
  const { actor, isFetching } = useActor();

  return useQuery<TravelSpot[]>({
    queryKey: ['travelSpotsForMap'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTravelSpotsForMap();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTravelSpotSummaryByCity() {
  const { actor, isFetching } = useActor();

  return useQuery<[string, bigint][]>({
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

  return useMutation({
    mutationFn: async ({
      city,
      name,
      description,
      coordinates,
      spotType,
      rating,
    }: {
      city: string;
      name: string;
      description: string | null;
      coordinates: [number, number];
      spotType: string;
      rating: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addTravelSpot(city, name, description, coordinates, spotType, rating);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotsForMap'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotSummaryByCity'] });
    },
  });
}

export function useUpdateTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      city,
      name,
      description,
      coordinates,
      spotType,
      rating,
    }: {
      city: string;
      name: string;
      description: string | null;
      coordinates: [number, number];
      spotType: string;
      rating: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateTravelSpot(city, name, description, coordinates, spotType, rating);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotsForMap'] });
    },
  });
}

export function useDeleteTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ city, name }: { city: string; name: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteTravelSpot(city, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotsForMap'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotSummaryByCity'] });
    },
  });
}

export function useAddMediaToTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      city,
      spotName,
      mediaFile,
    }: {
      city: string;
      spotName: string;
      mediaFile: MediaFile;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addMediaToTravelSpot(city, spotName, mediaFile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelSpots'] });
    },
  });
}

export function useRemoveMediaFromTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      city,
      spotName,
      mediaPath,
    }: {
      city: string;
      spotName: string;
      mediaPath: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeMediaFromTravelSpot(city, spotName, mediaPath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelSpots'] });
    },
  });
}

export function useAddSocialMediaLinkToTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      city,
      spotName,
      socialMediaLink,
    }: {
      city: string;
      spotName: string;
      socialMediaLink: SocialMediaLink;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addSocialMediaLinkToTravelSpot(city, spotName, socialMediaLink);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelSpots'] });
    },
  });
}

export function useRemoveSocialMediaLinkFromTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      city,
      spotName,
      url,
    }: {
      city: string;
      spotName: string;
      url: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeSocialMediaLinkFromTravelSpot(city, spotName, url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelSpots'] });
    },
  });
}

// ─── Music Albums ─────────────────────────────────────────────────────────────

export function useGetAllMusicAlbums() {
  const { actor, isFetching } = useActor();

  return useQuery<MusicAlbum[]>({
    queryKey: ['musicAlbums'],
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

  return useMutation({
    mutationFn: async ({
      title,
      description,
      songs,
    }: {
      title: string;
      description: string;
      songs: Song[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addMusicAlbum(title, description, songs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musicAlbums'] });
    },
  });
}

export function useUpdateMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      songs,
    }: {
      title: string;
      description: string;
      songs: Song[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateMusicAlbum(title, description, songs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musicAlbums'] });
    },
  });
}

export function useDeleteMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMusicAlbum(title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musicAlbums'] });
    },
  });
}

export function useAddSongToMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, song }: { title: string; song: Song }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addSongToMusicAlbum(title, song);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musicAlbums'] });
    },
  });
}

export function useRemoveSongFromMusicAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, songTitle }: { title: string; songTitle: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeSongFromMusicAlbum(title, songTitle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musicAlbums'] });
    },
  });
}

// ─── Website Layout Settings (raw) ───────────────────────────────────────────

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

export function useAddWebsiteLayoutSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      showMusicPlayerBar,
      defaultSearchPlace,
      showAllTravelSpots,
      rippleSize,
      cityFontSize,
    }: {
      showMusicPlayerBar: boolean;
      defaultSearchPlace: string;
      showAllTravelSpots: boolean;
      rippleSize: number;
      cityFontSize: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addWebsiteLayoutSettings(
        showMusicPlayerBar,
        defaultSearchPlace,
        showAllTravelSpots,
        rippleSize,
        cityFontSize
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteLayoutSettings'] });
      queryClient.invalidateQueries({ queryKey: ['websiteLayoutPreferences'] });
    },
  });
}

export function useUpdateWebsiteLayoutSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      showMusicPlayerBar,
      defaultSearchPlace,
      showAllTravelSpots,
      rippleSize,
      cityFontSize,
    }: {
      showMusicPlayerBar: boolean;
      defaultSearchPlace: string;
      showAllTravelSpots: boolean;
      rippleSize: number;
      cityFontSize: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateWebsiteLayoutSettings(
        showMusicPlayerBar,
        defaultSearchPlace,
        showAllTravelSpots,
        rippleSize,
        cityFontSize
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteLayoutSettings'] });
      queryClient.invalidateQueries({ queryKey: ['websiteLayoutPreferences'] });
    },
  });
}

// ─── Schedule Items ───────────────────────────────────────────────────────────

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

  return useQuery<[string, ScheduleItem[]][]>({
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

  return useQuery<[ScheduleItem, [number, number]][]>({
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

  return useMutation({
    mutationFn: async ({
      journeyCity,
      date,
      time,
      location,
      activity,
    }: {
      journeyCity: string;
      date: bigint;
      time: string;
      location: string;
      activity: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addScheduleItem(journeyCity, date, time, location, activity);
    },
    onSuccess: (_, variables) => {
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

  return useMutation({
    mutationFn: async ({
      journeyCity,
      date,
      time,
      location,
      activity,
    }: {
      journeyCity: string;
      date: bigint;
      time: string;
      location: string;
      activity: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateScheduleItem(journeyCity, date, time, location, activity);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItems'] });
    },
  });
}

export function useDeleteScheduleItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      journeyCity,
      date,
      time,
    }: {
      journeyCity: string;
      date: bigint;
      time: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteScheduleItem(journeyCity, date, time);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', variables.journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItems'] });
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

/** Alias for backward compatibility */
export function useGetAllMapBookmarks() {
  return useGetMapBookmarks();
}

export function useAddMapBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      coordinates,
      name,
      description,
      city,
    }: {
      coordinates: [number, number];
      name: string;
      description: string;
      city: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addMapBookmark(coordinates, name, description, city);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapBookmarks'] });
    },
  });
}

export function useUpdateMapBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      coordinates,
      name,
      description,
      city,
    }: {
      coordinates: [number, number];
      name: string;
      description: string;
      city: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
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

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMapBookmark(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapBookmarks'] });
    },
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

  return useMutation({
    mutationFn: async (cities: GeonameCity[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.importCities(cities);
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

  return useMutation({
    mutationFn: async (city: GeonameCity) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addCity(city);
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

  return useMutation({
    mutationFn: async ({ name, city }: { name: string; city: GeonameCity }) => {
      if (!actor) throw new Error('Actor not available');
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

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCity(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citiesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['searchCities'] });
    },
  });
}

// ─── Location Info ────────────────────────────────────────────────────────────

export function useGetAllLocationInfo() {
  const { actor, isFetching } = useActor();

  return useQuery<LocationInfo[]>({
    queryKey: ['locationInfo'],
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

  return useMutation({
    mutationFn: async ({
      name,
      coordinates,
      photoPath,
    }: {
      name: string;
      coordinates: [number, number];
      photoPath: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addLocationInfo(name, coordinates, photoPath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationInfo'] });
    },
  });
}

export function useUpdateLocationInfo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, photoPath }: { name: string; photoPath: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateLocationInfo(name, photoPath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationInfo'] });
    },
  });
}

export function useDeleteLocationInfo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteLocationInfo(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationInfo'] });
    },
  });
}

// ─── Combined Queries ─────────────────────────────────────────────────────────

export function useGetAllCitiesWithRatingsAndTravelSpots() {
  const { actor, isFetching } = useActor();

  return useQuery<[string, number | null, TravelSpot[]][]>({
    queryKey: ['citiesWithRatingsAndTravelSpots'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCitiesWithRatingsAndTravelSpots();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllBookmarksAndTravelSpotsByCity() {
  const { actor, isFetching } = useActor();

  return useQuery<[string, VibeItem[]][]>({
    queryKey: ['allBookmarksAndTravelSpotsByCity'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllBookmarksAndTravelSpotsByCity();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDisplaySettings() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean | null>({
    queryKey: ['displaySettings'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getDisplaySettings();
    },
    enabled: !!actor && !isFetching,
  });
}
