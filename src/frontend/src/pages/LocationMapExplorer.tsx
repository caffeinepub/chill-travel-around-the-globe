import { useState, useCallback, useEffect } from 'react';
import { MapPin, Globe, Building, Map, Building2, Earth, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

  const { mutate: searchLocation, isPending } = useSearchLocation();
  const { data: layoutPreferences } = useGetWebsiteLayoutPreferences();

  const offsets = [-12, -11, -10, -9.5, -9, -8, -7, -6, -5, -4, -3.5, -3, -2, -1, 0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 8.75, 9, 9.5, 10, 10.5, 11, 12, 12.75, 13, 14];

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
    
    // Clear focused bookmark
    setFocusedBookmark(null);
  }, []);

  // Handle bookmark focus from Vibes panel
  const handleBookmarkFocus = useCallback((bookmark: MapBookmark) => {
    // First, search for the city to ensure we're in the right location
    performSearch(bookmark.city);
    
    // Set the focused bookmark
    setFocusedBookmark(bookmark);
    
    // Clear focused travel spot
    setFocusedTravelSpot(null);
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
              <TraveloguePanel onFlightAnimation={handleFlightAnimation} />

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

          {/* Header - fully transparent overlay - search bar aligned at top-4 horizontally with City button and Admin Panel */}
          <header className="relative z-[10000] pointer-events-none">
            <div className="container mx-auto px-4 py-4">
              {/* Search Form with Integrated View Toggle - reduced to 37.5% width - removed outer containers */}
              <div className="flex justify-center pointer-events-auto">
                <form onSubmit={handleSearch} className="flex gap-3 w-full max-w-[280px]">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Enter a location name (e.g., New York, Tokyo, Paris)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-20 bg-white dark:bg-slate-900/60 backdrop-blur-sm border-white/40 dark:border-slate-700/60"
                      disabled={isPending}
                    />
                    
                    {/* View Mode Toggle - positioned inside search bar with tooltips and grey styling */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
                      <ToggleGroup 
                        type="single" 
                        value={viewMode} 
                        onValueChange={handleViewModeChange}
                        className="bg-gray-200 dark:bg-slate-700 backdrop-blur-sm p-0.5 rounded-md h-7 border border-gray-300 dark:border-slate-600"
                        size="sm"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem 
                              value="3D" 
                              aria-label="3D Globe View"
                              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-6 px-2 text-xs text-gray-700 dark:text-gray-300"
                            >
                              3D
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm p-4 glass-morphism">
                            <div className="space-y-2">
                              <p className="font-medium text-gray-400">Interactive 3D Globe with Personalized Travel Map</p>
                              <p className="text-sm leading-relaxed text-gray-400">
                                Drag to rotate • Scroll to zoom • Click country to highlight • Click ocean to deselect
                              </p>
                              <p className="text-sm text-yellow-400">
                                Animated arcs from {layoutPreferences?.defaultSearchPlace || 'Zurich'} to your traveled cities
                              </p>
                              <p className="text-sm text-sky-400">
                                Watch for start city labels, ripple effects, and arrival city labels when arcs animate!
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem 
                              value="2D" 
                              aria-label="2D Map View"
                              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-6 px-2 text-xs text-gray-700 dark:text-gray-300"
                            >
                              2D
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm p-4 glass-morphism">
                            <div className="space-y-3">
                              <p className="font-medium text-gray-400">2D Interactive Map View</p>
                              <p className="text-sm leading-relaxed text-gray-400">
                                Search for any location worldwide to view it on the interactive map.
                              </p>
                              <p className="text-sm text-yellow-400">
                                Clicking this button will automatically search for {layoutPreferences?.defaultSearchPlace || 'Hong Kong'}.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs bg-white/60 dark:bg-slate-800/60">
                                  <Globe className="h-3 w-3 mr-1" />
                                  Countries
                                </Badge>
                                <Badge variant="outline" className="text-xs bg-white/60 dark:bg-slate-800/60">
                                  <Building className="h-3 w-3 mr-1" />
                                  Cities & Towns
                                </Badge>
                              </div>
                              <p className="text-sm text-sky-400">
                                Pan and zoom freely to explore. Click anywhere on the map to add bookmarks.
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </ToggleGroup>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </header>

          {/* Bottom panels - All panels repositioned to bottom of UI page - INCREASED Z-INDEX */}
          {/* World Travel Hotspot Panel - Fixed at bottom, reduced by 1/3 */}
          {worldHotspotOpen && (
            <div 
              id="world-hotspot-panel"
              className="fixed bottom-4 left-4 z-[10004] bg-black/80 backdrop-blur-sm rounded-lg px-2.5 py-2 border border-white/20 w-36 pointer-events-auto"
            >
              <div className="text-white text-[10px] font-semibold mb-1.5">World Travel Hotspot</div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setShowCapitals(prev => !prev)}
                  className={`px-2 py-1.5 text-white text-[10px] font-medium rounded-md transition-colors duration-200 border ${
                    showCapitals 
                      ? 'bg-yellow-500/80 hover:bg-yellow-600/80 border-yellow-400/30' 
                      : 'bg-gray-500/50 hover:bg-gray-600/50 border-gray-400/30'
                  }`}
                  title="Toggle capital city markers (yellow dots)"
                >
                  Capitals
                </button>
                
                <button
                  onClick={() => setShowGlobalCities(prev => !prev)}
                  className={`px-2 py-1.5 text-[10px] font-medium rounded-md transition-colors duration-200 border ${
                    showGlobalCities 
                      ? 'bg-sky-400/80 hover:bg-sky-500/80 border-sky-300/30 text-white' 
                      : 'bg-gray-500/50 hover:bg-gray-600/50 border-gray-400/30 text-white'
                  }`}
                  title="Toggle global city markers (light blue stars)"
                >
                  Global Cities
                </button>
                
                <button
                  onClick={() => setShowMajorCities(prev => !prev)}
                  className={`px-2 py-1.5 text-white text-[10px] font-medium rounded-md transition-colors duration-200 border ${
                    showMajorCities 
                      ? 'bg-white/80 hover:bg-white/90 border-white/30 text-black' 
                      : 'bg-gray-500/50 hover:bg-gray-600/50 border-gray-400/30'
                  }`}
                  title="Toggle major city markers (small white dots)"
                >
                  Major Cities
                </button>
              </div>
            </div>
          )}

          {/* World Controls Panel (3D Rotation Speed and Country Font Size) - Fixed at bottom, reduced by 1/3 */}
          {worldControlsOpen && (
            <div 
              id="world-controls-panel"
              className="fixed bottom-4 left-4 z-[10004] bg-black/80 backdrop-blur-sm rounded-lg px-2.5 py-2 border border-white/20 w-40 pointer-events-auto"
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <label htmlFor="rotationSpeed" className="text-white text-[10px] font-medium">
                    3D Rotation Speed
                  </label>
                  <input
                    type="range"
                    id="rotationSpeed"
                    min={0}
                    max="0.006"
                    step="0.0001"
                    value={rotationSpeed}
                    onChange={(e) => setRotationSpeed(Number(e.target.value))}
                    className="w-full h-1.5 bg-blue-500/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-300"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label htmlFor="countryFontSize" className="text-white text-[10px] font-medium whitespace-nowrap">
                    3D Country Font Size
                  </label>
                  <input
                    type="range"
                    id="countryFontSize"
                    min="5"
                    max="20"
                    step="1"
                    value={countryFontSize}
                    onChange={(e) => setCountryFontSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-blue-500/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* UTC Offset Panel - Fixed at bottom, reduced by 1/3 */}
          {showTimeZones && (
            <div 
              id="utc-offset-panel"
              className="fixed bottom-4 left-4 z-[10004] bg-black/80 backdrop-blur-sm rounded-lg px-2.5 py-2 border border-white/20 w-36 pointer-events-auto"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="utcOffsetSlider" className="text-white text-[10px] font-medium">
                  UTC Offset: <span className="text-blue-300">{formatUtcOffsetLabel(offsets[activeOffsetIndex])}</span>
                </label>
                <div className="relative">
                  <input
                    type="range"
                    id="utcOffsetSlider"
                    min="0"
                    max={offsets.length - 1}
                    step="1"
                    value={activeOffsetIndex}
                    onChange={(e) => setActiveOffsetIndex(Number(e.target.value))}
                    className="w-full h-1.5 bg-blue-500/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-300"
                    title={`UTC${formatUtcOffsetLabel(offsets[activeOffsetIndex])}`}
                  />
                </div>
                <div className="text-white text-[9px] text-center opacity-70">
                  Drag to select UTC offset
                </div>
              </div>
            </div>
          )}

          {/* Location Info Overlay - only show when map is active */}
          {shouldShowMap && (
            <div className="absolute top-20 left-4 z-[200] pointer-events-auto">
              <div className="p-3 glass-morphism shadow-xl rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{selectedLocation.searchQuery}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Music Player Bar - positioned absolutely with pointer-events: auto */}
      <div className="fixed bottom-0 left-0 right-0 z-[2500] pointer-events-auto">
        <MusicPlayerBar currentSong={currentSong} onSongChange={setCurrentSong} />
      </div>
    </TooltipProvider>
  );
}
