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
  const [selectedJourneyCity, setSelectedJourneyCity] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Panel open/close state
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [websiteLayoutPanelOpen, setWebsiteLayoutPanelOpen] = useState(false);

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
    const offsetSign = offsetHoursDecimal >= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetHoursDecimal);
    const offsetWholeHours = Math.floor(absOffset);
    const offsetMinsPart = Math.round((absOffset - offsetWholeHours) * 60);
    const offsetStr = offsetMinsPart > 0
      ? `${offsetSign}${offsetWholeHours}:${offsetMinsPart < 10 ? '0' + offsetMinsPart : offsetMinsPart}`
      : `${offsetSign}${offsetWholeHours}`;
    return `${month} ${day}, ${year} at ${hours}:${minutesStr} ${ampm} (UTC ${offsetStr})`;
  };

  const formatLocalTime = (): string => {
    const localOffsetMinutes = -currentTime.getTimezoneOffset();
    const localOffsetHours = localOffsetMinutes / 60;
    return formatTimeWithOffset(currentTime, localOffsetHours);
  };

  const formatUtcOffsetTime = (): string => {
    const selectedOffset = offsets[activeOffsetIndex];
    const localOffsetMinutes = -currentTime.getTimezoneOffset();
    const selectedOffsetMinutes = selectedOffset * 60;
    const diffMs = (selectedOffsetMinutes - localOffsetMinutes) * 60 * 1000;
    const adjustedTime = new Date(currentTime.getTime() + diffMs);
    return formatTimeWithOffset(adjustedTime, selectedOffset);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a location name');
      return;
    }
    performSearch(searchQuery.trim());
  };

  const performSearch = (query: string) => {
    searchLocation(query, {
      onSuccess: (result) => {
        if (result) {
          setSelectedLocation(result);
          setViewMode('2D');
          setFocusedTravelSpot(null);
          setFocusedBookmark(null);
          const locationDisplay = result.country && result.name !== result.country
            ? `${result.name}, ${result.country}`
            : result.name;
          toast.success(`Found ${locationDisplay}!`);
        } else {
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
      if (value === '2D') {
        const defaultSearchPlace = layoutPreferences?.defaultSearchPlace || 'Hong Kong';
        setSearchQuery(defaultSearchPlace);
        performSearch(defaultSearchPlace);
        setSelectedJourneyCity(null);
      }
    }
  };

  const handleCityButtonClick = () => {
    setWorldHotspotOpen(prev => !prev);
  };

  const handleShowTimeZonesClick = () => {
    setShowTimeZones(prev => !prev);
    toast.info(showTimeZones ? 'Time zones hidden' : 'Time zones shown');
  };

  const handleWorldButtonClick = () => {
    setWorldControlsOpen(prev => !prev);
  };

  const handleTravelSpotFocus = useCallback((spot: TravelSpot) => {
    performSearch(spot.city);
    setFocusedTravelSpot(spot);
    setFocusedBookmark(null);
    setSelectedJourneyCity(null);
  }, []);

  const handleBookmarkFocus = useCallback((bookmark: MapBookmark) => {
    performSearch(bookmark.city);
    setFocusedBookmark(bookmark);
    setFocusedTravelSpot(null);
    setSelectedJourneyCity(null);
  }, []);

  const handleSongSelect = useCallback((song: Song & { albumTitle: string }) => {
    setCurrentSong(song);
  }, []);

  const handleFlightAnimation = useCallback((fromCity: string, toCity: string, fromCoords: { lat: number; lon: number }, toCoords: { lat: number; lon: number }) => {
    setFlightAnimation({ fromCity, toCity, fromCoords, toCoords });
    setViewMode('3D');
    toast.info(`Flying from ${fromCity} to ${toCity}...`);
  }, []);

  const handleJourney2DMap = useCallback((journeyCity: string) => {
    setViewMode('2D');
    setSelectedJourneyCity(journeyCity);
    setSearchQuery(journeyCity);
    performSearch(journeyCity);
    setFocusedTravelSpot(null);
    setFocusedBookmark(null);
    toast.info(`Showing 2D map for ${journeyCity}`);
  }, []);

  const shouldShowGlobe = viewMode === '3D';
  const shouldShowMap = viewMode === '2D' && selectedLocation;

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (worldHotspotOpen) {
        const target = event.target as HTMLElement;
        const cityButton = document.getElementById('city-button');
        const hotspotPanel = document.getElementById('world-hotspot-panel');
        if (cityButton && hotspotPanel && !cityButton.contains(target) && !hotspotPanel.contains(target)) {
          setWorldHotspotOpen(false);
        }
      }
    };
    if (worldHotspotOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [worldHotspotOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTimeZones) {
        const target = event.target as HTMLElement;
        const timeZonesButton = document.getElementById('show-time-zones-button');
        const utcOffsetPanel = document.getElementById('utc-offset-panel');
        if (timeZonesButton && utcOffsetPanel && !timeZonesButton.contains(target) && !utcOffsetPanel.contains(target)) {
          setShowTimeZones(false);
        }
      }
    };
    if (showTimeZones) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTimeZones]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (worldControlsOpen) {
        const target = event.target as HTMLElement;
        const worldButton = document.getElementById('world-button');
        const worldPanel = document.getElementById('world-controls-panel');
        if (worldButton && worldPanel && !worldButton.contains(target) && !worldPanel.contains(target)) {
          setWorldControlsOpen(false);
        }
      }
    };
    if (worldControlsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [worldControlsOpen]);

  const formatUtcOffsetLabel = (offset: number): string => {
    if (offset === 0) return '0';
    return offset > 0 ? `+${offset}` : `${offset}`;
  };

  return (
    <TooltipProvider>
      {/* Full-screen background container */}
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
            journeyCityFilter={selectedJourneyCity}
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

      {/* UI Container */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <div className="min-h-screen flex flex-col">
          {/* Panel Icon Buttons */}
          <div className="absolute top-4 right-4 z-[10003] pointer-events-auto">
            <div className="flex flex-col items-end gap-2">
              {/* Admin Panel trigger button */}
              <Button
                size="icon"
                variant="secondary"
                className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
                title="Admin Panel"
                onClick={() => setAdminPanelOpen(true)}
              >
                <Globe className="h-4 w-4" />
              </Button>

              {/* Travelogue Panel */}
              <TraveloguePanel
                onFlightAnimation={handleFlightAnimation}
                onJourney2DMap={handleJourney2DMap}
              />

              {/* Vibes Panel */}
              <VibesPanel onTravelSpotFocus={handleTravelSpotFocus} onBookmarkFocus={handleBookmarkFocus} />

              {/* Music Panel */}
              <MusicPanel onSongSelect={handleSongSelect} currentlyPlayingSong={currentSong} />

              {/* Website Layout Panel trigger button */}
              <Button
                size="icon"
                variant="secondary"
                className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
                title="Website Layout"
                onClick={() => setWebsiteLayoutPanelOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Authentication Panel */}
              <LoginPanel />
            </div>
          </div>

          {/* Three buttons at upper left */}
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

          {/* Search Bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[10003] pointer-events-auto" style={{ width: '37.5%' }}>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search location..."
                  className="pl-9 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-white/40 dark:border-slate-700/60 shadow-lg"
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

          {/* 2D/3D Toggle */}
          <div className="absolute bottom-20 right-4 z-[10003] pointer-events-auto">
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-lg border border-white/40 dark:border-slate-700/60 shadow-lg p-1">
              <ToggleGroupItem value="3D" className="text-xs px-3">3D</ToggleGroupItem>
              <ToggleGroupItem value="2D" className="text-xs px-3">2D</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* UTC Offset Panel */}
          {showTimeZones && (
            <div id="utc-offset-panel" className="absolute top-16 left-4 z-[10003] pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-white/40 dark:border-slate-700/60 shadow-lg p-4 max-w-xs">
              <h3 className="font-semibold text-sm mb-3">Time Zone Info</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Local Time:</span>
                  <p className="font-medium">{formatLocalTime()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">UTC Offset Time (UTC {formatUtcOffsetLabel(offsets[activeOffsetIndex])}):</span>
                  <p className="font-medium">{formatUtcOffsetTime()}</p>
                </div>
              </div>
            </div>
          )}

          {/* World Hotspot Panel */}
          {worldHotspotOpen && (
            <div id="world-hotspot-panel" className="absolute top-16 left-4 z-[10003] pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-white/40 dark:border-slate-700/60 shadow-lg p-4 w-64">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                World Travel Hotspot
              </h3>
              <div className="space-y-2">
                {SUPPORTED_COUNTRIES.map(country => (
                  <button
                    key={country}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors"
                    onClick={() => {
                      setSearchQuery(country);
                      performSearch(country);
                      setWorldHotspotOpen(false);
                    }}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* World Controls Panel */}
          {worldControlsOpen && (
            <div id="world-controls-panel" className="absolute top-16 left-4 z-[10003] pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-white/40 dark:border-slate-700/60 shadow-lg p-4 w-72">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Earth className="h-4 w-4" />
                Globe Controls
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Capitals</span>
                  <Button size="sm" variant={showCapitals ? 'default' : 'outline'} className="h-6 text-xs px-2" onClick={() => setShowCapitals(p => !p)}>
                    {showCapitals ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Global Cities</span>
                  <Button size="sm" variant={showGlobalCities ? 'default' : 'outline'} className="h-6 text-xs px-2" onClick={() => setShowGlobalCities(p => !p)}>
                    {showGlobalCities ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Major Cities</span>
                  <Button size="sm" variant={showMajorCities ? 'default' : 'outline'} className="h-6 text-xs px-2" onClick={() => setShowMajorCities(p => !p)}>
                    {showMajorCities ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Day/Night Terminator</span>
                  <Button size="sm" variant={showTerminator ? 'default' : 'outline'} className="h-6 text-xs px-2" onClick={() => setShowTerminator(p => !p)}>
                    {showTerminator ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Twilight Zone</span>
                  <Button size="sm" variant={showTwilight ? 'default' : 'outline'} className="h-6 text-xs px-2" onClick={() => setShowTwilight(p => !p)}>
                    {showTwilight ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="space-y-1">
                  <span className="text-xs">Rotation Speed: {rotationSpeed.toFixed(4)}</span>
                  <input type="range" min="0" max="0.005" step="0.0001" value={rotationSpeed} onChange={(e) => setRotationSpeed(parseFloat(e.target.value))} className="w-full h-1" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs">City Font Size: {countryFontSize}px</span>
                  <input type="range" min="4" max="20" step="1" value={countryFontSize} onChange={(e) => setCountryFontSize(parseInt(e.target.value))} className="w-full h-1" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs">UTC Offset: UTC {formatUtcOffsetLabel(offsets[activeOffsetIndex])}</span>
                  <input type="range" min="0" max={offsets.length - 1} step="1" value={activeOffsetIndex} onChange={(e) => setActiveOffsetIndex(parseInt(e.target.value))} className="w-full h-1" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Music Player Bar */}
      {layoutPreferences?.showMusicPlayer !== false && (
        <div className="fixed bottom-0 left-0 right-0 z-[10004] pointer-events-auto">
          <MusicPlayerBar currentSong={currentSong} onSongChange={setCurrentSong} />
        </div>
      )}

      {/* Admin Panel Dialog */}
      <AdminPanel isOpen={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} />

      {/* Website Layout Panel Dialog */}
      {websiteLayoutPanelOpen && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => setWebsiteLayoutPanelOpen(false)} />
          <div className="relative bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <WebsiteLayoutPanel isOpen={websiteLayoutPanelOpen} onClose={() => setWebsiteLayoutPanelOpen(false)} />
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
