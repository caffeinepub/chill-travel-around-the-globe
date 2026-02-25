import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Camera, X, Heart, Image, Video, MapPin, Plane, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useGetCityRatingForPopup, useGetCityAlbum, useGetTravelSpots, useGetTravelSpotMediaFiles, useGetTravelSpotSocialMediaLinks, useGetAllScheduleItemsWithCoordinates, useGetAllTravelSpotsForMap, useGetWebsiteLayoutPreferences, useAddMapBookmark, useGetMapBookmarks, useGetScheduleItems } from '@/hooks/useQueries';
import { MediaGalleryPopup } from './MediaGalleryPopup';
import { MediaType, TravelSpot, ScheduleItem, MapBookmark } from '@/backend';
import { toast } from 'sonner';
import { getDayColor, getDayLabel, computeDayIndex } from '@/utils/scheduleDayStyling';
import { buildDayRoutes } from '@/utils/scheduleRouteUtils';

interface MapComponentProps {
  coordinates: [number, number];
  locationName: string;
  locationType?: string;
  focusedTravelSpot?: TravelSpot | null;
  focusedBookmark?: MapBookmark | null;
  onTravelSpotFocused?: () => void;
  onBookmarkFocused?: () => void;
  journeyCityFilter?: string | null;
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

// Icon mapping for travel spot types - using vivid transparent icons with city icon for "City" type
const getTravelSpotIcon = (spotType: string): string => {
  const type = spotType.toLowerCase();
  switch (type) {
    case 'city':
      // Use a black city icon for "City" type instead of three dots
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
      // Light blue aeroplane icon
      return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" fill="#60a5fa" stroke="#60a5fa" stroke-width="1.5"/>
        </svg>
      `);
    case 'transport':
      // Brown car icon
      return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 11l1.5-4.5h11L19 11M5 11v6h14v-6M5 11h14M7 17h.01M17 17h.01" stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <circle cx="7" cy="17" r="1.5" fill="#92400e"/>
          <circle cx="17" cy="17" r="1.5" fill="#92400e"/>
          <path d="M6.5 6.5L8 11M17.5 6.5L16 11" stroke="#92400e" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `);
    case 'beach':
      // Navy blue wave icon
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

// Enhanced vivid color mapping for travel spot types (for badges and UI elements)
const getTravelSpotColor = (spotType: string): string => {
  const type = spotType.toLowerCase();
  switch (type) {
    case 'city':
      return '#000000'; // Black for city
    case 'hotel':
      return '#ff6b35'; // Vivid orange
    case 'restaurant':
      return '#ff1744'; // Vivid red
    case 'shopping':
      return '#ffd600'; // Vivid yellow
    case 'heritage':
      return '#9c27b0'; // Vivid purple
    case 'relax':
      return '#00e676'; // Vivid green
    case 'airport':
      return '#60a5fa'; // Light blue
    case 'transport':
      return '#92400e'; // Brown
    case 'beach':
      return '#1e3a8a'; // Navy blue
    case 'others':
    default:
      return '#00bcd4'; // Vivid light blue
  }
};

// Geocode a location to get coordinates
async function geocodeLocation(locationName: string, cityBias?: string): Promise<[number, number] | null> {
  try {
    // If we have a city bias, try searching with city context first
    const searchQuery = cityBias ? `${locationName}, ${cityBias}` : locationName;
    const encodedQuery = encodeURIComponent(searchQuery);
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
      const lon = parseFloat(result.lon);

      if (!isNaN(lat) && !isNaN(lon)) {
        return [lat, lon];
      }
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
  journeyCityFilter 
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const textMarkerRef = useRef<any>(null);
  const globalMarkersRef = useRef<MarkerData[]>([]); // Global marker array
  const scheduleLayerGroupRef = useRef<any>(null); // Layer group for schedule markers
  const routeLayerRef = useRef<any>(null); // Layer for schedule route polylines
  const bookmarkButtonRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const hasInitializedRef = useRef(false);
  const userHasInteractedRef = useRef(false);
  const lastSearchLocationRef = useRef<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [zoom, setZoom] = useState(15);
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

  // Get city rating, album data, travel spots, schedule items, and bookmarks from backend
  const { data: cityRating, isLoading: ratingLoading, error: ratingError } = useGetCityRatingForPopup(locationName);
  const { data: cityAlbum, isLoading: albumLoading, error: albumError } = useGetCityAlbum(locationName);
  const { data: travelSpots = [], isLoading: spotsLoading } = useGetTravelSpots(locationName);
  const { data: scheduleItemsWithCoords = [], isLoading: scheduleLoading } = useGetAllScheduleItemsWithCoordinates();
  const { data: allBookmarks = [], isLoading: bookmarksLoading } = useGetMapBookmarks();
  
  // Get schedule items for the filtered journey city
  const { data: journeyScheduleItems = [], isLoading: journeyScheduleLoading, isFetched: journeyScheduleFetched } = useGetScheduleItems(journeyCityFilter || '');
  
  // Get all travel spots for map display and layout preferences
  const { data: allTravelSpots = [], isLoading: allSpotsLoading } = useGetAllTravelSpotsForMap();
  const { data: layoutPreferences } = useGetWebsiteLayoutPreferences();
  
  // Get media files and social media links for selected travel spot
  const { data: selectedSpotMediaFiles = [], isLoading: spotMediaLoading } = useGetTravelSpotMediaFiles(
    selectedTravelSpot?.city || '',
    selectedTravelSpot?.name || ''
  );
  const { data: selectedSpotSocialMediaLinks = [], isLoading: spotSocialMediaLoading } = useGetTravelSpotSocialMediaLinks(
    selectedTravelSpot?.city || '',
    selectedTravelSpot?.name || ''
  );

  // Bookmark mutation
  const addBookmarkMutation = useAddMapBookmark();

  // Set default zoom level to 15 for all location types - this ensures every search result uses zoom level 15
  const getInitialZoom = () => {
    return 15;
  };

  // Single updateDashboard function that iterates through the global marker array
  const updateDashboard = useCallback(() => {
    const markersByCity: Record<string, { travelSpots: number; bookmarks: number }> = {};
    
    // Iterate through global markers and count by type and city
    globalMarkersRef.current.forEach(markerData => {
      const city = markerData.city || 'Unknown';
      
      if (!markersByCity[city]) {
        markersByCity[city] = { travelSpots: 0, bookmarks: 0 };
      }
      
      if (markerData.type === 'TravelSpot') {
        markersByCity[city].travelSpots++;
      } else if (markerData.type === 'Bookmark') {
        markersByCity[city].bookmarks++;
      }
    });
    
    // Log the dashboard summary for debugging
    console.log('Dashboard Summary:', markersByCity);
    
    // Return the summary for potential UI updates
    return markersByCity;
  }, []);

  // Handle click-to-bookmark functionality - now shows a modern, minimal button first
  const handleMapClick = useCallback((e: any) => {
    if (!mapInstanceRef.current || !window.L) return;

    const map = mapInstanceRef.current;
    const { lat, lng } = e.latlng;

    // Remove any existing bookmark button
    if (bookmarkButtonRef.current) {
      map.removeLayer(bookmarkButtonRef.current);
      bookmarkButtonRef.current = null;
    }

    // Create a modern, minimal "+ Bookmark" button at the clicked location
    const bookmarkButtonIcon = window.L.divIcon({
      className: 'custom-bookmark-button',
      html: `
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          color: #0369a1;
          border: 1px solid rgba(3, 105, 161, 0.2);
          border-radius: 24px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(3, 105, 161, 0.15);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          user-select: none;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        " 
        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(0, 0, 0, 0.15), 0 3px 12px rgba(3, 105, 161, 0.2)'; this.style.cursor='pointer';"
        onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(3, 105, 161, 0.15)'; this.style.cursor='pointer';"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
          Bookmark
        </div>
      `,
      iconSize: [0, 0], // Let content determine size
      iconAnchor: [0, 24], // Position above the click point
    });

    // Create the button marker at the clicked coordinates
    bookmarkButtonRef.current = window.L.marker([lat, lng], { icon: bookmarkButtonIcon }).addTo(map);

    // Add click handler to the button
    bookmarkButtonRef.current.on('click', (buttonEvent: any) => {
      // Stop event propagation to prevent map click
      buttonEvent.originalEvent.stopPropagation();
      
      // Store coordinates and open dialog
      setBookmarkCoordinates([lat, lng]);
      setBookmarkCity('');
      setBookmarkName('');
      setBookmarkDescription('');
      setShowBookmarkDialog(true);
      
      // Remove the button
      if (bookmarkButtonRef.current) {
        map.removeLayer(bookmarkButtonRef.current);
        bookmarkButtonRef.current = null;
      }
    });

    // Auto-remove button after 5 seconds if not clicked
    setTimeout(() => {
      if (bookmarkButtonRef.current) {
        map.removeLayer(bookmarkButtonRef.current);
        bookmarkButtonRef.current = null;
      }
    }, 5000);
  }, []);

  // Handle bookmark creation - now stores marker in global array and calls updateDashboard
  const handleCreateBookmark = useCallback(async () => {
    if (!bookmarkCoordinates || !mapInstanceRef.current || !window.L) return;

    const map = mapInstanceRef.current;
    const [lat, lng] = bookmarkCoordinates;

    try {
      // Save bookmark to backend
      await addBookmarkMutation.mutateAsync({
        coordinates: bookmarkCoordinates,
        name: bookmarkName,
        description: bookmarkDescription,
        city: bookmarkCity,
      });

      // Create a star-shaped bookmark marker icon
      const bookmarkIcon = window.L.divIcon({
        className: 'custom-bookmark-marker',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Create the marker at the coordinates
      const bookmarkMarker = window.L.marker([lat, lng], { icon: bookmarkIcon }).addTo(map);

      // Create bookmark data object
      const bookmarkData: MapBookmark = {
        coordinates: bookmarkCoordinates,
        name: bookmarkName,
        description: bookmarkDescription,
        city: bookmarkCity,
        createdAt: BigInt(Date.now() * 1000000),
        updatedAt: BigInt(Date.now() * 1000000),
      };

      // Add click handler to open bookmark popup
      bookmarkMarker.on('click', (e: any) => handleBookmarkMarkerClick(e, bookmarkData));

      // Store the marker in the global array with type "Bookmark"
      globalMarkersRef.current.push({
        marker: bookmarkMarker,
        type: 'Bookmark',
        city: bookmarkCity,
        name: bookmarkName,
        bookmarkData: bookmarkData,
      });

      // Call updateDashboard to refresh the Vibes panel
      updateDashboard();

      // Show success toast
      toast.success('Bookmark created successfully!');

      // Close dialog and reset state
      setShowBookmarkDialog(false);
      setBookmarkCoordinates(null);
      setBookmarkCity('');
      setBookmarkName('');
      setBookmarkDescription('');
    } catch (error) {
      console.error('Error creating bookmark:', error);
      toast.error('Failed to create bookmark');
    }
  }, [bookmarkCoordinates, bookmarkName, bookmarkDescription, bookmarkCity, addBookmarkMutation, updateDashboard]);

  // Handle schedule marker click
  const handleScheduleMarkerClick = useCallback((e: any, item: ScheduleItem, dayLabel: string) => {
    if (!mapRef.current) return;

    const mapRect = mapRef.current.getBoundingClientRect();
    const x = e.originalEvent.clientX - mapRect.left;
    const y = e.originalEvent.clientY - mapRect.top;

    setSelectedScheduleItem(item);
    setSchedulePopupPosition({ x, y });
    setShowSchedulePopup(true);
  }, []);

  // Handle bookmark marker click
  const handleBookmarkMarkerClick = useCallback((e: any, bookmark: MapBookmark) => {
    if (!mapRef.current) return;

    const mapRect = mapRef.current.getBoundingClientRect();
    const x = e.originalEvent.clientX - mapRect.left;
    const y = e.originalEvent.clientY - mapRect.top;

    setSelectedBookmark(bookmark);
    setBookmarkPopupPosition({ x, y });
    setShowBookmarkPopup(true);
  }, []);

  // Load Leaflet library
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        // Load Leaflet.PolylineDecorator plugin
        const decoratorScript = document.createElement('script');
        decoratorScript.src = 'https://unpkg.com/leaflet-polylinedecorator@1.6.0/dist/leaflet.polylineDecorator.js';
        decoratorScript.onload = () => {
          setLeafletLoaded(true);
        };
        document.head.appendChild(decoratorScript);
      };
      document.head.appendChild(script);
    } else if (window.L) {
      setLeafletLoaded(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView(coordinates, getInitialZoom());

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add click handler for bookmark creation
    map.on('click', handleMapClick);

    mapInstanceRef.current = map;
    hasInitializedRef.current = true;
    setIsLoading(false);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, coordinates, handleMapClick]);

  // Update map view when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return;

    const map = mapInstanceRef.current;
    const L = window.L;

    // Only update if this is a new search (different location)
    if (lastSearchLocationRef.current !== locationName) {
      lastSearchLocationRef.current = locationName;
      userHasInteractedRef.current = false;
    }

    // Only auto-pan if user hasn't interacted with the map
    if (!userHasInteractedRef.current) {
      map.setView(coordinates, getInitialZoom(), {
        animate: true,
        duration: 1,
      });
    }

    // Remove existing text marker if any
    if (textMarkerRef.current) {
      map.removeLayer(textMarkerRef.current);
    }

    // Create a custom text marker for the location name
    const textIcon = L.divIcon({
      className: 'custom-text-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95));
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          border: 2px solid white;
          text-align: center;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        ">
          ${locationName}
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, -10],
    });

    textMarkerRef.current = L.marker(coordinates, { icon: textIcon }).addTo(map);

    // Track user interaction
    const handleUserInteraction = () => {
      userHasInteractedRef.current = true;
    };

    map.on('drag', handleUserInteraction);
    map.on('zoom', handleUserInteraction);

    return () => {
      map.off('drag', handleUserInteraction);
      map.off('zoom', handleUserInteraction);
    };
  }, [coordinates, locationName, leafletLoaded]);

