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

export default function MapComponent({ coordinates, locationName, locationType = 'location', focusedTravelSpot, focusedBookmark, onTravelSpotFocused, onBookmarkFocused }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const textMarkerRef = useRef<any>(null);
  const globalMarkersRef = useRef<MarkerData[]>([]); // Global marker array
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
              iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
              iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });
          }
          setLeafletLoaded(true);
          setIsLoading(false);
        };

        script.onerror = () => {
          setIsLoading(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
        setIsLoading(false);
      }
    };

    loadLeaflet();
  }, []);

  const handleTravelSpotPopupClose = useCallback(() => {
    setShowTravelSpotPopup(false);
    setTravelSpotPopupPosition(null);
    setSelectedTravelSpot(null);
  }, []);

  const handleSchedulePopupClose = useCallback(() => {
    setShowSchedulePopup(false);
    setSchedulePopupPosition(null);
    setSelectedScheduleItem(null);
  }, []);

  const handleBookmarkPopupClose = useCallback(() => {
    setShowBookmarkPopup(false);
    setBookmarkPopupPosition(null);
    setSelectedBookmark(null);
  }, []);

  // Create high-resolution heart SVG with partial fill support
  const createHeartSVG = (rating: number) => {
    const fillPercentage = Math.max(0, Math.min(100, (rating / 10) * 100));
    const gradientId = `heartGradient_${Math.random().toString(36).substr(2, 9)}`;
    
    return `
      <svg width="28" height="28" viewBox="0 0 24 24" style="flex-shrink: 0;">
        <defs>
          <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
            <stop offset="${fillPercentage}%" style="stop-color:#ef4444;stop-opacity:1" />
            <stop offset="${fillPercentage}%" style="stop-color:#d1d5db;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#d1d5db;stop-opacity:1" />
          </linearGradient>
        </defs>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
              fill="url(#${gradientId})" 
              stroke="${rating > 0 ? '#ef4444' : '#d1d5db'}" 
              stroke-width="1.5"/>
      </svg>
    `;
  };

  // Calculate travel spot popup position - now matching city popup size
  const calculateTravelSpotPopupPosition = useCallback((markerPixelPoint: any) => {
    if (!mapRef.current) return { x: markerPixelPoint.x, y: markerPixelPoint.y };

    const mapContainer = mapRef.current;
    const mapRect = mapContainer.getBoundingClientRect();
    const popupWidth = 800; // Matching city popup width
    const popupHeight = 600; // Matching city popup height
    const offset = 20;

    let popupX = markerPixelPoint.x + offset;
    let popupY = markerPixelPoint.y - (popupHeight / 2);

    if (popupX + popupWidth > mapRect.width) {
      popupX = markerPixelPoint.x - popupWidth - offset;
    }

    if (popupX < 0) {
      popupX = Math.max(10, mapRect.width - popupWidth - 10);
    }

    if (popupY < 10) {
      popupY = 10;
    } else if (popupY + popupHeight > mapRect.height - 10) {
      popupY = mapRect.height - popupHeight - 10;
    }

    return { x: popupX, y: popupY };
  }, []);

  // Calculate schedule popup position - matching other popups
  const calculateSchedulePopupPosition = useCallback((markerPixelPoint: any) => {
    if (!mapRef.current) return { x: markerPixelPoint.x, y: markerPixelPoint.y };

    const mapContainer = mapRef.current;
    const mapRect = mapContainer.getBoundingClientRect();
    const popupWidth = 800;
    const popupHeight = 600;
    const offset = 20;

    let popupX = markerPixelPoint.x + offset;
    let popupY = markerPixelPoint.y - (popupHeight / 2);

    if (popupX + popupWidth > mapRect.width) {
      popupX = markerPixelPoint.x - popupWidth - offset;
    }

    if (popupX < 0) {
      popupX = Math.max(10, mapRect.width - popupWidth - 10);
    }

    if (popupY < 10) {
      popupY = 10;
    } else if (popupY + popupHeight > mapRect.height - 10) {
      popupY = mapRect.height - popupHeight - 10;
    }

    return { x: popupX, y: popupY };
  }, []);

  // Calculate bookmark popup position - matching other popups
  const calculateBookmarkPopupPosition = useCallback((markerPixelPoint: any) => {
    if (!mapRef.current) return { x: markerPixelPoint.x, y: markerPixelPoint.y };

    const mapContainer = mapRef.current;
    const mapRect = mapContainer.getBoundingClientRect();
    const popupWidth = 800;
    const popupHeight = 600;
    const offset = 20;

    let popupX = markerPixelPoint.x + offset;
    let popupY = markerPixelPoint.y - (popupHeight / 2);

    if (popupX + popupWidth > mapRect.width) {
      popupX = markerPixelPoint.x - popupWidth - offset;
    }

    if (popupX < 0) {
      popupX = Math.max(10, mapRect.width - popupWidth - 10);
    }

    if (popupY < 10) {
      popupY = 10;
    } else if (popupY + popupHeight > mapRect.height - 10) {
      popupY = mapRect.height - popupHeight - 10;
    }

    return { x: popupX, y: popupY };
  }, []);

  // Handle travel spot marker click
  const handleTravelSpotMarkerClick = useCallback((e: any, spot: TravelSpot) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Stop event propagation to prevent map click
    e.originalEvent.stopPropagation();

    // Close other popups if open
    setShowSchedulePopup(false);
    setSchedulePopupPosition(null);
    setSelectedScheduleItem(null);
    setShowBookmarkPopup(false);
    setBookmarkPopupPosition(null);
    setSelectedBookmark(null);

    // Get the pixel position of the marker
    const markerLatLng = e.target.getLatLng();
    const pixelPoint = map.latLngToContainerPoint(markerLatLng);
    
    // Calculate popup position
    const position = calculateTravelSpotPopupPosition(pixelPoint);
    
    setSelectedTravelSpot(spot);
    setTravelSpotPopupPosition(position);
    setShowTravelSpotPopup(true);
  }, [calculateTravelSpotPopupPosition]);

  // Handle schedule marker click
  const handleScheduleMarkerClick = useCallback((e: any, item: ScheduleItem) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Stop event propagation to prevent map click
    e.originalEvent.stopPropagation();

    // Close other popups if open
    setShowTravelSpotPopup(false);
    setTravelSpotPopupPosition(null);
    setSelectedTravelSpot(null);
    setShowBookmarkPopup(false);
    setBookmarkPopupPosition(null);
    setSelectedBookmark(null);

    // Get the pixel position of the marker
    const markerLatLng = e.target.getLatLng();
    const pixelPoint = map.latLngToContainerPoint(markerLatLng);
    
    // Calculate popup position
    const position = calculateSchedulePopupPosition(pixelPoint);
    
    setSelectedScheduleItem(item);
    setSchedulePopupPosition(position);
    setShowSchedulePopup(true);
  }, [calculateSchedulePopupPosition]);

  // Handle bookmark marker click
  const handleBookmarkMarkerClick = useCallback((e: any, bookmark: MapBookmark) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Stop event propagation to prevent map click
    e.originalEvent.stopPropagation();

    // Close other popups if open
    setShowTravelSpotPopup(false);
    setTravelSpotPopupPosition(null);
    setSelectedTravelSpot(null);
    setShowSchedulePopup(false);
    setSchedulePopupPosition(null);
    setSelectedScheduleItem(null);

    // Get the pixel position of the marker
    const markerLatLng = e.target.getLatLng();
    const pixelPoint = map.latLngToContainerPoint(markerLatLng);
    
    // Calculate popup position
    const position = calculateBookmarkPopupPosition(pixelPoint);
    
    setSelectedBookmark(bookmark);
    setBookmarkPopupPosition(position);
    setShowBookmarkPopup(true);
  }, [calculateBookmarkPopupPosition]);

  // Handle focused travel spot from Citylogue panel
  useEffect(() => {
    if (focusedTravelSpot && mapInstanceRef.current && leafletLoaded) {
      const map = mapInstanceRef.current;
      
      // Find the marker for this travel spot
      const spotMarkerData = globalMarkersRef.current.find(markerData => 
        markerData.type === 'TravelSpot' &&
        markerData.name === focusedTravelSpot.name &&
        markerData.city === focusedTravelSpot.city
      );
      
      if (spotMarkerData) {
        // Focus the map on the travel spot with zoom level 15
        map.setView(spotMarkerData.marker.getLatLng(), 15, {
          animate: true,
          duration: 1,
        });
        
        // Open the travel spot popup after a short delay
        setTimeout(() => {
          const markerLatLng = spotMarkerData.marker.getLatLng();
          const pixelPoint = map.latLngToContainerPoint(markerLatLng);
          const position = calculateTravelSpotPopupPosition(pixelPoint);
          
          setSelectedTravelSpot(focusedTravelSpot);
          setTravelSpotPopupPosition(position);
          setShowTravelSpotPopup(true);
          
          // Close other popups
          setShowSchedulePopup(false);
          setSchedulePopupPosition(null);
          setSelectedScheduleItem(null);
          setShowBookmarkPopup(false);
          setBookmarkPopupPosition(null);
          setSelectedBookmark(null);
          
          // Notify parent that focusing is complete
          if (onTravelSpotFocused) {
            onTravelSpotFocused();
          }
        }, 500);
      }
    }
  }, [focusedTravelSpot, leafletLoaded, calculateTravelSpotPopupPosition, onTravelSpotFocused]);

  // Handle focused bookmark from Vibes panel
  useEffect(() => {
    if (focusedBookmark && mapInstanceRef.current && leafletLoaded) {
      const map = mapInstanceRef.current;
      
      // Find the marker for this bookmark
      const bookmarkMarkerData = globalMarkersRef.current.find(markerData => 
        markerData.type === 'Bookmark' &&
        markerData.name === focusedBookmark.name &&
        markerData.city === focusedBookmark.city
      );
      
      if (bookmarkMarkerData) {
        // Focus the map on the bookmark with zoom level 15
        map.setView(bookmarkMarkerData.marker.getLatLng(), 15, {
          animate: true,
          duration: 1,
        });
        
        // Open the bookmark popup after a short delay
        setTimeout(() => {
          const markerLatLng = bookmarkMarkerData.marker.getLatLng();
          const pixelPoint = map.latLngToContainerPoint(markerLatLng);
          const position = calculateBookmarkPopupPosition(pixelPoint);
          
          setSelectedBookmark(focusedBookmark);
          setBookmarkPopupPosition(position);
          setShowBookmarkPopup(true);
          
          // Close other popups
          setShowTravelSpotPopup(false);
          setTravelSpotPopupPosition(null);
          setSelectedTravelSpot(null);
          setShowSchedulePopup(false);
          setSchedulePopupPosition(null);
          setSelectedScheduleItem(null);
          
          // Notify parent that focusing is complete
          if (onBookmarkFocused) {
            onBookmarkFocused();
          }
        }, 500);
      }
    }
  }, [focusedBookmark, leafletLoaded, calculateBookmarkPopupPosition, onBookmarkFocused]);

  // Function to calculate fixed text size - always maintain zoom level 15 equivalent size
  const calculateFixedTextSize = useCallback((currentZoom: number) => {
    // Base size for zoom level 15
    const baseSize = 16;
    // Calculate scale factor to maintain visual size equivalent to zoom level 15
    // When current zoom is less than 15, we need to make text larger to maintain same visual size
    // When current zoom is greater than 15, we need to make text smaller to maintain same visual size
    const scaleFactor = Math.pow(2, 15 - currentZoom);
    return baseSize * scaleFactor;
  }, []);

  // Initialize map when Leaflet is loaded
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !window.L) return;

    const initialZoom = getInitialZoom();

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        minZoom: 1,
        maxZoom: 25,
      });

      // Add tile layer with unlimited zoom support
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        minZoom: 1,
        maxZoom: 25,
        tileSize: 256,
      }).addTo(mapInstanceRef.current);

      // Listen to zoom events to track user interaction and update text size
      mapInstanceRef.current.on('zoomend', () => {
        const currentZoom = mapInstanceRef.current.getZoom();
        setZoom(currentZoom);
        if (hasInitializedRef.current) {
          userHasInteractedRef.current = true;
        }
        
        // Update text marker size to maintain constant visual size equivalent to zoom level 15
        if (textMarkerRef.current) {
          const fixedSize = calculateFixedTextSize(currentZoom);
          const textElement = textMarkerRef.current.getElement();
          if (textElement) {
            const textDiv = textElement.querySelector('div > div');
            if (textDiv) {
              textDiv.style.fontSize = `${fixedSize}px`;
            }
          }
        }
      });

      // Listen to drag events to track user interaction
      mapInstanceRef.current.on('dragend', () => {
        if (hasInitializedRef.current) {
          userHasInteractedRef.current = true;
        }
      });

      // Listen to other user interactions
      mapInstanceRef.current.on('moveend', () => {
        if (hasInitializedRef.current) {
          userHasInteractedRef.current = true;
        }
        // Update popup positions if they're open
        if (showTravelSpotPopup && selectedTravelSpot) {
          // Find the travel spot marker and update its popup position
          const spotMarkerData = globalMarkersRef.current.find(markerData => 
            markerData.type === 'TravelSpot' &&
            markerData.name === selectedTravelSpot.name
          );
          if (spotMarkerData) {
            const markerLatLng = spotMarkerData.marker.getLatLng();
            const pixelPoint = mapInstanceRef.current.latLngToContainerPoint(markerLatLng);
            const position = calculateTravelSpotPopupPosition(pixelPoint);
            setTravelSpotPopupPosition(position);
          }
        }
        if (showSchedulePopup && selectedScheduleItem) {
          // Find the schedule marker and update its popup position
          const scheduleMarkerData = globalMarkersRef.current.find(markerData => 
            markerData.type === 'Schedule' &&
            markerData.marker.options.scheduleItem?.date === selectedScheduleItem.date &&
            markerData.marker.options.scheduleItem?.time === selectedScheduleItem.time
          );
          if (scheduleMarkerData) {
            const markerLatLng = scheduleMarkerData.marker.getLatLng();
            const pixelPoint = mapInstanceRef.current.latLngToContainerPoint(markerLatLng);
            const position = calculateSchedulePopupPosition(pixelPoint);
            setSchedulePopupPosition(position);
          }
        }
        if (showBookmarkPopup && selectedBookmark) {
          // Find the bookmark marker and update its popup position
          const bookmarkMarkerData = globalMarkersRef.current.find(markerData => 
            markerData.type === 'Bookmark' &&
            markerData.name === selectedBookmark.name
          );
          if (bookmarkMarkerData) {
            const markerLatLng = bookmarkMarkerData.marker.getLatLng();
            const pixelPoint = mapInstanceRef.current.latLngToContainerPoint(markerLatLng);
            const position = calculateBookmarkPopupPosition(pixelPoint);
            setBookmarkPopupPosition(position);
          }
        }
      });

      // Add click-to-bookmark functionality using Leaflet's map.on('click', ...) method
      mapInstanceRef.current.on('click', handleMapClick);
    }

    const map = mapInstanceRef.current;
    const [lat, lng] = coordinates;
    const currentZoom = map.getZoom();

    // Remove existing markers from global array (except bookmarks which should persist)
    globalMarkersRef.current.forEach(markerData => {
      if (markerData.type !== 'Bookmark') {
        map.removeLayer(markerData.marker);
      }
    });
    globalMarkersRef.current = globalMarkersRef.current.filter(markerData => markerData.type === 'Bookmark');

    // Remove text marker
    if (textMarkerRef.current) {
      map.removeLayer(textMarkerRef.current);
    }

    // Create fixed-size plain red text visualization for main search location
    const locationCoords = [lat, lng];
    const fixedTextSize = calculateFixedTextSize(currentZoom);
    
    // Create fixed-size plain red text marker positioned directly at the searched location coordinates
    // This text is non-interactive and maintains consistent size regardless of zoom level
    const textIcon = window.L.divIcon({
      className: 'custom-text-marker',
      html: `
        <div style="
          display: flex;
          align-items: center;
          user-select: none;
          position: relative;
          pointer-events: none;
        ">
          <div style="
            color: #dc2626;
            font-weight: 600;
            font-size: ${fixedTextSize}px;
            text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
            white-space: nowrap;
            position: relative;
            pointer-events: none;
          ">${locationName}</div>
        </div>
      `,
      iconSize: [0, 0], // Let the content determine the size
      iconAnchor: [0, 16], // Center the text on the coordinates
    });

    // Add text marker without click handler (non-interactive)
    textMarkerRef.current = window.L.marker(locationCoords, { icon: textIcon }).addTo(map);

    // Determine which travel spots to display based on user preference
    const showAllTravelSpots = layoutPreferences?.showAllTravelSpots !== false; // Default to true
    const spotsToDisplay = showAllTravelSpots ? allTravelSpots : travelSpots;

    // Add travel spot markers to global array
    if (spotsToDisplay.length > 0) {
      spotsToDisplay.forEach((spot) => {
        // Use the actual coordinates stored in the backend
        const [spotLat, spotLng] = spot.coordinates;
        
        // Skip spots with invalid coordinates (0,0 from migration)
        if (spotLat === 0 && spotLng === 0) {
          console.warn(`Travel spot "${spot.name}" has invalid coordinates (0,0), skipping marker placement`);
          return;
        }
        
        // Create custom icon for travel spot with the appropriate icon
        const spotIconPath = getTravelSpotIcon(spot.spotType.toString());
        const spotIcon = window.L.divIcon({
          className: 'custom-travel-spot-marker',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              height: 32px;
              background: white;
              border: 2px solid ${getTravelSpotColor(spot.spotType.toString())};
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              <img src="${spotIconPath}" alt="${spot.spotType}" style="
                width: 20px;
                height: 20px;
              " />
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        // Add marker for travel spot with click handler
        const spotMarker = window.L.marker([spotLat, spotLng], { 
          icon: spotIcon,
          travelSpot: spot // Store spot data in marker options
        }).addTo(map);
        
        spotMarker.on('click', (e: any) => handleTravelSpotMarkerClick(e, spot));
        
        // Store in global array with type "TravelSpot"
        globalMarkersRef.current.push({
          marker: spotMarker,
          type: 'TravelSpot',
          city: spot.city,
          name: spot.name,
        });
      });
    }

    // Add schedule item markers to global array
    if (scheduleItemsWithCoords.length > 0) {
      scheduleItemsWithCoords.forEach(([item, coords]) => {
        const [schedLat, schedLng] = coords;
        
        // Create airplane icon for schedule items
        const scheduleIcon = window.L.divIcon({
          className: 'custom-schedule-marker',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              background: white;
              border: 2px solid #3b82f6;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
              </svg>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        // Add marker for schedule item with click handler
        const scheduleMarker = window.L.marker([schedLat, schedLng], { 
          icon: scheduleIcon,
          scheduleItem: item // Store item data in marker options
        }).addTo(map);
        
        scheduleMarker.on('click', (e: any) => handleScheduleMarkerClick(e, item));
        
        // Store in global array with type "Schedule"
        globalMarkersRef.current.push({
          marker: scheduleMarker,
          type: 'Schedule',
          city: item.location,
          name: item.activity,
        });
      });
    }

    // Add bookmark markers to global array - load from backend
    if (allBookmarks.length > 0) {
      allBookmarks.forEach((bookmark) => {
        const [bookmarkLat, bookmarkLng] = bookmark.coordinates;
        
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
        const bookmarkMarker = window.L.marker([bookmarkLat, bookmarkLng], { 
          icon: bookmarkIcon,
          bookmark: bookmark // Store bookmark data in marker options
        }).addTo(map);

        // Add click handler to open bookmark popup
        bookmarkMarker.on('click', (e: any) => handleBookmarkMarkerClick(e, bookmark));

        // Store the marker in the global array with type "Bookmark"
        globalMarkersRef.current.push({
          marker: bookmarkMarker,
          type: 'Bookmark',
          city: bookmark.city,
          name: bookmark.name,
          bookmarkData: bookmark,
        });
      });
    }

    // Call updateDashboard after adding all markers
    updateDashboard();

    // Check if this is a new search (different location) or just an update to the same location
    const isNewSearch = lastSearchLocationRef.current !== locationName;
    
    // Handle map centering behavior - ALWAYS set zoom to 15 for every search result
    if (!hasInitializedRef.current || isNewSearch) {
      // Always center on the main location with zoom level 15, regardless of additional markers
      map.setView([lat, lng], 15, {
        animate: true,
        duration: 1,
      });
      
      setZoom(15);
      hasInitializedRef.current = true;
      lastSearchLocationRef.current = locationName;
      if (isNewSearch) {
        userHasInteractedRef.current = false;
        setShowTravelSpotPopup(false);
        setTravelSpotPopupPosition(null);
        setSelectedTravelSpot(null);
        setShowSchedulePopup(false);
        setSchedulePopupPosition(null);
        setSelectedScheduleItem(null);
        setShowBookmarkPopup(false);
        setBookmarkPopupPosition(null);
        setSelectedBookmark(null);
      }
    }

    return () => {
      if (textMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(textMarkerRef.current);
        textMarkerRef.current = null;
      }
    };
  }, [leafletLoaded, coordinates, locationName, locationType, cityAlbum, travelSpots, allTravelSpots, scheduleItemsWithCoords, allBookmarks, layoutPreferences, handleTravelSpotMarkerClick, handleScheduleMarkerClick, handleBookmarkMarkerClick, showTravelSpotPopup, showSchedulePopup, showBookmarkPopup, calculateTravelSpotPopupPosition, calculateSchedulePopupPosition, calculateBookmarkPopupPosition, selectedTravelSpot, selectedScheduleItem, selectedBookmark, calculateFixedTextSize, handleMapClick, updateDashboard]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

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

  const handleReset = () => {
    if (mapInstanceRef.current && coordinates) {
      // Always reset to zoom level 15 centered on the main search location
      mapInstanceRef.current.setView(coordinates, 15, {
        animate: true,
        duration: 1,
      });
      
      userHasInteractedRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading interactive map...</span>
        </div>
      </div>
    );
  }

  if (!leafletLoaded) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-destructive mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Map Loading Failed</h3>
          <p className="text-muted-foreground text-sm">
            Unable to load the interactive map. Please check your internet connection and try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  const hasRating = cityRating !== null && cityRating !== undefined && cityRating > 0;
  const displayRating = cityRating || 0;
  const hasMedia = cityAlbum && (cityAlbum.mediaFiles.length > 0 || cityAlbum.socialMediaLinks.length > 0);
  
  // Determine which travel spots to display based on user preference
  const showAllTravelSpots = layoutPreferences?.showAllTravelSpots !== false; // Default to true
  const spotsToDisplay = showAllTravelSpots ? allTravelSpots : travelSpots;
  const validTravelSpots = spotsToDisplay.filter(spot => !(spot.coordinates[0] === 0 && spot.coordinates[1] === 0));
  const hasTravelSpots = validTravelSpots.length > 0;
  
  const hasScheduleItems = scheduleItemsWithCoords.length > 0;
  const hasBookmarks = allBookmarks.length > 0;
  const isDataLoading = ratingLoading || albumLoading || spotsLoading || scheduleLoading || allSpotsLoading || bookmarksLoading;

  return (
    <div className="relative w-full h-full min-h-screen">
      <div 
        ref={mapRef} 
        className="w-full h-full absolute inset-0"
      />
      
      {/* Custom Zoom Controls - with transparency */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomIn}
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md hover:bg-white dark:hover:bg-slate-800 border-white/30 dark:border-slate-700/50 shadow-xl"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomOut}
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md hover:bg-white dark:hover:bg-slate-800 border-white/30 dark:border-slate-700/50 shadow-xl"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleReset}
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md hover:bg-white dark:hover:bg-slate-800 border-white/30 dark:border-slate-700/50 shadow-xl"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom Level Indicator - with transparency */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-1 rounded-md text-sm text-muted-foreground border border-white/30 dark:border-slate-700/50 shadow-lg">
          Zoom: {zoom}
        </div>
      </div>

      {/* Info Card for locations with Travel Album media, Travel Spots, Schedule Items, or Bookmarks - with transparency */}
      {(hasMedia || hasTravelSpots || hasScheduleItems || hasBookmarks) && (
        <div className="absolute bottom-4 left-4 z-[1000] max-w-sm">
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-white/30 dark:border-slate-700/50 shadow-xl">
            <CardContent className="p-4">
              <div className="space-y-3">
                {hasMedia && (
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Travel Album</span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-1">
                          {cityAlbum.mediaFiles.filter(f => f.mediaType === MediaType.image).length > 0 && (
                            <Image className="h-3 w-3" />
                          )}
                          {cityAlbum.mediaFiles.filter(f => f.mediaType === MediaType.video).length > 0 && (
                            <Video className="h-3 w-3" />
                          )}
                          {cityAlbum.mediaFiles.length + cityAlbum.socialMediaLinks.length}
                        </div>
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <div className="grid grid-cols-3 gap-1">
                        {cityAlbum.mediaFiles.slice(0, 3).map((mediaFile, index) => (
                          <div key={index} className="aspect-square bg-muted/50 rounded-md flex items-center justify-center">
                            {mediaFile.mediaType === MediaType.video ? (
                              <Video className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Image className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {hasTravelSpots && (
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        <span className="font-medium text-sm">Travel Spots</span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white/50 dark:bg-slate-800/50">
                        {validTravelSpots.length}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {validTravelSpots.slice(0, 2).map(spot => spot.name).join(', ')}
                      {validTravelSpots.length > 2 && ` +${validTravelSpots.length - 2} more`}
                    </div>
                  </div>
                )}

                {hasScheduleItems && (
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm">Schedule Items</span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white/50 dark:bg-slate-800/50">
                        {scheduleItemsWithCoords.length}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {scheduleItemsWithCoords.slice(0, 2).map(([item]) => item.activity).join(', ')}
                      {scheduleItemsWithCoords.length > 2 && ` +${scheduleItemsWithCoords.length - 2} more`}
                    </div>
                  </div>
                )}

                {hasBookmarks && (
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                        </svg>
                        <span className="font-medium text-sm">Bookmarks</span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white/50 dark:bg-slate-800/50">
                        {allBookmarks.length}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {allBookmarks.slice(0, 2).map(bookmark => bookmark.name).join(', ')}
                      {allBookmarks.length > 2 && ` +${allBookmarks.length - 2} more`}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Click anywhere on the map to add bookmarks
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bookmark Creation Dialog */}
      <Dialog open={showBookmarkDialog} onOpenChange={setShowBookmarkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
              Create Bookmark
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bookmark-city">City *</Label>
              <Input
                id="bookmark-city"
                value={bookmarkCity}
                onChange={(e) => setBookmarkCity(e.target.value)}
                placeholder="Enter city name"
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="bookmark-name">Name *</Label>
              <Input
                id="bookmark-name"
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                placeholder="Enter bookmark name"
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="bookmark-description">Description (optional)</Label>
              <Textarea
                id="bookmark-description"
                value={bookmarkDescription}
                onChange={(e) => setBookmarkDescription(e.target.value)}
                placeholder="Add a description for this bookmark"
                className="mt-1"
                rows={3}
              />
            </div>
            
            {bookmarkCoordinates && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                <div><strong>Latitude:</strong> {bookmarkCoordinates[0].toFixed(6)}°</div>
                <div><strong>Longitude:</strong> {bookmarkCoordinates[1].toFixed(6)}°</div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseBookmarkDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBookmark} 
              disabled={!bookmarkCity.trim() || !bookmarkName.trim() || addBookmarkMutation.isPending}
            >
              {addBookmarkMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bookmark
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* React-based Travel Spot Popup Overlay - now matching city popup size and with rating and social media */}
      {showTravelSpotPopup && travelSpotPopupPosition && selectedTravelSpot && (
        <div 
          className="absolute z-[2000] pointer-events-none"
          style={{
            left: travelSpotPopupPosition.x,
            top: travelSpotPopupPosition.y,
          }}
        >
          <div className="pointer-events-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-lg shadow-2xl border-2 border-orange-200 dark:border-orange-800/50 overflow-hidden min-w-[640px] max-w-[800px] relative">
            <div className="p-6 relative">
              <div className="mb-6 border-b border-gray-200 dark:border-slate-700 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 pr-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedTravelSpot.name}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className="text-sm border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 bg-white/50 dark:bg-slate-800/50"
                      style={{ 
                        backgroundColor: `${getTravelSpotColor(selectedTravelSpot.spotType.toString())}15`,
                        borderColor: getTravelSpotColor(selectedTravelSpot.spotType.toString())
                      }}
                    >
                      {selectedTravelSpot.spotType.toString()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Travel spot rating display */}
                    {selectedTravelSpot.rating > 0 ? (
                      <>
                        <div dangerouslySetInnerHTML={{ __html: createHeartSVG(selectedTravelSpot.rating) }} />
                        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300 min-w-[50px]">
                          {selectedTravelSpot.rating.toFixed(1)}/10
                        </span>
                      </>
                    ) : (
                      <>
                        <div dangerouslySetInnerHTML={{ __html: createHeartSVG(0) }} />
                        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300 min-w-[50px]">
                          -/10
                        </span>
                      </>
                    )}
                    <button 
                      onClick={handleTravelSpotPopupClose}
                      className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      title="Close popup"
                    >
                      <X size={18} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
              
              {selectedTravelSpot.description && (
                <div className="mb-6">
                  <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedTravelSpot.description}
                  </p>
                </div>
              )}

              {/* Travel Spot Media Gallery - now including social media links */}
              <div className="mb-6">
                {(spotMediaLoading || spotSocialMediaLoading) ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    <span className="ml-3 text-base text-gray-500 dark:text-gray-400">Loading media...</span>
                  </div>
                ) : (selectedSpotMediaFiles.length > 0 || selectedSpotSocialMediaLinks.length > 0) ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        <Image className="h-5 w-5 text-blue-500" />
                        <Video className="h-5 w-5 text-purple-500" />
                      </div>
                      <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                        Media Gallery ({selectedSpotMediaFiles.length + selectedSpotSocialMediaLinks.length})
                      </span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      <MediaGalleryPopup 
                        mediaFiles={selectedSpotMediaFiles} 
                        socialMediaLinks={selectedSpotSocialMediaLinks}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Image className="h-12 w-12 text-gray-400" />
                      <Video className="h-12 w-12 text-gray-400" />
                    </div>
                    <p className="text-base text-gray-600 dark:text-gray-300 mb-2">
                      No media files yet
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Upload photos, videos, and social media links in the admin panel
                    </p>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-400 border-t border-gray-200 dark:border-slate-700 pt-3">
                Travel Spot • Added {new Date(Number(selectedTravelSpot.createdAt) / 1000000).toLocaleDateString()}
              </div>
            </div>
            
            {/* Popup arrow pointing to the marker */}
            <div 
              className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full"
              style={{ 
                width: 0, 
                height: 0, 
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderRight: '12px solid rgba(255, 255, 255, 0.95)'
              }}
            />
          </div>
        </div>
      )}

      {/* React-based Schedule Item Popup Overlay */}
      {showSchedulePopup && schedulePopupPosition && selectedScheduleItem && (
        <div 
          className="absolute z-[2000] pointer-events-none"
          style={{
            left: schedulePopupPosition.x,
            top: schedulePopupPosition.y,
          }}
        >
          <div className="pointer-events-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-lg shadow-2xl border-2 border-blue-200 dark:border-blue-800/50 overflow-hidden min-w-[640px] max-w-[800px] relative">
            <div className="p-6 relative">
              <div className="mb-6 border-b border-gray-200 dark:border-slate-700 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 pr-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedScheduleItem.activity}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className="text-sm border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-white/50 dark:bg-slate-800/50"
                    >
                      Schedule Item
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-blue-500" />
                    <button 
                      onClick={handleSchedulePopupClose}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      title="Close popup"
                    >
                      <X size={18} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      {new Date(`2000-01-01T${selectedScheduleItem.time}`).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">
                      {new Date(Number(selectedScheduleItem.date) / 1000000).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {selectedScheduleItem.location && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <MapPin className="h-5 w-5" />
                    <span className="font-medium">{selectedScheduleItem.location}</span>
                  </div>
                )}

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Activity Details</h4>
                  <p className="text-blue-800 dark:text-blue-200">{selectedScheduleItem.activity}</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-400 border-t border-gray-200 dark:border-slate-700 pt-3 mt-6">
                Schedule Item • Added {new Date(Number(selectedScheduleItem.createdAt) / 1000000).toLocaleDateString()}
              </div>
            </div>
            
            {/* Popup arrow pointing to the marker */}
            <div 
              className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full"
              style={{ 
                width: 0, 
                height: 0, 
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderRight: '12px solid rgba(255, 255, 255, 0.95)'
              }}
            />
          </div>
        </div>
      )}

      {/* React-based Bookmark Popup Overlay */}
      {showBookmarkPopup && bookmarkPopupPosition && selectedBookmark && (
        <div 
          className="absolute z-[2000] pointer-events-none"
          style={{
            left: bookmarkPopupPosition.x,
            top: bookmarkPopupPosition.y,
          }}
        >
          <div className="pointer-events-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-lg shadow-2xl border-2 border-yellow-200 dark:border-yellow-800/50 overflow-hidden min-w-[640px] max-w-[800px] relative">
            <div className="p-6 relative">
              <div className="mb-6 border-b border-gray-200 dark:border-slate-700 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 pr-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedBookmark.name}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className="text-sm border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 bg-white/50 dark:bg-slate-800/50"
                    >
                      Bookmark
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                    </svg>
                    <button 
                      onClick={handleBookmarkPopupClose}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      title="Close popup"
                    >
                      <X size={18} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {selectedBookmark.city && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <MapPin className="h-5 w-5" />
                    <span className="font-medium">{selectedBookmark.city}</span>
                  </div>
                )}

                {selectedBookmark.description && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-yellow-900 dark:text-yellow-100">{selectedBookmark.description}</p>
                  </div>
                )}

                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  <div><strong>Latitude:</strong> {selectedBookmark.coordinates[0].toFixed(6)}°</div>
                  <div><strong>Longitude:</strong> {selectedBookmark.coordinates[1].toFixed(6)}°</div>
                </div>
              </div>
              
              <div className="text-sm text-gray-400 border-t border-gray-200 dark:border-slate-700 pt-3 mt-6">
                Bookmark • Created {new Date(Number(selectedBookmark.createdAt) / 1000000).toLocaleDateString()}
              </div>
            </div>
            
            {/* Popup arrow pointing to the marker */}
            <div 
              className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full"
              style={{ 
                width: 0, 
                height: 0, 
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderRight: '12px solid rgba(255, 255, 255, 0.95)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

