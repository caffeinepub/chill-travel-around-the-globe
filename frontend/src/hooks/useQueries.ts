import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Journey, TravelogueEntry, CityRating, CityAlbum, TravelSpot, MusicAlbum, Song, ScheduleItem, MapBookmark, GeonameCity, MediaFile, SocialMediaLink, LocationInfo } from '../backend';

// ─── Country / Location helpers ───────────────────────────────────────────────

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

function normalizeCountryName(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  return COUNTRY_NAME_MAP[normalized] || null;
}

interface LocationResult {
  coordinates: [number, number];
  name: string;
  searchQuery: string;
  type: 'country' | 'city' | 'town' | 'village';
  country?: string;
  state?: string;
}

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
    if (result.type === 'country' || result.class === 'boundary') locationType = 'country';
    else if (result.type === 'village' || result.type === 'hamlet') locationType = 'village';
    else if (result.type === 'town') locationType = 'town';
    const address = result.address || {};
    const name = address.city || address.town || address.village || address.country || result.name || query;
    return { coordinates: [lat, lng], name, searchQuery: query, type: locationType, country: address.country, state: address.state || address.region };
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

// ─── Journeys ────────────────────────────────────────────────────────────────

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
    mutationFn: async ({ title, city, startDate, endDate }: { title: string; city: string; startDate: bigint; endDate: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addJourney(title, city, startDate, endDate);
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
    mutationFn: async ({ title, startDate, endDate }: { title: string; startDate: bigint; endDate: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateJourney(title, startDate, endDate);
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
    mutationFn: async (title: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteJourney(title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      queryClient.invalidateQueries({ queryKey: ['liveJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingJourneys'] });
      queryClient.invalidateQueries({ queryKey: ['previousJourneys'] });
    },
  });
}

// ─── Travelogue ───────────────────────────────────────────────────────────────

// Sub-step 3a: fetch by journeyId (journey.title) instead of city
export function useGetTravelogueEntry(journeyId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<TravelogueEntry | null>({
    queryKey: ['travelogueEntry', journeyId],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getTravelogueEntry(journeyId);
      return result ?? null;
    },
    enabled: !!actor && !isFetching && !!journeyId,
  });
}

export function useAddTravelogueEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ journeyId, content }: { journeyId: string; content: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addTravelogueEntry(journeyId, content);
    },
    onSuccess: (_, { journeyId }) => {
      queryClient.invalidateQueries({ queryKey: ['travelogueEntry', journeyId] });
    },
  });
}

export function useUpdateTravelogueEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ journeyId, content }: { journeyId: string; content: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateTravelogueEntry(journeyId, content);
    },
    onSuccess: (_, { journeyId }) => {
      queryClient.invalidateQueries({ queryKey: ['travelogueEntry', journeyId] });
    },
  });
}

export function useDeleteTravelogueEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (journeyId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteTravelogueEntry(journeyId);
    },
    onSuccess: (_, journeyId) => {
      queryClient.invalidateQueries({ queryKey: ['travelogueEntry', journeyId] });
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
      const result = await actor.getCityRating(city);
      return result ?? null;
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
      const result = await actor.getCityRatingForPopup(city);
      return result ?? null;
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

export function useAddCityRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ city, rating, comment }: { city: string; rating: number; comment: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addCityRating(city, rating, comment);
    },
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['cityRatings'] });
      queryClient.invalidateQueries({ queryKey: ['cityRating', city] });
      queryClient.invalidateQueries({ queryKey: ['cityRatingForPopup', city] });
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
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['cityRatings'] });
      queryClient.invalidateQueries({ queryKey: ['cityRating', city] });
      queryClient.invalidateQueries({ queryKey: ['cityRatingForPopup', city] });
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
    onSuccess: (_, city) => {
      queryClient.invalidateQueries({ queryKey: ['cityRatings'] });
      queryClient.invalidateQueries({ queryKey: ['cityRating', city] });
      queryClient.invalidateQueries({ queryKey: ['cityRatingForPopup', city] });
    },
  });
}