  // Render travel spot markers
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded || !window.L) return;

    const map = mapInstanceRef.current;
    const L = window.L;

    // Determine which travel spots to display
    const spotsToDisplay = layoutPreferences?.showAllTravelSpots ? allTravelSpots : travelSpots;

    // Remove existing travel spot markers from global array
    globalMarkersRef.current = globalMarkersRef.current.filter(markerData => {
      if (markerData.type === 'TravelSpot') {
        map.removeLayer(markerData.marker);
        return false;
      }
      return true;
    });

    // Add new travel spot markers
    spotsToDisplay.forEach(spot => {
      const iconUrl = getTravelSpotIcon(spot.spotType);
      const icon = L.icon({
        iconUrl,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker(spot.coordinates, { icon }).addTo(map);

      marker.on('click', (e: any) => {
        if (!mapRef.current) return;

        const mapRect = mapRef.current.getBoundingClientRect();
        const x = e.originalEvent.clientX - mapRect.left;
        const y = e.originalEvent.clientY - mapRect.top;

        setSelectedTravelSpot(spot);
        setTravelSpotPopupPosition({ x, y });
        setShowTravelSpotPopup(true);
      });

      // Store marker in global array
      globalMarkersRef.current.push({
        marker,
        type: 'TravelSpot',
        city: spot.city,
        name: spot.name,
      });
    });

    // Update dashboard after adding markers
    updateDashboard();
  }, [travelSpots, allTravelSpots, layoutPreferences, leafletLoaded, updateDashboard]);

  // Render bookmark markers
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded || !window.L) return;

    const map = mapInstanceRef.current;
    const L = window.L;

    // Remove existing bookmark markers from global array
    globalMarkersRef.current = globalMarkersRef.current.filter(markerData => {
      if (markerData.type === 'Bookmark') {
        map.removeLayer(markerData.marker);
        return false;
      }
      return true;
    });

    // Add new bookmark markers
    allBookmarks.forEach(bookmark => {
      const bookmarkIcon = L.divIcon({
        className: 'custom-bookmark-marker',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(bookmark.coordinates, { icon: bookmarkIcon }).addTo(map);

      marker.on('click', (e: any) => handleBookmarkMarkerClick(e, bookmark));

      // Store marker in global array
      globalMarkersRef.current.push({
        marker,
        type: 'Bookmark',
        city: bookmark.city,
        name: bookmark.name,
        bookmarkData: bookmark,
      });
    });

    // Update dashboard after adding markers
    updateDashboard();
  }, [allBookmarks, leafletLoaded, handleBookmarkMarkerClick, updateDashboard]);

  // Render schedule markers and routes for journey city filter
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded || !window.L) return;
    if (!journeyCityFilter) return;

    const map = mapInstanceRef.current;
    const L = window.L;

    // Clear existing schedule layer group
    if (scheduleLayerGroupRef.current) {
      map.removeLayer(scheduleLayerGroupRef.current);
      scheduleLayerGroupRef.current = null;
    }

    // Clear existing route layer
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    // Remove existing schedule markers from global array
    globalMarkersRef.current = globalMarkersRef.current.filter(markerData => {
      if (markerData.type === 'Schedule') {
        return false;
      }
      return true;
    });

    // Wait for schedule data to be fetched
    if (journeyScheduleLoading || !journeyScheduleFetched) {
      return;
    }

    // If no schedule items, nothing to render
    if (!journeyScheduleItems || journeyScheduleItems.length === 0) {
      return;
    }

    // Create a new layer group for schedule markers
    scheduleLayerGroupRef.current = L.layerGroup().addTo(map);

    // Geocode schedule items and create markers
    const geocodeAndRenderSchedule = async () => {
      const scheduleWithCoords: Array<[ScheduleItem, [number, number]]> = [];

      for (const item of journeyScheduleItems) {
        const coords = await geocodeLocation(item.location, journeyCityFilter);
        if (coords) {
          scheduleWithCoords.push([item, coords]);
        } else {
          console.warn(`Failed to geocode schedule location: ${item.location}`);
        }
      }

      if (scheduleWithCoords.length === 0) {
        return;
      }

      // Compute day indices for all items
      const dayIndices = scheduleWithCoords.map(([item]) => computeDayIndex(item.date, journeyScheduleItems));

      // Create markers for each schedule item
      scheduleWithCoords.forEach(([item, coords], index) => {
        const dayIndex = dayIndices[index];
        const dayLabel = getDayLabel(dayIndex);
        const dayColor = getDayColor(dayIndex);

        const scheduleIcon = L.divIcon({
          className: 'custom-schedule-marker',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              background: ${dayColor};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              cursor: pointer;
              font-weight: 700;
              font-size: 12px;
              color: white;
            ">
              ${dayLabel}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker(coords, { icon: scheduleIcon }).addTo(scheduleLayerGroupRef.current);

        marker.on('click', (e: any) => handleScheduleMarkerClick(e, item, dayLabel));

        // Store marker in global array
        globalMarkersRef.current.push({
          marker,
          type: 'Schedule',
          city: journeyCityFilter,
          name: item.location,
        });
      });

      // Build per-day routes
      const dayRoutes = buildDayRoutes(scheduleWithCoords);

      // Create a layer group for routes
      routeLayerRef.current = L.layerGroup().addTo(map);

      // Draw route polylines for each day with enhanced arrows
      dayRoutes.forEach(({ dayKey, coordinates, items }) => {
        if (coordinates.length < 2) return;

        const dayIndex = computeDayIndex(items[0][0].date, journeyScheduleItems);
        const dayColor = getDayColor(dayIndex);

        // Create polyline
        const polyline = L.polyline(coordinates, {
          color: dayColor,
          weight: 4,
          opacity: 0.7,
          smoothFactor: 1,
        }).addTo(routeLayerRef.current);

        // Add enhanced arrow decorators with more arrows and larger size
        if (L.polylineDecorator) {
          const decorator = L.polylineDecorator(polyline, {
            patterns: [
              {
                offset: '10%',
                repeat: '15%', // More frequent arrows (was 25%)
                symbol: L.Symbol.arrowHead({
                  pixelSize: 14, // Larger arrows (was 10)
                  polygon: false,
                  pathOptions: {
                    stroke: true,
                    color: dayColor,
                    weight: 3,
                    opacity: 0.9,
                  }
                })
              }
            ]
          }).addTo(routeLayerRef.current);
        }
      });

      // Fit map to show all schedule markers
      if (scheduleWithCoords.length > 0) {
        const bounds = L.latLngBounds(scheduleWithCoords.map(([_, coords]) => coords));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    };

    geocodeAndRenderSchedule();
  }, [journeyCityFilter, journeyScheduleItems, journeyScheduleLoading, journeyScheduleFetched, leafletLoaded, handleScheduleMarkerClick]);

  // Handle focused travel spot
  useEffect(() => {
    if (!mapInstanceRef.current || !focusedTravelSpot) return;

    const map = mapInstanceRef.current;
    map.setView(focusedTravelSpot.coordinates, 16, { animate: true });

    // Trigger the popup
    if (mapRef.current) {
      const mapRect = mapRef.current.getBoundingClientRect();
      const centerX = mapRect.width / 2;
      const centerY = mapRect.height / 2;

      setSelectedTravelSpot(focusedTravelSpot);
      setTravelSpotPopupPosition({ x: centerX, y: centerY });
      setShowTravelSpotPopup(true);

      // Call the callback to reset the focused state
      if (onTravelSpotFocused) {
        onTravelSpotFocused();
      }
    }
  }, [focusedTravelSpot, onTravelSpotFocused]);

  // Handle focused bookmark
  useEffect(() => {
    if (!mapInstanceRef.current || !focusedBookmark) return;

    const map = mapInstanceRef.current;
    map.setView(focusedBookmark.coordinates, 16, { animate: true });

    // Trigger the popup
    if (mapRef.current) {
      const mapRect = mapRef.current.getBoundingClientRect();
      const centerX = mapRect.width / 2;
      const centerY = mapRect.height / 2;

      setSelectedBookmark(focusedBookmark);
      setBookmarkPopupPosition({ x: centerX, y: centerY });
      setShowBookmarkPopup(true);

      // Call the callback to reset the focused state
      if (onBookmarkFocused) {
        onBookmarkFocused();
      }
    }
  }, [focusedBookmark, onBookmarkFocused]);

  // Zoom controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
      setZoom(mapInstanceRef.current.getZoom());
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
      setZoom(mapInstanceRef.current.getZoom());
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(coordinates, getInitialZoom());
      setZoom(getInitialZoom());
      userHasInteractedRef.current = false;
    }
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden shadow-lg" />

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomIn}
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomOut}
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleResetView}
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Travel Spot Popup */}
      {showTravelSpotPopup && selectedTravelSpot && travelSpotPopupPosition && (
        <Card
          className="absolute z-[1001] w-80 shadow-2xl"
          style={{
            left: `${travelSpotPopupPosition.x}px`,
            top: `${travelSpotPopupPosition.y}px`,
            transform: 'translate(-50%, -100%) translateY(-10px)',
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{selectedTravelSpot.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    style={{
                      backgroundColor: getTravelSpotColor(selectedTravelSpot.spotType),
                      color: 'white',
                    }}
                  >
                    {selectedTravelSpot.spotType}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    <span className="text-sm font-medium">{selectedTravelSpot.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowTravelSpotPopup(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTravelSpot.description && (
              <p className="text-sm text-muted-foreground">{selectedTravelSpot.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{selectedTravelSpot.city}</span>
            </div>
            {(selectedSpotMediaFiles.length > 0 || selectedSpotSocialMediaLinks.length > 0) && (
              <MediaGalleryPopup
                mediaFiles={selectedSpotMediaFiles}
                socialMediaLinks={selectedSpotSocialMediaLinks}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule Popup with Enhanced Details */}
      {showSchedulePopup && selectedScheduleItem && schedulePopupPosition && (
        <Card
          className="absolute z-[1001] w-80 shadow-2xl"
          style={{
            left: `${schedulePopupPosition.x}px`,
            top: `${schedulePopupPosition.y}px`,
            transform: 'translate(-50%, -100%) translateY(-10px)',
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{selectedScheduleItem.activity}</CardTitle>
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getDayLabel(computeDayIndex(selectedScheduleItem.date, journeyScheduleItems))}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getDayContext(selectedScheduleItem.date)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-primary">
                    {formatTime12Hour(selectedScheduleItem.time)}
                  </div>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSchedulePopup(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{selectedScheduleItem.location}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookmark Popup */}
      {showBookmarkPopup && selectedBookmark && bookmarkPopupPosition && (
        <Card
          className="absolute z-[1001] w-80 shadow-2xl"
          style={{
            left: `${bookmarkPopupPosition.x}px`,
            top: `${bookmarkPopupPosition.y}px`,
            transform: 'translate(-50%, -100%) translateY(-10px)',
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{selectedBookmark.name}</CardTitle>
                <Badge variant="secondary" className="mt-2">Bookmark</Badge>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowBookmarkPopup(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedBookmark.description && (
              <p className="text-sm text-muted-foreground">{selectedBookmark.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{selectedBookmark.city}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookmark Creation Dialog */}
      <Dialog open={showBookmarkDialog} onOpenChange={setShowBookmarkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Bookmark</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bookmark-name">Name</Label>
              <Input
                id="bookmark-name"
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                placeholder="Enter bookmark name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookmark-city">City</Label>
              <Input
                id="bookmark-city"
                value={bookmarkCity}
                onChange={(e) => setBookmarkCity(e.target.value)}
                placeholder="Enter city name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookmark-description">Description</Label>
              <Textarea
                id="bookmark-description"
                value={bookmarkDescription}
                onChange={(e) => setBookmarkDescription(e.target.value)}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookmarkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBookmark} disabled={!bookmarkName || !bookmarkCity}>
              Create Bookmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
