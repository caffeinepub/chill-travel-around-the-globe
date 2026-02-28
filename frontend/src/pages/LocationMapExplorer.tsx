import { useState, useCallback, useEffect } from 'react';
import { MapPin, Globe, Building, Map, Building2, Earth, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import MapComponent from '@/components/MapComponent';
import InteractiveGlobe from '@/components/InteractiveGlobe';
import AdminPanel from '@/components/AdminPanel';
import TraveloguePanel from '@/components/TraveloguePanel';
import VibesPanel from '@/components/VibesPanel';
import LoginPanel from '@/components/LoginPanel';
import MusicPlayerBar from '@/components/MusicPlayerBar';
import MusicPanel from '@/components/MusicPanel';
import WebsiteLayoutPanel from '@/components/WebsiteLayoutPanel';
import { useSearchLocation, SUPPORTED_COUNTRIES, useGetWebsiteLayoutPreferences } from '@/hooks/useQueries';
import { TravelSpot, Song, MapBookmark } from '@/backend';

interface LocationResult {
  coordinates: [number, number];
  name: string;
  searchQuery: string;
  type: 'country' | 'city' | 'town' | 'village';
  country?: string;
  state?: string;
}

interface FlightAnimationData {
  fromCity: string;
  toCity: string;
  fromCoords: { lat: number; lon: number };
  toCoords: { lat: number; lon: number };
}

export default function LocationMapExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [focusedTravelSpot, setFocusedTravelSpot] = useState<TravelSpot | null>(null);
  const [focusedBookmark, setFocusedBookmark] = useState<MapBookmark | null>(null);
  const [currentSong, setCurrentSong] = useState<Song & { albumTitle: string } | undefined>(undefined);
  const [showTimeZones, setShowTimeZones] = useState(false);
  const [worldHotspotOpen, setWorldHotspotOpen] = useState(false);
  const [worldControlsOpen, setWorldControlsOpen] = useState(false);
  const [showCapitals, setShowCapitals] = useState(true);
  const [showGlobalCities, setShowGlobalCities] = useState(true);
  const [showMajorCities, setShowMajorCities] = useState(true);
  const [showTerminator, setShowTerminator] = useState(true);
  const [showTwilight, setShowTwilight] = useState(true);
  const [activeOffsetIndex, setActiveOffsetIndex] = useState<number>(14);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0.0005);
  const [countryFontSize, setCountryFontSize] = useState<number>(8);
  const [flightAnimation, setFlightAnimation] = useState<FlightAnimationData | null>(null);
  // selectedJourneyId stores journey.title (the unique schedule key) for the 2D map filter
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const { mutate: searchLocation, isPending } = useSearchLocation();
  const { data: layoutPreferences } = useGetWebsiteLayoutPreferences();

  const offsets = [-12, -11, -10, -9.5, -9, -8, -7, -6, -5, -4, -3.5, -3, -2, -1, 0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 8.75, 9, 9.5, 10, 10.5, 11, 12, 12.75, 13, 14];

  // Live clock update effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format a Date object as "Month DD, YYYY at HH:MM AM/PM (UTC ±X)"
  const formatTimeWithOffset = (date: Date, offsetHoursDecimal: number): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);

    // Format the offset label
    const offsetSign = offsetHoursDecimal >= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetHoursDecimal);
    const offsetWholeHours = Math.floor(absOffset);
    const offsetMinsPart = Math.round((absOffset - offsetWholeHours) * 60);
    const offsetStr = offsetMinsPart > 0
      ? `${offsetSign}${offsetWholeHours}:${offsetMinsPart < 10 ? '0' + offsetMinsPart : offsetMinsPart}`
      : `${offsetSign}${offsetWholeHours}`;

    return `${month} ${day}, ${year} at ${hours}:${minutesStr} ${ampm} (UTC ${offsetStr})`;
  };

  // Format local time with UTC offset
  const formatLocalTime = (): string => {
    const localOffsetMinutes = -currentTime.getTimezoneOffset();
    const localOffsetHours = localOffsetMinutes / 60;
    return formatTimeWithOffset(currentTime, localOffsetHours);
  };

  // Format UTC offset time based on selected offset
  const formatUtcOffsetTime = (): string => {
    const selectedOffset = offsets[activeOffsetIndex]; // in decimal hours
    const localOffsetMinutes = -currentTime.getTimezoneOffset(); // local offset in minutes
    const selectedOffsetMinutes = selectedOffset * 60; // selected offset in minutes

    // Difference in milliseconds between selected offset and local offset
    const diffMs = (selectedOffsetMinutes - localOffsetMinutes) * 60 * 1000;

    // Adjusted time
    const adjustedTime = new Date(currentTime.getTime() + diffMs);

    return formatTimeWithOffset(adjustedTime, selectedOffset);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a location name');
      return;
    }

    const query = searchQuery.trim();
    performSearch(query);
  };

  const performSearch = (query: string) => {
    searchLocation(query, {
      onSuccess: (result) => {
        if (result) {
          setSelectedLocation(result);
          // Switch to 2D mode when search is successful
          setViewMode('2D');
          // Clear focused travel spot and bookmark when performing new search
          setFocusedTravelSpot(null);
          setFocusedBookmark(null);
          const locationDisplay = result.country && result.name !== result.country 
            ? `${result.name}, ${result.country}`
            : result.name;
          toast.success(`Found ${locationDisplay}!`);
        } else {
          // Provide helpful feedback for unsupported locations
          const suggestions = SUPPORTED_COUNTRIES
            .filter(country => 
              country.toLowerCase().includes(query.toLowerCase()) ||
              query.toLowerCase().includes(country.toLowerCase())
            )
            .slice(0, 3);
          
          if (suggestions.length > 0) {
            toast.error(`"${query}" not found. Did you mean: ${suggestions.join(', ')}?`);
          } else {
            toast.error(`"${query}" not found. Try searching for countries, cities, or towns.`);
          }
        }
      },
      onError: (error) => {
        console.error('Search error:', error);
        toast.error('Failed to search for location. Please try again.');
      }
    });
  };

  const handleViewModeChange = (value: string) => {
    if (value && (value === '3D' || value === '2D')) {
      setViewMode(value);
      
      // When 2D button is clicked, automatically search for the user's configured default search place
      if (value === '2D') {
        const defaultSearchPlace = layoutPreferences?.defaultSearchPlace || 'Hong Kong';
        setSearchQuery(defaultSearchPlace);
        performSearch(defaultSearchPlace);
        // Clear journey context when manually switching to 2D
        setSelectedJourneyId(undefined);
      }
    }
  };

  // Handler for city button - toggles the World Travel Hotspot panel
  const handleCityButtonClick = () => {
    setWorldHotspotOpen(prev => !prev);
  };

  // Handler for Show Time Zones button
  const handleShowTimeZonesClick = () => {
    setShowTimeZones(prev => !prev);
    toast.info(showTimeZones ? 'Time zones hidden' : 'Time zones shown');
  };

  // Handler for World button - toggles the World Controls panel
  const handleWorldButtonClick = () => {
    setWorldControlsOpen(prev => !prev);
  };

  // Handle travel spot focus from Vibes panel
  const handleTravelSpotFocus = useCallback((spot: TravelSpot) => {
    // First, search for the city to ensure we're in the right location
    performSearch(spot.city);
    
    // Set the focused travel spot
    setFocusedTravelSpot(spot);
    
    // Clear focused bookmark and journey context
    setFocusedBookmark(null);
    setSelectedJourneyId(undefined);
  }, []);

  // Handle bookmark focus from Vibes panel
  const handleBookmarkFocus = useCallback((bookmark: MapBookmark) => {
    // First, search for the city to ensure we're in the right location
    performSearch(bookmark.city);
    
    // Set the focused bookmark
    setFocusedBookmark(bookmark);
    
    // Clear focused travel spot and journey context
    setFocusedTravelSpot(null);
    setSelectedJourneyId(undefined);
  }, []);

  // Handle song selection from music panel
  const handleSongSelect = useCallback((song: Song & { albumTitle: string }) => {
    setCurrentSong(song);
  }, []);

  // Handle flight animation trigger from Travelogue panel
  const handleFlightAnimation = useCallback((fromCity: string, toCity: string, fromCoords: { lat: number; lon: number }, toCoords: { lat: number; lon: number }) => {
    setFlightAnimation({ fromCity, toCity, fromCoords, toCoords });
    // Switch to 3D mode to show the animation
    setViewMode('3D');
    toast.info(`Flying from ${fromCity} to ${toCity}...`);
  }, []);

  // Handle 2D Map button click from Travelogue panel.
  // journeyId is journey.title — the unique schedule storage key.
  // We search for the journey's city name to center the map, but pass the
  // title as journeyId so the correct schedule markers are shown.
  const handleJourney2DMap = useCallback((journeyId: string) => {
    // Switch to 2D mode
    setViewMode('2D');
    
    // Store the journey title as the schedule filter key
    setSelectedJourneyId(journeyId);
    
    // Search for the journey id (title) to center the map on the city
    setSearchQuery(journeyId);
    performSearch(journeyId);
    
    // Clear focused travel spot and bookmark
    setFocusedTravelSpot(null);
    setFocusedBookmark(null);
    
    toast.info(`Showing 2D map for ${journeyId}`);
  }, []);

  const shouldShowGlobe = viewMode === '3D';
  const shouldShowMap = viewMode === '2D' && selectedLocation;

  // Apply bright-background class to document root when showing map
  useEffect(() => {
    if (shouldShowMap) {
      document.documentElement.classList.add('bright-background-mode');
    } else {
      document.documentElement.classList.remove('bright-background-mode');
    }
    
    return () => {
      document.documentElement.classList.remove('bright-background-mode');
    };
  }, [shouldShowMap]);

  // Close World Travel Hotspot panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (worldHotspotOpen) {
        const target = event.target as HTMLElement;
        const cityButton = document.getElementById('city-button');
        const hotspotPanel = document.getElementById('world-hotspot-panel');
        
        if (cityButton && hotspotPanel && 
            !cityButton.contains(target) && 
            !hotspotPanel.contains(target)) {
          setWorldHotspotOpen(false);
        }
      }
    };

    if (worldHotspotOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [worldHotspotOpen]);

  // Close UTC Offset panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTimeZones) {
        const target = event.target as HTMLElement;
        const timeZonesButton = document.getElementById('show-time-zones-button');
        const utcOffsetPanel = document.getElementById('utc-offset-panel');
        
        if (timeZonesButton && utcOffsetPanel && 
            !timeZonesButton.contains(target) && 
            !utcOffsetPanel.contains(target)) {
          setShowTimeZones(false);
        }
      }
    };

    if (showTimeZones) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimeZones]);

  // Close World Controls panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (worldControlsOpen) {
        const target = event.target as HTMLElement;
        const worldButton = document.getElementById('world-button');
        const worldPanel = document.getElementById('world-controls-panel');
        
        if (worldButton && worldPanel && 
            !worldButton.contains(target) && 
            !worldPanel.contains(target)) {
          setWorldControlsOpen(false);
        }
      }
    };

    if (worldControlsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [worldControlsOpen]);

  const formatUtcOffsetLabel = (offset: number): string => {
    if (offset === 0) return '0';
    return offset > 0 ? `+${offset}` : `${offset}`;
  };

  return (
    <TooltipProvider>
      {/* Full-screen background container with 3D globe or 2D map */}
      <div className="fixed inset-0 z-0">
        {shouldShowGlobe ? (
          <InteractiveGlobe 
            showTimeZones={showTimeZones}
            showCapitals={showCapitals}
            showGlobalCities={showGlobalCities}
            showMajorCities={showMajorCities}
            showTerminator={showTerminator}
            showTwilight={showTwilight}
            onTerminatorChange={setShowTerminator}
            onTwilightChange={setShowTwilight}
            activeOffsetIndex={activeOffsetIndex}
            onOffsetChange={setActiveOffsetIndex}
            rotationSpeed={rotationSpeed}
            countryFontSize={countryFontSize}
            flightAnimation={flightAnimation}
            onFlightAnimationComplete={() => setFlightAnimation(null)}
          />
        ) : shouldShowMap ? (
          <MapComponent 
            coordinates={selectedLocation.coordinates} 
            locationName={selectedLocation.searchQuery}
            locationType={selectedLocation.type}
            focusedTravelSpot={focusedTravelSpot}
            focusedBookmark={focusedBookmark}
            onTravelSpotFocused={() => setFocusedTravelSpot(null)}
            onBookmarkFocused={() => setFocusedBookmark(null)}
            journeyId={selectedJourneyId}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <div className="text-center max-w-md mx-auto px-4">
              <Map className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">2D Map View</h3>
              <p className="text-muted-foreground text-sm">
                Search for a location above to view it on the interactive map, or switch to 3D mode to explore the globe.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* UI Container - Transparent overlay with pointer-events: none */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <div className="min-h-screen flex flex-col">
          {/* Panel Icon Buttons Only - positioned absolutely with pointer-events: auto - INCREASED Z-INDEX */}
          <div className="absolute top-4 right-4 z-[10003] pointer-events-auto">
            <div className="flex flex-col items-end gap-2">
              {/* Menu Panel - Icon Only */}
              <AdminPanel />
              
              {/* Travelogue Panel - Icon Only */}
              <TraveloguePanel 
                onFlightAnimation={handleFlightAnimation}
                onJourney2DMap={handleJourney2DMap}
              />

              {/* Vibes Panel - Icon Only */}
              <VibesPanel onTravelSpotFocus={handleTravelSpotFocus} onBookmarkFocus={handleBookmarkFocus} />

              {/* Music Panel - Icon Only */}
              <MusicPanel onSongSelect={handleSongSelect} currentlyPlayingSong={currentSong} />

              {/* Website Layout Panel - Icon Only */}
              <WebsiteLayoutPanel />

              {/* Authentication Panel - Icon Only - positioned right below Website Layout */}
              <LoginPanel />
            </div>
          </div>

          {/* Three buttons positioned vertically at upper left corner - aligned with search bar at top-4 - INCREASED Z-INDEX */}
          <div className="absolute top-4 left-4 z-[10003] pointer-events-auto">
            <div className="flex flex-col gap-2">
              <Button 
                id="city-button"
                type="button"
                onClick={handleCityButtonClick}
                disabled={isPending}
                className="bg-primary/90 hover:bg-primary backdrop-blur-sm h-10 w-10 p-0 relative z-[10003]"
                aria-label="World Travel Hotspot"
              >
                <Building2 className="h-4 w-4" />
              </Button>
              
              <Button 
                id="show-time-zones-button"
                type="button"
                onClick={handleShowTimeZonesClick}
                disabled={isPending}
                className="bg-primary/90 hover:bg-primary backdrop-blur-sm h-10 w-10 p-0 relative z-[10003]"
                aria-label="Show Time Zones"
              >
                <Clock className="h-4 w-4" />
              </Button>
              
              <Button 
                id="world-button"
                type="button"
                onClick={handleWorldButtonClick}
                disabled={isPending}
                className="bg-primary/90 hover:bg-primary backdrop-blur-sm h-10 w-10 p-0 relative z-[10003]"
                aria-label="World Controls"
              >
                <Earth className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search bar - centered at top */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[10003] pointer-events-auto w-[37.5%]">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search location..."
                  className="pl-9 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/50 dark:border-slate-700/50 shadow-lg"
                />
              </div>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-lg"
              >
                {isPending ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </div>

          {/* 2D/3D Toggle - positioned below search bar */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[10003] pointer-events-auto">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={handleViewModeChange}
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/50 dark:border-slate-700/50 p-1"
            >
              <ToggleGroupItem value="3D" className="text-xs px-3 py-1.5">
                <Globe className="h-3 w-3 mr-1" />
                3D
              </ToggleGroupItem>
              <ToggleGroupItem value="2D" className="text-xs px-3 py-1.5">
                <Map className="h-3 w-3 mr-1" />
                2D
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* World Travel Hotspot Panel */}
          {worldHotspotOpen && (
            <div
              id="world-hotspot-panel"
              className="absolute top-16 left-4 z-[10002] pointer-events-auto"
            >
              <Card className="w-72 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-xl border border-white/50 dark:border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    World Travel Hotspots
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { name: 'Tokyo', country: 'Japan' },
                    { name: 'Paris', country: 'France' },
                    { name: 'New York', country: 'USA' },
                    { name: 'London', country: 'UK' },
                    { name: 'Dubai', country: 'UAE' },
                    { name: 'Singapore', country: 'Singapore' },
                    { name: 'Sydney', country: 'Australia' },
                    { name: 'Barcelona', country: 'Spain' },
                  ].map((city) => (
                    <button
                      key={city.name}
                      onClick={() => {
                        setSearchQuery(city.name);
                        performSearch(city.name);
                        setWorldHotspotOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{city.name}</span>
                      <span className="text-muted-foreground text-xs">{city.country}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* UTC Offset / Time Zone Panel */}
          {showTimeZones && (
            <div
              id="utc-offset-panel"
              className="absolute top-16 left-16 z-[10002] pointer-events-auto"
            >
              <Card className="w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-xl border border-white/50 dark:border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Local Time</p>
                    <p className="text-xs font-mono">{formatLocalTime()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">UTC Offset Time</p>
                    <p className="text-xs font-mono">{formatUtcOffsetTime()}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      UTC {formatUtcOffsetLabel(offsets[activeOffsetIndex])}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {offsets.map((offset, index) => (
                        <button
                          key={offset}
                          onClick={() => setActiveOffsetIndex(index)}
                          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                            activeOffsetIndex === index
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {formatUtcOffsetLabel(offset)}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* World Controls Panel */}
          {worldControlsOpen && (
            <div
              id="world-controls-panel"
              className="absolute top-16 left-28 z-[10002] pointer-events-auto"
            >
              <Card className="w-72 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-xl border border-white/50 dark:border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Earth className="h-4 w-4" />
                    Globe Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">City Labels</p>
                    <div className="space-y-1">
                      {[
                        { label: 'Capitals', value: showCapitals, setter: setShowCapitals },
                        { label: 'Global Cities', value: showGlobalCities, setter: setShowGlobalCities },
                        { label: 'Major Cities', value: showMajorCities, setter: setShowMajorCities },
                      ].map(({ label, value, setter }) => (
                        <label key={label} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setter(e.target.checked)}
                            className="rounded"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Atmosphere</p>
                    <div className="space-y-1">
                      {[
                        { label: 'Day/Night Terminator', value: showTerminator, setter: setShowTerminator },
                        { label: 'Twilight Zone', value: showTwilight, setter: setShowTwilight },
                      ].map(({ label, value, setter }) => (
                        <label key={label} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setter(e.target.checked)}
                            className="rounded"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Rotation Speed: {rotationSpeed.toFixed(4)}
                    </p>
                    <input
                      type="range"
                      min="0"
                      max="0.005"
                      step="0.0001"
                      value={rotationSpeed}
                      onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      City Font Size: {countryFontSize}
                    </p>
                    <input
                      type="range"
                      min="4"
                      max="16"
                      step="0.5"
                      value={countryFontSize}
                      onChange={(e) => setCountryFontSize(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Music Player Bar */}
      {layoutPreferences?.showMusicPlayer && (
        <div className="fixed bottom-0 left-0 right-0 z-[10001] pointer-events-auto">
          <MusicPlayerBar
            currentSong={currentSong}
            onSongChange={setCurrentSong}
          />
        </div>
      )}
    </TooltipProvider>
  );
}
