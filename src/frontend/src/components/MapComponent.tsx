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
  const { data: journeyScheduleItems = [] } = useGetScheduleItems(journeyCityFilter || '');
  
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

  // Handle bookmark marker click
  const handleBookmarkMarkerClick = useCallback((e: any, bookmark: MapBookmark) => {
    if (!mapRef.current) return;

    const mapRect = mapRef.current.getBoundingClientRect();
    const clickX = e.originalEvent.clientX - mapRect.left;
    const clickY = e.originalEvent.clientY - mapRect.top;

    setSelectedBookmark(bookmark);
    setBookmarkPopupPosition({ x: clickX, y: clickY });
    setShowBookmarkPopup(true);

    // Notify parent that bookmark was focused
    if (onBookmarkFocused) {
      onBookmarkFocused();
    }
  }, [onBookmarkFocused]);

  // Handle travel spot marker click
  const handleTravelSpotMarkerClick = useCallback((e: any, spot: TravelSpot) => {
    if (!mapRef.current) return;

    const mapRect = mapRef.current.getBoundingClientRect();
    const clickX = e.originalEvent.clientX - mapRect.left;
    const clickY = e.originalEvent.clientY - mapRect.top;

    setSelectedTravelSpot(spot);
    setTravelSpotPopupPosition({ x: clickX, y: clickY });
    setShowTravelSpotPopup(true);

    // Notify parent that travel spot was focused
    if (onTravelSpotFocused) {
      onTravelSpotFocused();
    }
  }, [onTravelSpotFocused]);

  // Handle schedule marker click
  const handleScheduleMarkerClick = useCallback((e: any, item: ScheduleItem) => {
    if (!mapRef.current) return;

    const mapRect = mapRef.current.getBoundingClientRect();
    const clickX = e.originalEvent.clientX - mapRect.left;
    const clickY = e.originalEvent.clientY - mapRect.top;

    setSelectedScheduleItem(item);
    setSchedulePopupPosition({ x: clickX, y: clickY });
    setShowSchedulePopup(true);
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
        setLeafletLoaded(true);
      };
      document.head.appendChild(script);
    } else if (window.L) {
      setLeafletLoaded(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = window.L.map(mapRef.current, {
      zoomControl: false,
    }).setView(coordinates, getInitialZoom());

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add click handler for bookmark creation
    map.on('click', handleMapClick);

    // Track zoom changes
    map.on('zoomend', () => {
      setZoom(map.getZoom());
    });

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
    if (!mapInstanceRef.current || !hasInitializedRef.current) return;

    const map = mapInstanceRef.current;
    const currentLocationKey = `${locationName}-${coordinates[0]}-${coordinates[1]}`;

    // Only update if this is a new search (different location)
    if (lastSearchLocationRef.current !== currentLocationKey) {
      lastSearchLocationRef.current = currentLocationKey;
      userHasInteractedRef.current = false;

      // Fly to new coordinates with zoom level 15
      map.flyTo(coordinates, 15, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [coordinates, locationName]);

  // Render schedule markers with day labels and route lines
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !journeyCityFilter) return;

    const map = mapInstanceRef.current;

    // Clear existing schedule markers
    globalMarkersRef.current = globalMarkersRef.current.filter(markerData => {
      if (markerData.type === 'Schedule') {
        map.removeLayer(markerData.marker);
        return false;
      }
      return true;
    });

    // Clear existing route layer
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    // Create a new layer group for routes
    const routeLayer = window.L.layerGroup().addTo(map);
    routeLayerRef.current = routeLayer;

    // Geocode and render schedule items
    const geocodeAndRenderSchedule = async () => {
      const geocodedItems: Array<[ScheduleItem, [number, number]]> = [];

      for (const item of journeyScheduleItems) {
        const coords = await geocodeLocation(item.location, journeyCityFilter);
        if (coords) {
          geocodedItems.push([item, coords]);
        } else {
          console.warn(`Failed to geocode schedule location: ${item.location}`);
        }
      }

      // Build route data grouped by day
      const dayRoutes = buildDayRoutes(geocodedItems);

      // Render markers for each schedule item
      geocodedItems.forEach(([item, coords]) => {
        const dayIndex = computeDayIndex(item, geocodedItems.map(([i]) => i));
        const dayLabel = getDayLabel(dayIndex);
        const dayColor = getDayColor(dayIndex);

        // Create custom marker with day label
        const scheduleIcon = window.L.divIcon({
          className: 'custom-schedule-marker',
          html: `
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
            ">
              <div style="
                padding: 4px 8px;
                background: ${dayColor};
                color: white;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              ">${dayLabel}</div>
              <div style="
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 8px solid ${dayColor};
              "></div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 32],
        });

        const marker = window.L.marker(coords, { icon: scheduleIcon }).addTo(map);
        marker.on('click', (e: any) => handleScheduleMarkerClick(e, item));

        globalMarkersRef.current.push({
          marker,
          type: 'Schedule',
          city: journeyCityFilter,
          name: item.location,
        });
      });

      // Draw route lines for each day
      dayRoutes.forEach(({ dayKey, coordinates: routeCoords, items }) => {
        if (routeCoords.length < 2) return;

        // Get day color from the first item in the route
        const firstItem = items[0][0];
        const dayIndex = computeDayIndex(firstItem, geocodedItems.map(([i]) => i));
        const dayColor = getDayColor(dayIndex);

        // Create polyline with day color
        const polyline = window.L.polyline(routeCoords, {
          color: dayColor,
          weight: 3,
          opacity: 0.7,
          smoothFactor: 1,
        }).addTo(routeLayer);
      });

      // Fit map to show all schedule markers
      if (geocodedItems.length > 0) {
        const bounds = window.L.latLngBounds(geocodedItems.map(([_, coords]) => coords));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    };

    geocodeAndRenderSchedule();

    // Cleanup on unmount or when journeyCityFilter changes
    return () => {
      if (routeLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
    };
  }, [journeyCityFilter, journeyScheduleItems, handleScheduleMarkerClick]);

  // Render travel spots
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const map = mapInstanceRef.current;
    const spotsToDisplay = layoutPreferences?.showAllTravelSpots ? allTravelSpots : travelSpots;

    // Clear existing travel spot markers
    globalMarkersRef.current = globalMarkersRef.current.filter(markerData => {
      if (markerData.type === 'TravelSpot') {
        map.removeLayer(markerData.marker);
        return false;
      }
      return true;
    });

    // Add travel spot markers
    spotsToDisplay.forEach(spot => {
      const iconUrl = getTravelSpotIcon(spot.spotType);
      const icon = window.L.icon({
        iconUrl,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = window.L.marker(spot.coordinates, { icon }).addTo(map);
      marker.on('click', (e: any) => handleTravelSpotMarkerClick(e, spot));

      globalMarkersRef.current.push({
        marker,
        type: 'TravelSpot',
        city: spot.city,
        name: spot.name,
      });
    });

    updateDashboard();
  }, [travelSpots, allTravelSpots, layoutPreferences, handleTravelSpotMarkerClick, updateDashboard]);

  // Render bookmarks
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const map = mapInstanceRef.current;

    // Clear existing bookmark markers
    globalMarkersRef.current = globalMarkersRef.current.filter(markerData => {
      if (markerData.type === 'Bookmark') {
        map.removeLayer(markerData.marker);
        return false;
      }
      return true;
    });

    // Add bookmark markers
    allBookmarks.forEach(bookmark => {
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

      const marker = window.L.marker(bookmark.coordinates, { icon: bookmarkIcon }).addTo(map);
      marker.on('click', (e: any) => handleBookmarkMarkerClick(e, bookmark));

      globalMarkersRef.current.push({
        marker,
        type: 'Bookmark',
        city: bookmark.city,
        name: bookmark.name,
        bookmarkData: bookmark,
      });
    });

    updateDashboard();
  }, [allBookmarks, handleBookmarkMarkerClick, updateDashboard]);

  // Focus on travel spot when prop changes
  useEffect(() => {
    if (!mapInstanceRef.current || !focusedTravelSpot) return;

    const map = mapInstanceRef.current;
    map.flyTo(focusedTravelSpot.coordinates, 16, {
      duration: 1,
    });

    // Simulate click on the marker
    const markerData = globalMarkersRef.current.find(
      m => m.type === 'TravelSpot' && m.name === focusedTravelSpot.name
    );
    if (markerData) {
      markerData.marker.fire('click');
    }
  }, [focusedTravelSpot]);

  // Focus on bookmark when prop changes
  useEffect(() => {
    if (!mapInstanceRef.current || !focusedBookmark) return;

    const map = mapInstanceRef.current;
    map.flyTo(focusedBookmark.coordinates, 16, {
      duration: 1,
    });

    // Simulate click on the marker
    const markerData = globalMarkersRef.current.find(
      m => m.type === 'Bookmark' && m.name === focusedBookmark.name
    );
    if (markerData) {
      markerData.marker.fire('click');
    }
  }, [focusedBookmark]);

  // Map controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
      userHasInteractedRef.current = true;
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
      userHasInteractedRef.current = true;
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(coordinates, getInitialZoom(), {
        duration: 1,
      });
      userHasInteractedRef.current = false;
    }
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomIn}
          className="bg-background/95 backdrop-blur-sm shadow-lg hover:bg-background"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomOut}
          className="bg-background/95 backdrop-blur-sm shadow-lg hover:bg-background"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleResetView}
          className="bg-background/95 backdrop-blur-sm shadow-lg hover:bg-background"
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
                <div className="flex items-center gap-2 mt-1">
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
            {(spotMediaLoading || spotSocialMediaLoading) ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MediaGalleryPopup
                mediaFiles={selectedSpotMediaFiles}
                socialMediaLinks={selectedSpotSocialMediaLinks}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule Popup */}
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
                <CardTitle className="text-lg">{selectedScheduleItem.location}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(Number(selectedScheduleItem.date) / 1_000_000).toLocaleDateString()} at {selectedScheduleItem.time}
                </p>
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
          <CardContent>
            <p className="text-sm">{selectedScheduleItem.activity}</p>
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
                <p className="text-sm text-muted-foreground mt-1">{selectedBookmark.city}</p>
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
          <CardContent>
            <p className="text-sm">{selectedBookmark.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Bookmark Creation Dialog */}
      <Dialog open={showBookmarkDialog} onOpenChange={setShowBookmarkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Bookmark</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bookmark-city">City</Label>
              <Input
                id="bookmark-city"
                value={bookmarkCity}
                onChange={(e) => setBookmarkCity(e.target.value)}
                placeholder="Enter city name"
              />
            </div>
            <div>
              <Label htmlFor="bookmark-name">Name</Label>
              <Input
                id="bookmark-name"
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                placeholder="Enter bookmark name"
              />
            </div>
            <div>
              <Label htmlFor="bookmark-description">Description</Label>
              <Textarea
                id="bookmark-description"
                value={bookmarkDescription}
                onChange={(e) => setBookmarkDescription(e.target.value)}
                placeholder="Enter description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookmarkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBookmark}
              disabled={!bookmarkCity || !bookmarkName || addBookmarkMutation.isPending}
            >
              {addBookmarkMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Bookmark'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