// ─── City Albums ──────────────────────────────────────────────────────────────

export function useGetCityAlbum(city: string) {
  const { actor, isFetching } = useActor();
  return useQuery<CityAlbum | null>({
    queryKey: ['cityAlbum', city],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getCityAlbum(city);
      return result ?? null;
    },
    enabled: !!actor && !isFetching && !!city,
  });
}

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

export function useAddCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ city, mediaFiles, socialMediaLinks }: { city: string; mediaFiles: MediaFile[]; socialMediaLinks: SocialMediaLink[] }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addCityAlbum(city, mediaFiles, socialMediaLinks);
    },
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', city] });
    },
  });
}

export function useUpdateCityAlbum() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ city, mediaFiles, socialMediaLinks }: { city: string; mediaFiles: MediaFile[]; socialMediaLinks: SocialMediaLink[] }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateCityAlbum(city, mediaFiles, socialMediaLinks);
    },
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', city] });
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
    onSuccess: (_, city) => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', city] });
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
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', city] });
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
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', city] });
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
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', city] });
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
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['cityAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['cityAlbum', city] });
    },
  });
}

// ─── Travel Spots ─────────────────────────────────────────────────────────────

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
  return useMutation({
    mutationFn: async ({ city, name, description, coordinates, spotType, rating }: { city: string; name: string; description: string | null; coordinates: [number, number]; spotType: string; rating: number }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addTravelSpot(city, name, description, coordinates, spotType, rating);
    },
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['travelSpots', city] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotSummaryByCity'] });
    },
  });
}

export function useUpdateTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ city, name, description, coordinates, spotType, rating }: { city: string; name: string; description: string | null; coordinates: [number, number]; spotType: string; rating: number }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateTravelSpot(city, name, description, coordinates, spotType, rating);
    },
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['travelSpots', city] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
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
    onSuccess: (_, { city }) => {
      queryClient.invalidateQueries({ queryKey: ['travelSpots', city] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpots'] });
      queryClient.invalidateQueries({ queryKey: ['allTravelSpotsForMap'] });
      queryClient.invalidateQueries({ queryKey: ['travelSpotSummaryByCity'] });
    },
  });
}

export function useAddMediaToTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ city, spotName, mediaFile }: { city: string; spotName: string; mediaFile: MediaFile }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addMediaToTravelSpot(city, spotName, mediaFile);
    },
    onSuccess: (_, { city, spotName }) => {
      queryClient.invalidateQueries({ queryKey: ['travelSpotMediaFiles', city, spotName] });
      queryClient.invalidateQueries({ queryKey: ['travelSpots', city] });
    },
  });
}

export function useRemoveMediaFromTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ city, spotName, mediaPath }: { city: string; spotName: string; mediaPath: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeMediaFromTravelSpot(city, spotName, mediaPath);
    },
    onSuccess: (_, { city, spotName }) => {
      queryClient.invalidateQueries({ queryKey: ['travelSpotMediaFiles', city, spotName] });
      queryClient.invalidateQueries({ queryKey: ['travelSpots', city] });
    },
  });
}

export function useAddSocialMediaLinkToTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ city, spotName, socialMediaLink }: { city: string; spotName: string; socialMediaLink: SocialMediaLink }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addSocialMediaLinkToTravelSpot(city, spotName, socialMediaLink);
    },
    onSuccess: (_, { city, spotName }) => {
      queryClient.invalidateQueries({ queryKey: ['travelSpotSocialMediaLinks', city, spotName] });
      queryClient.invalidateQueries({ queryKey: ['travelSpots', city] });
    },
  });
}

