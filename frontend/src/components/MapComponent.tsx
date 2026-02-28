import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, ZoomIn, ZoomOut, RotateCcw, X, Heart, MapPin, Plane, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useGetCityRatingForPopup, useGetCityAlbum, useGetTravelSpots, useGetTravelSpotMediaFiles, useGetTravelSpotSocialMediaLinks, useGetAllScheduleItemsWithCoordinates, useGetAllTravelSpotsForMap, useGetWebsiteLayoutPreferences, useAddMapBookmark, useGetMapBookmarks, useGetScheduleItems } from '@/hooks/useQueries';
import { MediaGalleryPopup } from './MediaGalleryPopup';
import { TravelSpot, ScheduleItem, MapBookmark } from '@/backend';
import { toast } from 'sonner';
import { getDayColor, getDayLabel } from '@/utils/scheduleDayStyling';

interface MapComponentProps {
  coordinates: [number, number];
  locationName: string;
  locationType?: string;
  focusedTravelSpot?: TravelSpot | null;
  focusedBookmark?: MapBookmark | null;
  onTravelSpotFocused?: () => void;
  onBookmarkFocused?: () => void;
  journeyCityFilter?: string;
  // journeyId is the journey.title used as the schedule storage key.
  // When provided, it takes precedence over journeyCityFilter for schedule fetching.
  journeyId?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

// Global marker array to store all markers with their type
interface MarkerData {
  marker: any;
  type: 'TravelSpot' | 'Bookmark' | 'Schedule';
  city?: string;
  name?: string;
  bookmarkData?: MapBookmark;
}

// Icon mapping for travel spot types
const getTravelSpotIcon = (spotType: string): string => {
  const type = spotType.toLowerCase();
  switch (type) {
    case 'city':
      return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="10" width="4" height="11" fill="black" stroke="black" stroke-width="1"/>
          <rect x="8" y="6" width="4" height="15" fill="black" stroke="black" stroke-width="1"/>
          <rect x="13" y="8" width="4" height="13" fill="black" stroke="black" stroke-width="1"/>
          <rect x="18" y="4" width="3" height="17" fill="black" stroke="black" stroke-width="1"/>
          <rect x="4" y="12" width="1" height="1" fill="white"/>
          <rect x="5.5" y="12" width="1" height="1" fill="white"/>
          <rect x="4" y="14" width="1" height="1" fill="white"/>
          <rect x="5.5" y="14" width="1" height="1" fill="white"/>
          <rect x="9" y="8" width="1" height="1" fill="white"/>
          <rect x="10.5" y="8" width="1" height="1" fill="white"/>
          <rect x="9" y="10" width="1" height="1" fill="white"/>
          <rect x="10.5" y="10" width="1" height="1" fill="white"/>
          <rect x="14" y="10" width="1" height="1" fill="white"/>
          <rect x="15.5" y="10" width="1" height="1" fill="white"/>
          <rect x="14" y="12" width="1" height="1" fill="white"/>
          <rect x="15.5" y="12" width="1" height="1" fill="white"/>
          <rect x="19" y="6" width="1" height="1" fill="white"/>
          <rect x="19" y="8" width="1" height="1" fill="white"/>
          <rect x="19" y="10" width="1" height="1" fill="white"/>
        </svg>
      `);
    case 'hotel':
      return '/assets/generated/hotel-icon-vivid-orange-transparent.png';
    case 'restaurant':
      return '/assets/generated/fork-spoon-icon-vivid-red-transparent.png';
    case 'shopping':
      return '/assets/generated/handbag-icon-vivid-yellow-transparent.png';
    case 'heritage':
      return '/assets/generated/temple-icon-vivid-purple-transparent.png';
    case 'relax':
      return '/assets/generated/relax-chair-icon-vivid-green-transparent.png';
    case 'airport':
      return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" fill="#60a5fa" stroke="#60a5fa" stroke-width="1.5"/>
        </svg>
      `);
    case 'transport':
      return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 11l1.5-4.5h11L19 11M5 11v6h14v-6M5 11h14M7 17h.01M17 17h.01" stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <circle cx="7" cy="17" r="1.5" fill="#92400e"/>
          <circle cx="17" cy="17" r="1.5" fill="#92400e"/>
          <path d="M6.5 6.5L8 11M17.5 6.5L16 11" stroke="#92400e" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `);
    case 'beach':
      return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12c1.5-2 3.5-3 5.5-3s4 1 5.5 3c1.5 2 3.5 3 5.5 3s4-1 5.5-3" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M2 17c1.5-2 3.5-3 5.5-3s4 1 5.5 3c1.5 2 3.5 3 5.5 3s4-1 5.5-3" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <circle cx="12" cy="6" r="2" fill="#fbbf24"/>
        </svg>
      `);
    case 'others':
    default:
      return '/assets/generated/three-dots-icon-vivid-lightblue-transparent.png';
  }
};

