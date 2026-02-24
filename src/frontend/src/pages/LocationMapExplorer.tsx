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
  const [utcOffsetTime, setUtcOffsetTime] = useState<string>('');
  const [utcOffsetLocalTime, setUtcOffsetLocalTime] = useState<string>('');

  const { mutate: searchLocation, isPending } = useSearchLocation();
  const { data: layoutPreferences } = useGetWebsiteLayoutPreferences();

  const offsets = [-12, -11, -10, -9.5, -9, -8, -7, -6, -5, -4, -3.5, -3, -2, -1, 0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 8.75, 9, 9.5, 10, 10.5, 11, 12, 12.75, 13, 14];

  const utcOffsetHours = offsets[activeOffsetIndex];

  // Update UTC offset time display every second
  useEffect(() => {
    const updateUtcOffsetTime = () => {
      const now = new Date();
      const utcDate = new Date(now.getTime() + utcOffsetHours * 60 * 60 * 1000);
      
      const hours = utcDate.getUTCHours().toString().padStart(2, '0');
      const minutes = utcDate.getUTCMinutes().toString().padStart(2, '0');
      const seconds = utcDate.getUTCSeconds().toString().padStart(2, '0');
      
      const offsetSign = utcOffsetHours >= 0 ? '+' : '';
      const offsetFormatted = utcOffsetHours % 1 === 0 
        ? `${offsetSign}${utcOffsetHours.toFixed(0).padStart(2, '0')}:00`
        : `${offsetSign}${Math.floor(utcOffsetHours).toString().padStart(2, '0')}:${Math.abs((utcOffsetHours % 1) * 60).toString().padStart(2, '0')}`;
      
      setUtcOffsetTime(`UTC${offsetFormatted}: ${hours}:${minutes}:${seconds}`);
    };

    updateUtcOffsetTime();
    const interval = setInterval(updateUtcOffsetTime, 1000);

    return () => clearInterval(interval);
  }, [utcOffsetHours]);

  // Update local time with UTC offset display every second
  useEffect(() => {
    const updateUtcOffsetLocalTime = () => {
      const now = new Date();
      const utcDate = new Date(now.getTime() + utcOffsetHours * 60 * 60 * 1000);
      
      const formatter = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      });
      
      const formattedTime = formatter.format(utcDate);
      
      const offsetSign = utcOffsetHours >= 0 ? '+' : '';
      const offsetHours = Math.floor(Math.abs(utcOffsetHours));
      const offsetMinutes = Math.round((Math.abs(utcOffsetHours) - offsetHours) * 60);
      const offsetStr = offsetMinutes > 0 
        ? `${offsetSign}${offsetHours}:${offsetMinutes.toString().padStart(2, '0')}`
        : `${offsetSign}${offsetHours}`;
      
      setUtcOffsetLocalTime(`${formattedTime} (UTC ${offsetStr})`);
    };

    updateUtcOffsetLocalTime();
    const interval = setInterval(updateUtcOffsetLocalTime, 1000);

    return () => clearInterval(interval);
  }, [utcOffsetHours]);

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
        setSelectedJourneyCity(null);
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
    setSelectedJourneyCity(null);
  }, []);

  // Handle bookmark focus from Vibes panel
  const handleBookmarkFocus = useCallback((bookmark: MapBookmark) => {
    // First, search for the city to ensure we're in the right location
    performSearch(bookmark.city);
    
    // Set the focused bookmark
    setFocusedBookmark(bookmark);
    
    // Clear focused travel spot and journey context
    setFocusedTravelSpot(null);
    setSelectedJourneyCity(null);
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

  // Handle 2D map button click from Travelogue panel
  const handleJourney2DMap = useCallback((city: string) => {
    setSelectedJourneyCity(city);
    setSearchQuery(city);
    performSearch(city);
    setViewMode('2D');
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bS0yIDB2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40 dark:opacity-20"></div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 px-6 py-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-white/60 dark:border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  World Explorer
                </h1>
                <p className="text-sm text-muted-foreground">Discover places around the globe</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LoginPanel />
              <AdminPanel />
              <TraveloguePanel 
                onFlightAnimation={handleFlightAnimation}
                onJourney2DMap={handleJourney2DMap}
              />
              <VibesPanel 
                onTravelSpotFocus={handleTravelSpotFocus}
                onBookmarkFocus={handleBookmarkFocus}
              />
              <MusicPanel onSongSelect={handleSongSelect} />
              <WebsiteLayoutPanel utcOffsetHours={utcOffsetHours} />
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <div className="flex-shrink-0 px-6 py-4">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for countries, cities, or towns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-24 h-12 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-white/60 dark:border-slate-700/60 shadow-lg text-base"
                disabled={isPending}
              />
              <Button
                type="submit"
                disabled={isPending}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isPending ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </form>
        </div>

        {/* View Toggle and Controls */}
        <div className="flex-shrink-0 px-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
              <ToggleGroupItem value="3D" aria-label="3D View" className="data-[state=on]:bg-blue-600 data-[state=on]:text-white">
                <Globe className="h-4 w-4 mr-2" />
                3D Globe
              </ToggleGroupItem>
              <ToggleGroupItem value="2D" aria-label="2D View" className="data-[state=on]:bg-blue-600 data-[state=on]:text-white">
                <Map className="h-4 w-4 mr-2" />
                2D Map
              </ToggleGroupItem>
            </ToggleGroup>

            {selectedLocation && (
              <Badge variant="secondary" className="ml-4 px-4 py-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
                <MapPin className="h-4 w-4 mr-2" />
                {selectedLocation.country && selectedLocation.name !== selectedLocation.country 
                  ? `${selectedLocation.name}, ${selectedLocation.country}`
                  : selectedLocation.name}
              </Badge>
            )}
          </div>

          {viewMode === '3D' && (
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCityButtonClick}
                      className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80"
                    >
                      <Building className="h-4 w-4 mr-2" />
                      Cities
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle World Travel Hotspot</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleShowTimeZonesClick}
                      className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Time Zones
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show/Hide Time Zones</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleWorldButtonClick}
                      className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80"
                    >
                      <Earth className="h-4 w-4 mr-2" />
                      World
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle World Controls</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Map/Globe Container */}
        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-white/60 dark:border-slate-700/60">
            {viewMode === '2D' ? (
              selectedLocation && (
                <MapComponent 
                  coordinates={selectedLocation.coordinates}
                  locationName={selectedLocation.name}
                  locationType={selectedLocation.type}
                  focusedTravelSpot={focusedTravelSpot}
                  focusedBookmark={focusedBookmark}
                  onTravelSpotFocused={() => setFocusedTravelSpot(null)}
                  onBookmarkFocused={() => setFocusedBookmark(null)}
                  journeyCityFilter={selectedJourneyCity}
                />
              )
            ) : (
              <InteractiveGlobe 
                showTimeZones={showTimeZones}
                showCapitals={showCapitals}
                showGlobalCities={showGlobalCities}
                showMajorCities={showMajorCities}
                showTerminator={showTerminator}
                showTwilight={showTwilight}
                activeOffsetIndex={activeOffsetIndex}
                rotationSpeed={rotationSpeed}
                countryFontSize={countryFontSize}
                flightAnimation={flightAnimation}
                onFlightAnimationComplete={() => setFlightAnimation(null)}
              />
            )}
          </div>
        </div>
      </div>

      {/* World Travel Hotspot Panel */}
      {worldHotspotOpen && viewMode === '3D' && (
        <div className="fixed top-24 right-6 z-[2000] w-80">
          <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-2xl border-white/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                World Travel Hotspot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Show Capitals</span>
                <Button
                  size="sm"
                  variant={showCapitals ? "default" : "outline"}
                  onClick={() => setShowCapitals(!showCapitals)}
                >
                  {showCapitals ? 'On' : 'Off'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Show Global Cities</span>
                <Button
                  size="sm"
                  variant={showGlobalCities ? "default" : "outline"}
                  onClick={() => setShowGlobalCities(!showGlobalCities)}
                >
                  {showGlobalCities ? 'On' : 'Off'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Show Major Cities</span>
                <Button
                  size="sm"
                  variant={showMajorCities ? "default" : "outline"}
                  onClick={() => setShowMajorCities(!showMajorCities)}
                >
                  {showMajorCities ? 'On' : 'Off'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* World Controls Panel */}
      {worldControlsOpen && viewMode === '3D' && (
        <div className="fixed top-24 left-6 z-[2000] w-96">
          <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-2xl border-white/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Earth className="h-5 w-5" />
                World Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Show Terminator</span>
                  <Button
                    size="sm"
                    variant={showTerminator ? "default" : "outline"}
                    onClick={() => setShowTerminator(!showTerminator)}
                  >
                    {showTerminator ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Show Twilight</span>
                  <Button
                    size="sm"
                    variant={showTwilight ? "default" : "outline"}
                    onClick={() => setShowTwilight(!showTwilight)}
                  >
                    {showTwilight ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Rotation Speed</span>
                  <span className="text-xs text-muted-foreground">{rotationSpeed.toFixed(4)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.002"
                  step="0.0001"
                  value={rotationSpeed}
                  onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Country Font Size</span>
                  <span className="text-xs text-muted-foreground">{countryFontSize}px</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="16"
                  step="1"
                  value={countryFontSize}
                  onChange={(e) => setCountryFontSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">UTC Offset Selection</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Local Time: <span className="font-semibold">{utcOffsetLocalTime}</span></div>
                    <div className="font-semibold">{utcOffsetTime}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTimeZones(!showTimeZones)}
                    className="w-full"
                  >
                    Select UTC Offset
                  </Button>
                </div>
                <input
                  type="range"
                  min="0"
                  max={offsets.length - 1}
                  step="1"
                  value={activeOffsetIndex}
                  onChange={(e) => setActiveOffsetIndex(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Music Player Bar */}
      <MusicPlayerBar currentSong={currentSong} />

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 py-3 px-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-t border-white/60 dark:border-slate-700/60 z-[1000]">
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Built with ❤️ using{' '}
            <a 
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              caffeine.ai
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
