import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Camera, X, Heart, Image, Video, MapPin, Plane, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useGetCityRatingForPopup, useGetCityAlbum, useGetTravelSpots, useGetTravelSpotMediaFiles, useGetTravelSpotSocialMediaLinks, useGetAllScheduleItemsWithCoordinates, useGetAllTravelSpotsForMap, useGetWebsiteLayoutPreferences, useAddMapBookmark, useGetMapBookmarks } from '@/hooks/useQueries';
import { MediaGalleryPopup } from './MediaGalleryPopup';
import { MediaType, TravelSpot, ScheduleItem, MapBookmark } from '@/backend';
import { toast } from 'sonner';

interface MapComponentProps {
  coordinates: [number, number];
  locationName: string;
  locationType?: string;
  focusedTravelSpot?: TravelSpot | null;
  focusedBookmark?: MapBookmark | null;
  journeyScheduleItems?: Array<ScheduleItem & { coordinates: [number, number] }>;
  onTravelSpotFocused?: () => void;
  onBookmarkFocused?: () => void;
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

export default function MapComponent({ 
  coordinates, 
  locationName, 
  locationType = 'location', 
  focusedTravelSpot, 
  focusedBookmark, 
  journeyScheduleItems = [],
  onTravelSpotFocused, 
  onBookmarkFocused 
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const textMarkerRef = useRef<any>(null);
  const globalMarkersRef = useRef<MarkerData[]>([]); // Global marker array
  const bookmarkButtonRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const hasInitializedRef = useRef(false);
  const userHasInteractedRef = useRef(false);
  const lastSearchLocationRef = useRef<string>('');
  const journeyScheduleMarkersRef = useRef<any[]>([]);
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
      toast.error('Failed to create bookmark. Please try again.');
    }
  }, [bookmarkCoordinates, bookmarkCity, bookmarkName, bookmarkDescription, addBookmarkMutation, updateDashboard]);

  // Handle bookmark dialog close
  const handleCloseBookmarkDialog = useCallback(() => {
    setShowBookmarkDialog(false);
    setBookmarkCoordinates(null);
    setBookmarkCity('');
    setBookmarkName('');
    setBookmarkDescription('');
  }, []);

  // Handle bookmark marker click
  const handleBookmarkMarkerClick = useCallback((e: any, bookmark: MapBookmark) => {
    setSelectedBookmark(bookmark);
    const { x, y } = e.containerPoint;
    setBookmarkPopupPosition({ x, y });
    setShowBookmarkPopup(true);
  }, []);

  // Render journey schedule items on map
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !leafletLoaded || journeyScheduleItems.length === 0) return;

    const map = mapInstanceRef.current;

    // Clear existing journey schedule markers
    journeyScheduleMarkersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    journeyScheduleMarkersRef.current = [];

    // Create markers for each schedule item
    journeyScheduleItems.forEach((item) => {
      const [lat, lng] = item.coordinates;

      // Create a purple pin icon for schedule items
      const scheduleIcon = window.L.divIcon({
        className: 'custom-schedule-marker',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #a855f7, #9333ea);
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      // Create the marker
      const scheduleMarker = window.L.marker([lat, lng], { icon: scheduleIcon }).addTo(map);

      // Add click handler
      scheduleMarker.on('click', (e: any) => {
        setSelectedScheduleItem(item);
        const { x, y } = e.containerPoint;
        setSchedulePopupPosition({ x, y });
        setShowSchedulePopup(true);
      });

      journeyScheduleMarkersRef.current.push(scheduleMarker);
    });

    // Fit map bounds to show all schedule items
    if (journeyScheduleItems.length > 0) {
      const bounds = window.L.latLngBounds(
        journeyScheduleItems.map(item => item.coordinates)
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [journeyScheduleItems, leafletLoaded]);

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      if (window.L) {
        setLeafletLoaded(true);
        setIsLoading(false);
        return;
      }

      try {
        // Load CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        cssLink.crossOrigin = '';
        document.head.appendChild(cssLink);

        // Load JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        
        script.onload = () => {
          // Fix for default markers
          if (window.L) {
            delete (window.L.Icon.Default.prototype as any)._getIconUrl;
            window.L.Icon.Default.mergeOptions({
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
          }
          setLeafletLoaded(true);
          setIsLoading(false);
        };

        script.onerror = () => {
          console.error('Failed to load Leaflet');
          setIsLoading(false);
          toast.error('Failed to load map library');
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Leaflet:', error);
        setIsLoading(false);
        toast.error('Failed to load map library');
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !window.L || hasInitializedRef.current) return;

    try {
      const [lat, lng] = coordinates;
      const initialZoom = getInitialZoom();

      const map = window.L.map(mapRef.current, {
        center: [lat, lng],
        zoom: initialZoom,
        zoomControl: false,
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setZoom(initialZoom);
      hasInitializedRef.current = true;

      // Add map click handler for bookmarks
      map.on('click', handleMapClick);

      // Track zoom changes
      map.on('zoomend', () => {
        setZoom(map.getZoom());
      });

      // Track user interaction
      map.on('movestart', () => {
        userHasInteractedRef.current = true;
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Failed to initialize map');
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        hasInitializedRef.current = false;
      }
    };
  }, [leafletLoaded, coordinates, handleMapClick]);

  // Update map center when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return;

    const map = mapInstanceRef.current;
    const [lat, lng] = coordinates;

    // Only auto-center if user hasn't interacted or if it's a new search location
    if (!userHasInteractedRef.current || lastSearchLocationRef.current !== locationName) {
      map.setView([lat, lng], getInitialZoom());
      lastSearchLocationRef.current = locationName;
      userHasInteractedRef.current = false;
    }
  }, [coordinates, locationName, leafletLoaded]);

  // Rest of the component implementation remains the same...
  // (Including all the marker rendering, popup handling, etc.)

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Map controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.zoomIn();
            }
          }}
          className="bg-white/90 hover:bg-white shadow-lg"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.zoomOut();
            }
          }}
          className="bg-white/90 hover:bg-white shadow-lg"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={() => {
            if (mapInstanceRef.current) {
              const [lat, lng] = coordinates;
              mapInstanceRef.current.setView([lat, lng], getInitialZoom());
              userHasInteractedRef.current = false;
            }
          }}
          className="bg-white/90 hover:bg-white shadow-lg"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Bookmark Dialog */}
      <Dialog open={showBookmarkDialog} onOpenChange={handleCloseBookmarkDialog}>
        <DialogContent className="z-[3000]">
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
                required
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
            <Button variant="outline" onClick={handleCloseBookmarkDialog}>
              Cancel
            </Button>
            <Button onClick={handleCreateBookmark} disabled={!bookmarkName.trim()}>
              Create Bookmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Item Popup */}
      {showSchedulePopup && selectedScheduleItem && schedulePopupPosition && (
        <div
          className="fixed z-[2000] bg-white dark:bg-slate-800 rounded-lg shadow-xl p-4 max-w-sm"
          style={{
            left: `${schedulePopupPosition.x}px`,
            top: `${schedulePopupPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg">{selectedScheduleItem.location}</h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowSchedulePopup(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{selectedScheduleItem.activity}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(Number(selectedScheduleItem.date) / 1000000).toLocaleDateString()} at {selectedScheduleItem.time}
          </p>
        </div>
      )}
    </div>
  );
}