// Color mapping for travel spot types
const getTravelSpotColor = (spotType: string): string => {
  const type = spotType.toLowerCase();
  switch (type) {
    case 'city': return '#000000';
    case 'hotel': return '#ff6b35';
    case 'restaurant': return '#ff1744';
    case 'shopping': return '#ffd600';
    case 'heritage': return '#9c27b0';
    case 'relax': return '#00e676';
    case 'airport': return '#60a5fa';
    case 'transport': return '#92400e';
    case 'beach': return '#1e3a8a';
    case 'others':
    default: return '#00bcd4';
  }
};

// Geocode a location to get coordinates
async function geocodeLocation(locationName: string, cityBias?: string): Promise<[number, number] | null> {
  try {
    const searchQuery = cityBias ? `${locationName}, ${cityBias}` : locationName;
    const encodedQuery = encodeURIComponent(searchQuery);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': 'LocationMapExplorer/1.0' } }
    );
    if (!response.ok) throw new Error('Geocoding request failed');
    const data = await response.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Format time to 12-hour format with AM/PM
function formatTime12Hour(time24: string): string {
  try {
    const [hours, minutes] = time24.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time24;
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time24;
  }
}

// Get day context string (weekday and date)
function getDayContext(dateNs: bigint): string {
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

export default function MapComponent({ 
  coordinates, 
  locationName, 
  locationType = 'location', 
  focusedTravelSpot, 
  focusedBookmark, 
  onTravelSpotFocused, 
  onBookmarkFocused,
  journeyCityFilter,
  journeyId,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const textMarkerRef = useRef<any>(null);
  const globalMarkersRef = useRef<MarkerData[]>([]);
  const scheduleLayerGroupRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const bookmarkButtonRef = useRef<any>(null);
  const hasInitializedRef = useRef(false);
  const userHasInteractedRef = useRef(false);
  const lastSearchLocationRef = useRef<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [showTravelSpotPopup, setShowTravelSpotPopup] = useState(false);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [showBookmarkPopup, setShowBookmarkPopup] = useState(false);
  const [selectedTravelSpot, setSelectedTravelSpot] = useState<TravelSpot | null>(null);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<ScheduleItem | null>(null);
  const [selectedBookmark, setSelectedBookmark] = useState<MapBookmark | null>(null);
  const [travelSpotPopupPosition, setTravelSpotPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [schedulePopupPosition, setSchedulePopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [bookmarkPopupPosition, setBookmarkPopupPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Bookmark dialog state
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [bookmarkCoordinates, setBookmarkCoordinates] = useState<[number, number] | null>(null);
  const [bookmarkCity, setBookmarkCity] = useState('');
  const [bookmarkName, setBookmarkName] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');

  // Backend data
  const { data: travelSpots = [] } = useGetTravelSpots(locationName);
  const { data: allBookmarks = [] } = useGetMapBookmarks();

  // Use journeyId (journey.title) as the primary schedule key; fall back to journeyCityFilter.
  // This ensures multiple journeys sharing the same city each show their own markers.
  const scheduleKey = journeyId || journeyCityFilter || '';
  const { data: journeyScheduleItems = [] } = useGetScheduleItems(scheduleKey);

  // Get all travel spots for map display and layout preferences
  const { data: allTravelSpots = [] } = useGetAllTravelSpotsForMap();
  const { data: layoutPreferences } = useGetWebsiteLayoutPreferences();

  // Get media files and social media links for selected travel spot
  const { data: selectedSpotMediaFiles = [] } = useGetTravelSpotMediaFiles(
    selectedTravelSpot?.city || '',
    selectedTravelSpot?.name || ''
  );
  const { data: selectedSpotSocialMediaLinks = [] } = useGetTravelSpotSocialMediaLinks(
    selectedTravelSpot?.city || '',
    selectedTravelSpot?.name || ''
  );

  // Bookmark mutation
  const addBookmarkMutation = useAddMapBookmark();

  const getInitialZoom = () => 15;

  const updateDashboard = useCallback(() => {
    const markersByCity: Record<string, { travelSpots: number; bookmarks: number }> = {};
    globalMarkersRef.current.forEach(markerData => {
      const city = markerData.city || 'Unknown';
      if (!markersByCity[city]) markersByCity[city] = { travelSpots: 0, bookmarks: 0 };
      if (markerData.type === 'TravelSpot') markersByCity[city].travelSpots++;
      else if (markerData.type === 'Bookmark') markersByCity[city].bookmarks++;
    });
    return markersByCity;
  }, []);

  // Handle click-to-bookmark functionality
  const handleMapClick = useCallback((e: any) => {
    if (!mapInstanceRef.current || !window.L) return;
    const map = mapInstanceRef.current;
    const { lat, lng } = e.latlng;

    if (bookmarkButtonRef.current) {
      map.removeLayer(bookmarkButtonRef.current);
      bookmarkButtonRef.current = null;
    }

    const bookmarkButtonIcon = window.L.divIcon({
      className: 'custom-bookmark-button',
      html: `
        <div style="
          display: flex; align-items: center; gap: 6px; padding: 8px 16px;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe); color: #0369a1;
          border: 1px solid rgba(3, 105, 161, 0.2); border-radius: 24px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1), 0 2px 8px rgba(3,105,161,0.15);
          cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap;
          user-select: none; backdrop-filter: blur(8px);"
          onmouseover="this.style.transform='translateY(-1px)';"
          onmouseout="this.style.transform='translateY(0px)';">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
          Bookmark
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 24],
    });

    bookmarkButtonRef.current = window.L.marker([lat, lng], { icon: bookmarkButtonIcon }).addTo(map);

    bookmarkButtonRef.current.on('click', (buttonEvent: any) => {
      buttonEvent.originalEvent.stopPropagation();
      setBookmarkCoordinates([lat, lng]);
      setBookmarkCity('');
      setBookmarkName('');
      setBookmarkDescription('');
      setShowBookmarkDialog(true);
      if (bookmarkButtonRef.current) {
        map.removeLayer(bookmarkButtonRef.current);
        bookmarkButtonRef.current = null;
      }
    });

    setTimeout(() => {
      if (bookmarkButtonRef.current) {
        map.removeLayer(bookmarkButtonRef.current);
        bookmarkButtonRef.current = null;
      }
    }, 5000);
  }, []);

  // Handle bookmark creation
  const handleCreateBookmark = useCallback(async () => {
    if (!bookmarkCoordinates || !mapInstanceRef.current || !window.L) return;
    const map = mapInstanceRef.current;
    const [lat, lng] = bookmarkCoordinates;

    try {
      await addBookmarkMutation.mutateAsync({
        coordinates: bookmarkCoordinates,
        name: bookmarkName,
        description: bookmarkDescription,
        city: bookmarkCity,
      });

      const bookmarkIcon = window.L.divIcon({
        className: 'custom-bookmark-marker',
        html: `
          <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;
            background:linear-gradient(135deg,#fbbf24,#f59e0b);border:2px solid white;border-radius:50%;
            box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const bookmarkMarker = window.L.marker([lat, lng], { icon: bookmarkIcon }).addTo(map);
      const bookmarkData: MapBookmark = {
        coordinates: bookmarkCoordinates,
        name: bookmarkName,
        description: bookmarkDescription,
        city: bookmarkCity,
        createdAt: BigInt(Date.now() * 1_000_000),
        updatedAt: BigInt(Date.now() * 1_000_000),
      };

      bookmarkMarker.on('click', (e: any) => {
        e.originalEvent.stopPropagation();
        setSelectedBookmark(bookmarkData);
        const containerRect = mapRef.current?.getBoundingClientRect();
        if (containerRect) {
          const point = map.latLngToContainerPoint([lat, lng]);
          setBookmarkPopupPosition({ x: point.x + containerRect.left, y: point.y + containerRect.top });
        }
        setShowBookmarkPopup(true);
      });

      globalMarkersRef.current.push({ marker: bookmarkMarker, type: 'Bookmark', city: bookmarkCity, name: bookmarkName, bookmarkData });
      updateDashboard();

      toast.success(`Bookmark "${bookmarkName}" created!`);
      setShowBookmarkDialog(false);
      setBookmarkCoordinates(null);
      setBookmarkName('');
      setBookmarkDescription('');
      setBookmarkCity('');
    } catch (error) {
      console.error('Error creating bookmark:', error);
      toast.error('Failed to create bookmark');
    }
  }, [bookmarkCoordinates, bookmarkName, bookmarkDescription, bookmarkCity, addBookmarkMutation, updateDashboard]);

  // Load Leaflet CSS and JS
  useEffect(() => {
    const existingLink = document.querySelector('link[href*="leaflet"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="leaflet"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setLeafletLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize map when Leaflet is loaded
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapRef.current, {
      center: coordinates,
      zoom: getInitialZoom(),
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    scheduleLayerGroupRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', handleMapClick);

    mapInstanceRef.current = map;
    hasInitializedRef.current = true;
    setIsLoading(false);

    // FIX: Call invalidateSize after short delays to ensure the container is fully
    // painted. This fixes the issue where the map doesn't render on first click
    // without a hard refresh (Leaflet calculates tile layout before the container
    // has its final dimensions when inside a dialog/panel).
    const timer1 = setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 100);
    const timer2 = setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      map.remove();
      mapInstanceRef.current = null;
      hasInitializedRef.current = false;
      globalMarkersRef.current = [];
    };
  }, [leafletLoaded]);

  // Update map center when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !hasInitializedRef.current) return;

    const newLocationKey = `${coordinates[0]},${coordinates[1]}`;
    if (lastSearchLocationRef.current === newLocationKey) return;
    lastSearchLocationRef.current = newLocationKey;
    userHasInteractedRef.current = false;

    mapInstanceRef.current.setView(coordinates, getInitialZoom());

    // Also invalidate size when coordinates change (panel may have just opened)
    setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 150);

    if (textMarkerRef.current) {
      mapInstanceRef.current.removeLayer(textMarkerRef.current);
      textMarkerRef.current = null;
    }
  }, [coordinates]);

  // Render travel spot markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !hasInitializedRef.current) return;

    const map = mapInstanceRef.current;
    const L = window.L;
    const showAllSpots = layoutPreferences?.showAllTravelSpots ?? true;

    globalMarkersRef.current.filter(m => m.type === 'TravelSpot').forEach(m => map.removeLayer(m.marker));
    globalMarkersRef.current = globalMarkersRef.current.filter(m => m.type !== 'TravelSpot');

    const spotsToShow = showAllSpots ? allTravelSpots : travelSpots;

    spotsToShow.forEach(spot => {
      const [lat, lng] = spot.coordinates;
      if (!lat || !lng) return;

      const iconUrl = getTravelSpotIcon(spot.spotType);
      const isSvgDataUrl = iconUrl.startsWith('data:image/svg+xml');

      const icon = isSvgDataUrl
        ? L.divIcon({
            className: 'custom-travel-spot-icon',
            html: `<img src="${iconUrl}" width="28" height="28" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));" />`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
        : L.icon({ iconUrl, iconSize: [28, 28], iconAnchor: [14, 14] });

      const marker = L.marker([lat, lng], { icon });

      marker.on('click', (e: any) => {
        e.originalEvent.stopPropagation();
        setSelectedTravelSpot(spot);
        const containerRect = mapRef.current?.getBoundingClientRect();
        if (containerRect) {
          const point = map.latLngToContainerPoint([lat, lng]);
          setTravelSpotPopupPosition({ x: point.x + containerRect.left, y: point.y + containerRect.top });
        }
        setShowTravelSpotPopup(true);
      });

      marker.addTo(map);
      globalMarkersRef.current.push({ marker, type: 'TravelSpot', city: spot.city, name: spot.name });
    });

    updateDashboard();
  }, [allTravelSpots, travelSpots, layoutPreferences, hasInitializedRef.current]);

  // Render bookmark markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !hasInitializedRef.current) return;

    const map = mapInstanceRef.current;
    const L = window.L;

    globalMarkersRef.current.filter(m => m.type === 'Bookmark').forEach(m => map.removeLayer(m.marker));
    globalMarkersRef.current = globalMarkersRef.current.filter(m => m.type !== 'Bookmark');

    allBookmarks.forEach(bookmark => {
      const [lat, lng] = bookmark.coordinates;
      if (!lat || !lng) return;

      const bookmarkIcon = L.divIcon({
        className: 'custom-bookmark-marker',
        html: `
          <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;
            background:linear-gradient(135deg,#fbbf24,#f59e0b);border:2px solid white;border-radius:50%;
            box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: bookmarkIcon });

      marker.on('click', (e: any) => {
        e.originalEvent.stopPropagation();
        setSelectedBookmark(bookmark);
        const containerRect = mapRef.current?.getBoundingClientRect();
        if (containerRect) {
          const point = map.latLngToContainerPoint([lat, lng]);
          setBookmarkPopupPosition({ x: point.x + containerRect.left, y: point.y + containerRect.top });
        }
        setShowBookmarkPopup(true);
      });

      marker.addTo(map);
      globalMarkersRef.current.push({ marker, type: 'Bookmark', city: bookmark.city, name: bookmark.name, bookmarkData: bookmark });
    });

    updateDashboard();
  }, [allBookmarks, hasInitializedRef.current]);

  // Handle focused travel spot
  useEffect(() => {
    if (!focusedTravelSpot || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const [lat, lng] = focusedTravelSpot.coordinates;
    map.setView([lat, lng], 16);
    setSelectedTravelSpot(focusedTravelSpot);
    const containerRect = mapRef.current?.getBoundingClientRect();
    if (containerRect) {
      const point = map.latLngToContainerPoint([lat, lng]);
      setTravelSpotPopupPosition({ x: point.x + containerRect.left, y: point.y + containerRect.top });
    }
    setShowTravelSpotPopup(true);
    if (onTravelSpotFocused) onTravelSpotFocused();
  }, [focusedTravelSpot]);

  // Handle focused bookmark
  useEffect(() => {
    if (!focusedBookmark || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const [lat, lng] = focusedBookmark.coordinates;
    map.setView([lat, lng], 16);
    setSelectedBookmark(focusedBookmark);
    const containerRect = mapRef.current?.getBoundingClientRect();
    if (containerRect) {
      const point = map.latLngToContainerPoint([lat, lng]);
      setBookmarkPopupPosition({ x: point.x + containerRect.left, y: point.y + containerRect.top });
    }
    setShowBookmarkPopup(true);
    if (onBookmarkFocused) onBookmarkFocused();
  }, [focusedBookmark]);

  // Render schedule markers for the filtered journey.
  // FIX: Uses scheduleKey (journey.title) instead of city name, so multiple journeys
  // sharing the same city each render their own distinct set of markers.
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !hasInitializedRef.current) return;
    if (!scheduleLayerGroupRef.current || !routeLayerRef.current) return;

    const map = mapInstanceRef.current;
    const L = window.L;

    scheduleLayerGroupRef.current.clearLayers();
    routeLayerRef.current.clearLayers();

    if (!scheduleKey || journeyScheduleItems.length === 0) return;

    const sortedItems = [...journeyScheduleItems].sort((a, b) => {
      const dateDiff = Number(a.date) - Number(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.time.localeCompare(b.time);
    });

    const uniqueDates = Array.from(new Set(sortedItems.map(item => Number(item.date)))).sort((a, b) => a - b);
    const dateToIndex = new Map<number, number>();
    uniqueDates.forEach((d, i) => dateToIndex.set(d, i));

    const uniqueLocations = Array.from(new Set(sortedItems.map(item => item.location)));
    const geocodedCoords = new Map<string, [number, number] | null>();

    const geocodeAll = async () => {
      await Promise.all(
        uniqueLocations.map(async (loc) => {
          const coords = await geocodeLocation(loc, scheduleKey);
          geocodedCoords.set(loc, coords);
        })
      );

      if (!mapInstanceRef.current || !scheduleLayerGroupRef.current || !routeLayerRef.current) return;

      // Place a marker for every schedule item.
      // Each item gets its own marker regardless of location, so multiple journeys
      // sharing the same city/location all show their own markers.
      sortedItems.forEach((item) => {
        const coords = geocodedCoords.get(item.location);
        if (!coords) return;

        const [lat, lng] = coords;
        const dateIndex = dateToIndex.get(Number(item.date)) ?? 0;
        const dayLabel = getDayLabel(dateIndex);
        const color = getDayColor(dateIndex);

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="background:${color};color:white;border-radius:50%;width:30px;height:30px;
              display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;
              border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;">${dayLabel}</div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([lat, lng], { icon });

        marker.bindPopup(`
          <div style="min-width:160px;font-family:sans-serif;">
            <div style="font-weight:bold;font-size:13px;margin-bottom:4px;">${item.activity}</div>
            <div style="color:#555;font-size:12px;margin-bottom:2px;">📍 ${item.location}</div>
            <div style="color:#777;font-size:11px;margin-bottom:2px;">🕐 ${formatTime12Hour(item.time)}</div>
            <div style="color:#777;font-size:11px;">📅 ${getDayContext(item.date)}</div>
            <div style="display:inline-block;background:${color};color:white;border-radius:4px;
              padding:1px 6px;font-size:10px;margin-top:4px;">${dayLabel}</div>
          </div>
        `);

        marker.on('click', (e: any) => {
          e.originalEvent?.stopPropagation?.();
          setSelectedScheduleItem(item);
          const containerRect = mapRef.current?.getBoundingClientRect();
          if (containerRect) {
            const point = map.latLngToContainerPoint([lat, lng]);
            setSchedulePopupPosition({ x: point.x + containerRect.left, y: point.y + containerRect.top });
          }
          setShowSchedulePopup(true);
        });

        scheduleLayerGroupRef.current!.addLayer(marker);
      });

      // Draw per-day route polylines
      const dayGroups = new Map<number, Array<{ lat: number; lng: number; time: string }>>();
      sortedItems.forEach((item) => {
        const coords = geocodedCoords.get(item.location);
        if (!coords) return;
        const dateIndex = dateToIndex.get(Number(item.date)) ?? 0;
        if (!dayGroups.has(dateIndex)) dayGroups.set(dateIndex, []);
        dayGroups.get(dateIndex)!.push({ lat: coords[0], lng: coords[1], time: item.time });
      });

      dayGroups.forEach((points, dateIndex) => {
        if (points.length < 2) return;
        const sortedPoints = [...points].sort((a, b) => a.time.localeCompare(b.time));
        const latlngs: [number, number][] = sortedPoints.map(p => [p.lat, p.lng]);
        const color = getDayColor(dateIndex);

        const polyline = L.polyline(latlngs, { color, weight: 3, opacity: 0.7, dashArray: '8, 5' });
        routeLayerRef.current!.addLayer(polyline);

        for (let i = 0; i < latlngs.length - 1; i++) {
          const from = latlngs[i];
          const to = latlngs[i + 1];
          const midLat = (from[0] + to[0]) / 2;
          const midLng = (from[1] + to[1]) / 2;
          const dx = to[1] - from[1];
          const dy = to[0] - from[0];
          const angle = Math.atan2(dx, dy) * (180 / Math.PI);

          const arrowIcon = L.divIcon({
            className: '',
            html: `<div style="color:${color};font-size:14px;transform:rotate(${angle}deg);line-height:1;">➤</div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
          L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(routeLayerRef.current!);
        }
      });

      // Auto-fit bounds to show all schedule markers
      const allPoints: [number, number][] = [];
      sortedItems.forEach(item => {
        const coords = geocodedCoords.get(item.location);
        if (coords) allPoints.push(coords);
      });
      if (allPoints.length > 0 && mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
      }
    };

    geocodeAll();
  }, [journeyScheduleItems, scheduleKey, hasInitializedRef.current]);

  const handleZoomIn = () => { if (mapInstanceRef.current) mapInstanceRef.current.zoomIn(); };
  const handleZoomOut = () => { if (mapInstanceRef.current) mapInstanceRef.current.zoomOut(); };
  const handleReset = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(coordinates, getInitialZoom());
      userHasInteractedRef.current = false;
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Map controls */}
      {!isLoading && (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 dark:bg-slate-800/90 shadow-md" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 dark:bg-slate-800/90 shadow-md" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 dark:bg-slate-800/90 shadow-md" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Travel Spot Popup */}
      {showTravelSpotPopup && selectedTravelSpot && travelSpotPopupPosition && (
        <div
          className="fixed z-[2000] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-border/50 p-4 w-72"
          style={{
            left: Math.min(travelSpotPopupPosition.x + 10, window.innerWidth - 300),
            top: Math.min(travelSpotPopupPosition.y - 10, window.innerHeight - 400),
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTravelSpotColor(selectedTravelSpot.spotType) }} />
              <span className="font-semibold text-sm">{selectedTravelSpot.name}</span>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowTravelSpotPopup(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{selectedTravelSpot.spotType}</Badge>
              <Badge variant="outline" className="text-xs">{selectedTravelSpot.city}</Badge>
            </div>
            {selectedTravelSpot.description && (
              <p className="text-xs text-muted-foreground">{selectedTravelSpot.description}</p>
            )}
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-red-500 fill-red-500" />
              <span className="text-xs font-medium">{selectedTravelSpot.rating.toFixed(1)}/10</span>
            </div>
          </div>

          {/* FIX: Removed invalid `title` prop — MediaGalleryPopup only accepts mediaFiles and socialMediaLinks */}
          {(selectedSpotMediaFiles.length > 0 || selectedSpotSocialMediaLinks.length > 0) && (
            <MediaGalleryPopup
              mediaFiles={selectedSpotMediaFiles}
              socialMediaLinks={selectedSpotSocialMediaLinks}
            />
          )}
        </div>
      )}

      {/* Schedule Item Popup */}
      {showSchedulePopup && selectedScheduleItem && schedulePopupPosition && (
        <div
          className="fixed z-[2000] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-border/50 p-4 w-64"
          style={{
            left: Math.min(schedulePopupPosition.x + 10, window.innerWidth - 280),
            top: Math.min(schedulePopupPosition.y - 10, window.innerHeight - 200),
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="font-semibold text-sm">{selectedScheduleItem.activity}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowSchedulePopup(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{selectedScheduleItem.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Plane className="h-3 w-3" />
              <span>{formatTime12Hour(selectedScheduleItem.time)}</span>
            </div>
            <div className="text-xs">{getDayContext(selectedScheduleItem.date)}</div>
          </div>
        </div>
      )}

      {/* Bookmark Popup */}
      {showBookmarkPopup && selectedBookmark && bookmarkPopupPosition && (
        <div
          className="fixed z-[2000] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-border/50 p-4 w-64"
          style={{
            left: Math.min(bookmarkPopupPosition.x + 10, window.innerWidth - 280),
            top: Math.min(bookmarkPopupPosition.y - 10, window.innerHeight - 200),
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
              </div>
              <span className="font-semibold text-sm">{selectedBookmark.name}</span>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowBookmarkPopup(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            {selectedBookmark.city && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{selectedBookmark.city}</span>
              </div>
            )}
            {selectedBookmark.description && <p>{selectedBookmark.description}</p>}
          </div>
        </div>
      )}

      {/* Bookmark Creation Dialog */}
      <Dialog open={showBookmarkDialog} onOpenChange={setShowBookmarkDialog}>
        <DialogContent className="z-[3000]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Bookmark
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bookmark-name">Name *</Label>
              <Input
                id="bookmark-name"
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                placeholder="Bookmark name"
              />
            </div>
            <div>
              <Label htmlFor="bookmark-city">City</Label>
              <Input
                id="bookmark-city"
                value={bookmarkCity}
                onChange={(e) => setBookmarkCity(e.target.value)}
                placeholder="City name"
              />
            </div>
            <div>
              <Label htmlFor="bookmark-description">Description</Label>
              <Textarea
                id="bookmark-description"
                value={bookmarkDescription}
                onChange={(e) => setBookmarkDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookmarkDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateBookmark}
              disabled={!bookmarkName.trim() || addBookmarkMutation.isPending}
            >
              {addBookmarkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Bookmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
