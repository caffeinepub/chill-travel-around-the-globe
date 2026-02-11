import React, { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Journey, ScheduleItem } from '@/backend';
import { toast } from 'sonner';

interface TravelogueJourneyMapDialogProps {
  journey: Journey | null;
  scheduleItems: ScheduleItem[];
  isOpen: boolean;
  onClose: () => void;
  formatDate: (timestamp: bigint) => string;
  formatTime: (timeString: string) => string;
}

declare global {
  interface Window {
    L: any;
  }
}

interface GeocodedScheduleItem {
  item: ScheduleItem;
  lat: number;
  lon: number;
}

export default function TravelogueJourneyMapDialog({
  journey,
  scheduleItems,
  isOpen,
  onClose,
  formatDate,
  formatTime,
}: TravelogueJourneyMapDialogProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [geocodedItems, setGeocodedItems] = useState<GeocodedScheduleItem[]>([]);
  const [failedCount, setFailedCount] = useState(0);

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      if (window.L) {
        setLeafletLoaded(true);
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
          if (window.L) {
            // Fix for default markers
            delete (window.L.Icon.Default.prototype as any)._getIconUrl;
            window.L.Icon.Default.mergeOptions({
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
          }
          setLeafletLoaded(true);
        };

        script.onerror = () => {
          console.error('Failed to load Leaflet');
          toast.error('Failed to load map library');
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Leaflet:', error);
        toast.error('Failed to load map library');
      }
    };

    loadLeaflet();
  }, []);

  // Geocode a location string to coordinates
  const geocodeLocation = async (location: string): Promise<{ lat: number; lon: number } | null> => {
    if (!location || location.trim() === '') {
      return null;
    }

    try {
      const encodedQuery = encodeURIComponent(location.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1`,
        {
          headers: {
            'User-Agent': 'TravelogueMapExplorer/1.0',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        if (!isNaN(lat) && !isNaN(lon)) {
          return { lat, lon };
        }
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Geocode all schedule items
  useEffect(() => {
    if (!isOpen || !journey || scheduleItems.length === 0) {
      return;
    }

    const geocodeAllItems = async () => {
      setIsLoading(true);
      const results: GeocodedScheduleItem[] = [];
      let failed = 0;

      for (const item of scheduleItems) {
        if (!item.location || item.location.trim() === '') {
          failed++;
          continue;
        }

        // Add delay to respect Nominatim rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const coords = await geocodeLocation(item.location);
        if (coords) {
          results.push({
            item,
            lat: coords.lat,
            lon: coords.lon,
          });
        } else {
          failed++;
        }
      }

      setGeocodedItems(results);
      setFailedCount(failed);
      setIsLoading(false);

      if (failed > 0) {
        toast.error(`Could not locate ${failed} schedule item${failed > 1 ? 's' : ''} on the map`);
      }
    };

    geocodeAllItems();
  }, [isOpen, journey, scheduleItems]);

  // Initialize map and add markers
  useEffect(() => {
    if (!isOpen || !leafletLoaded || !mapRef.current || geocodedItems.length === 0 || isLoading) {
      return;
    }

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Clear existing markers
    markersRef.current = [];

    try {
      // Create map
      const map = window.L.map(mapRef.current, {
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Add tile layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Create custom schedule marker icon (distinct from travel spots/bookmarks)
      const scheduleIcon = window.L.divIcon({
        className: 'custom-schedule-marker',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            font-weight: bold;
            color: white;
            font-size: 14px;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Add markers for each geocoded schedule item
      geocodedItems.forEach((geocodedItem, index) => {
        const { item, lat, lon } = geocodedItem;

        const marker = window.L.marker([lat, lon], { icon: scheduleIcon }).addTo(map);

        // Create popup content
        const popupContent = `
          <div style="min-width: 200px; padding: 8px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #6366f1;">
              ${item.activity}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
              <strong>Date:</strong> ${formatDate(item.date)}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
              <strong>Time:</strong> ${formatTime(item.time)}
            </div>
            <div style="font-size: 12px; color: #64748b;">
              <strong>Location:</strong> ${item.location}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      });

      // Fit map to show all markers
      if (geocodedItems.length > 0) {
        const bounds = window.L.latLngBounds(
          geocodedItems.map((item) => [item.lat, item.lon])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Failed to initialize map');
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
    };
  }, [isOpen, leafletLoaded, geocodedItems, isLoading, formatDate, formatTime]);

  // Handle dialog close
  const handleClose = () => {
    // Clean up map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    markersRef.current = [];
    setGeocodedItems([]);
    setFailedCount(0);
    setIsLoading(true);
    onClose();
  };

  if (!journey) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] z-[3300]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapIcon className="h-5 w-5" />
            Journey Map: {journey.city}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[500px] bg-muted/20 rounded-lg">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Locating schedule items on map...</p>
              </div>
            </div>
          ) : geocodedItems.length === 0 ? (
            <div className="flex items-center justify-center h-[500px] bg-muted/20 rounded-lg">
              <div className="text-center space-y-2">
                <MapIcon className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />
                <p className="text-lg font-medium">No locations to display</p>
                <p className="text-sm text-muted-foreground">
                  Schedule items need valid location information to appear on the map
                </p>
              </div>
            </div>
          ) : (
            <>
              <div ref={mapRef} className="w-full h-[500px] rounded-lg border border-border" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {geocodedItems.length} schedule item{geocodedItems.length !== 1 ? 's' : ''} on map
                </span>
                {failedCount > 0 && (
                  <span className="text-destructive">
                    {failedCount} location{failedCount !== 1 ? 's' : ''} could not be found
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