export function useRemoveSocialMediaLinkFromTravelSpot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ city, spotName, url }: { city: string; spotName: string; url: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeSocialMediaLinkFromTravelSpot(city, spotName, url);
    },
    onSuccess: (_, { city, spotName }) => {
      queryClient.invalidateQueries({ queryKey: ['travelSpotSocialMediaLinks', city, spotName] });
      queryClient.invalidateQueries({ queryKey: ['travelSpots', city] });
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
    mutationFn: async ({ title, description, songs }: { title: string; description: string; songs: Song[] }) => {
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
    mutationFn: async ({ title, description, songs }: { title: string; description: string; songs: Song[] }) => {
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

// ─── Website Layout ───────────────────────────────────────────────────────────

export type WebsiteLayoutPreferences = {
  showMusicPlayer: boolean;
  defaultSearchPlace: string;
  showAllTravelSpots: boolean;
  rippleSize: number;
  cityFontSize: number;
};

export function useGetWebsiteLayoutPreferences() {
  const { actor, isFetching } = useActor();
  return useQuery<WebsiteLayoutPreferences | null>({
    queryKey: ['websiteLayoutPreferences'],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getWebsiteLayoutSettings();
      if (!result) return null;
      return {
        showMusicPlayer: result.showMusicPlayerBar,
        defaultSearchPlace: result.defaultSearchPlace,
        showAllTravelSpots: result.showAllTravelSpots,
        rippleSize: result.rippleSize,
        cityFontSize: result.cityFontSize,
      };
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveWebsiteLayoutPreferences() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: WebsiteLayoutPreferences) => {
      if (!actor) throw new Error('Actor not available');
      const existing = await actor.getWebsiteLayoutSettings();
      if (existing) {
        return actor.updateWebsiteLayoutSettings(
          prefs.showMusicPlayer,
          prefs.defaultSearchPlace,
          prefs.showAllTravelSpots,
          prefs.rippleSize,
          prefs.cityFontSize,
        );
      } else {
        return actor.addWebsiteLayoutSettings(
          prefs.showMusicPlayer,
          prefs.defaultSearchPlace,
          prefs.showAllTravelSpots,
          prefs.rippleSize,
          prefs.cityFontSize,
        );
      }
    },
    onSuccess: () => {
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
  return useMutation({
    mutationFn: async ({ journeyCity, date, time, location, activity }: { journeyCity: string; date: bigint; time: string; location: string; activity: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addScheduleItem(journeyCity, date, time, location, activity);
    },
    onSuccess: (_, { journeyCity }) => {
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItemsWithCoordinates'] });
    },
  });
}

export function useUpdateScheduleItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ journeyCity, date, time, location, activity }: { journeyCity: string; date: bigint; time: string; location: string; activity: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateScheduleItem(journeyCity, date, time, location, activity);
    },
    onSuccess: (_, { journeyCity }) => {
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItemsWithCoordinates'] });
    },
  });
}

export function useDeleteScheduleItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ journeyCity, date, time }: { journeyCity: string; date: bigint; time: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteScheduleItem(journeyCity, date, time);
    },
    onSuccess: (_, { journeyCity }) => {
      queryClient.invalidateQueries({ queryKey: ['scheduleItems', journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['journeyScheduleWithDays', journeyCity] });
      queryClient.invalidateQueries({ queryKey: ['allScheduleItemsWithCoordinates'] });
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

export function useAddMapBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ coordinates, name, description, city }: { coordinates: [number, number]; name: string; description: string; city: string }) => {
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
    mutationFn: async ({ coordinates, name, description, city }: { coordinates: [number, number]; name: string; description: string; city: string }) => {
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

export function useGetAllBookmarksAndTravelSpotsByCity() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, import('../backend').VibeItem[]]>>({
    queryKey: ['allBookmarksAndTravelSpotsByCity'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllBookmarksAndTravelSpotsByCity();
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
    mutationFn: async ({ name, coordinates, photoPath }: { name: string; coordinates: [number, number]; photoPath: string | null }) => {
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
