import { useState, useCallback, useEffect } from 'react';
import { MapPin, Globe, Building, Map, Building2, Earth, Clock, Search, Settings2, Layers, Sun, Moon, RotateCcw, Sunset, CloudSun, Timer, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
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
import { useSearchLocation, useGetWebsiteLayoutPreferences } from '@/hooks/useQueries';
import { Song } from '@/backend';

// ─── UTC offset helpers ───────────────────────────────────────────────────────
const ALL_OFFSETS = [-12, -11, -10, -9.5, -9, -8, -7, -6, -5, -4, -3.5, -3, -2, -1, 0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 8.75, 9, 9.5, 10, 10.5, 11, 12, 12.75, 13, 14];

function formatOffsetLabel(offset: number): string {
  if (offset === 0) return 'UTC+0';
  const sign = offset > 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return m > 0 ? `UTC${sign}${h}:${String(m).padStart(2, '0')}` : `UTC${sign}${h}`;
}

// World clock cities
const WORLD_CLOCK_CITIES = [
  { name: 'New York', tz: 'America/New_York', flag: '🇺🇸' },
  { name: 'London', tz: 'Europe/London', flag: '🇬🇧' },
  { name: 'Paris', tz: 'Europe/Paris', flag: '🇫🇷' },
  { name: 'Dubai', tz: 'Asia/Dubai', flag: '🇦🇪' },
  { name: 'Singapore', tz: 'Asia/Singapore', flag: '🇸🇬' },
  { name: 'Tokyo', tz: 'Asia/Tokyo', flag: '🇯🇵' },
  { name: 'Sydney', tz: 'Australia/Sydney', flag: '🇦🇺' },
  { name: 'Los Angeles', tz: 'America/Los_Angeles', flag: '🇺🇸' },
];

// ─── Flight animation data type (mirrors InteractiveGlobe's internal type) ────
interface FlightAnimationData {
  fromCity: string;
  toCity: string;
  fromCoords: { lat: number; lon: number };
  toCoords: { lat: number; lon: number };
}

// ─── Time Zone Popover Content ─────────────────────────────────────────────────
interface TimeZonePopoverContentProps {
  activeOffsetIndex: number;
  onOffsetChange: (index: number) => void;
  showTimeZones: boolean;
  onToggleTimeZones: (v: boolean) => void;
  currentTime: Date;
}

function TimeZonePopoverContent({
  activeOffsetIndex,
  onOffsetChange,
  showTimeZones,
  onToggleTimeZones,
  currentTime,
}: TimeZonePopoverContentProps) {
  const selectedOffset = ALL_OFFSETS[activeOffsetIndex];
  const selectedLabel = formatOffsetLabel(selectedOffset);

  const localOffsetMinutes = -currentTime.getTimezoneOffset();
  const selectedOffsetMinutes = selectedOffset * 60;
  const diffMs = (selectedOffsetMinutes - localOffsetMinutes) * 60 * 1000;
  const adjustedTime = new Date(currentTime.getTime() + diffMs);
  const timeStr = adjustedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = adjustedTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const localOffsetHours = localOffsetMinutes / 60;
  const localSign = localOffsetHours >= 0 ? '+' : '-';
  const localAbsH = Math.abs(localOffsetHours);
  const localH = Math.floor(localAbsH);
  const localM = Math.round((localAbsH - localH) * 60);
  const localOffsetStr = localM > 0 ? `UTC${localSign}${localH}:${String(localM).padStart(2, '0')}` : `UTC${localSign}${localH}`;
  const localTimeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const sliderMin = 0;
  const sliderMax = ALL_OFFSETS.length - 1;

  return (
    <div className="space-y-5">
      {/* Local Time Display */}
      <div className="rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 p-3 text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Local Time</div>
        <div className="text-2xl font-bold text-foreground font-mono">{localTimeStr}</div>
        <div className="text-xs text-muted-foreground mt-1">{localOffsetStr}</div>
      </div>

      {/* Selected Offset Hero */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Selected Timezone</div>
        <div className="text-3xl font-bold text-primary font-mono">{selectedLabel}</div>
        <div className="text-lg font-mono text-foreground mt-1">{timeStr}</div>
        <div className="text-xs text-muted-foreground mt-1">{dateStr}</div>
      </div>

      {/* Offset Slider */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">UTC Offset</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-muted-foreground w-16">UTC−12</span>
          <Slider
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={[activeOffsetIndex]}
            onValueChange={([v]) => onOffsetChange(v)}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-14 text-right">UTC+14</span>
        </div>
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
          {ALL_OFFSETS.map((offset, idx) => {
            if (!Number.isInteger(offset)) return null;
            return (
              <button
                key={idx}
                onClick={() => onOffsetChange(idx)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  idx === activeOffsetIndex
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {formatOffsetLabel(offset)}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Overlay Toggle */}
      <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <div>
            <div className="text-sm font-medium">Timezone Overlay</div>
            <div className="text-xs text-muted-foreground">Highlight selected timezone on globe</div>
          </div>
        </div>
        <Switch checked={showTimeZones} onCheckedChange={onToggleTimeZones} />
      </div>

      <Separator />

      {/* World Clock */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">World Clock</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {WORLD_CLOCK_CITIES.map(city => {
            const cityTimeStr = currentTime.toLocaleTimeString('en-US', {
              timeZone: city.tz,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            });
            const cityDateStr = currentTime.toLocaleDateString('en-US', {
              timeZone: city.tz,
              month: 'short',
              day: 'numeric',
            });
            const cityHour = parseInt(currentTime.toLocaleTimeString('en-US', { timeZone: city.tz, hour: '2-digit', hour12: false }));
            const isDaytime = cityHour >= 6 && cityHour < 20;
            return (
              <div key={city.name} className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border px-3 py-2">
                <span className="text-base">{city.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground truncate">{city.name}</div>
                  <div className="text-sm font-mono font-semibold text-foreground leading-tight">{cityTimeStr}</div>
                  <div className="text-[10px] text-muted-foreground">{cityDateStr}</div>
                </div>
                <div className="shrink-0">
                  {isDaytime
                    ? <Sun className="w-3.5 h-3.5 text-yellow-400" />
                    : <Moon className="w-3.5 h-3.5 text-blue-300" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Global Control Popover Content ───────────────────────────────────────────
interface GlobalControlPopoverContentProps {
  viewMode: '3D' | '2D';
  onViewModeChange: (v: '3D' | '2D') => void;
  showCapitals: boolean;
  onToggleCapitals: (v: boolean) => void;
  showGlobalCities: boolean;
  onToggleGlobalCities: (v: boolean) => void;
  showMajorCities: boolean;
  onToggleMajorCities: (v: boolean) => void;
  showTerminator: boolean;
  onToggleTerminator: (v: boolean) => void;
  showTwilight: boolean;
  onToggleTwilight: (v: boolean) => void;
  rotationSpeed: number;
  onRotationSpeedChange: (v: number) => void;
  cityFontSize: number;
  onFontSizeChange: (v: number) => void;
}

function GlobalControlPopoverContent({
  viewMode, onViewModeChange,
  showCapitals, onToggleCapitals,
  showGlobalCities, onToggleGlobalCities,
  showMajorCities, onToggleMajorCities,
  showTerminator, onToggleTerminator,
  showTwilight, onToggleTwilight,
  rotationSpeed, onRotationSpeedChange,
  cityFontSize, onFontSizeChange,
}: GlobalControlPopoverContentProps) {

  const ControlRow = ({
    icon: Icon,
    label,
    description,
    checked,
    onChange,
    iconColor = 'text-primary',
  }: {
    icon: React.ElementType;
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    iconColor?: string;
  }) => (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
        <div>
          <div className="text-sm font-medium leading-tight">{label}</div>
          {description && <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* View Mode */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">View Mode</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onViewModeChange('3D')}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
              viewMode === '3D'
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-muted/20 border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            <Globe className="w-6 h-6" />
            <span className="text-xs font-semibold">3D Globe</span>
            <span className="text-[10px] opacity-70">Interactive sphere</span>
          </button>
          <button
            onClick={() => onViewModeChange('2D')}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
              viewMode === '2D'
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-muted/20 border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            <Map className="w-6 h-6" />
            <span className="text-xs font-semibold">2D Map</span>
            <span className="text-[10px] opacity-70">Flat projection</span>
          </button>
        </div>
      </div>

      <Separator />

      {/* City Labels */}
      <div>
        <div className="flex items-center gap-2 mb-1 px-1">
          <Settings2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">City Labels</span>
        </div>
        <div className="space-y-0.5">
          <ControlRow
            icon={MapPin}
            label="Capital Cities"
            description="Show capital city labels"
            checked={showCapitals}
            onChange={onToggleCapitals}
            iconColor="text-yellow-400"
          />
          <ControlRow
            icon={Building}
            label="Global Cities"
            description="Show global city labels"
            checked={showGlobalCities}
            onChange={onToggleGlobalCities}
            iconColor="text-blue-400"
          />
          <ControlRow
            icon={Building2}
            label="Major Cities"
            description="Show major city labels"
            checked={showMajorCities}
            onChange={onToggleMajorCities}
            iconColor="text-green-400"
          />
        </div>
      </div>

      <Separator />

      {/* Solar & Twilight */}
      <div>
        <div className="flex items-center gap-2 mb-1 px-1">
          <Sun className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solar & Twilight</span>
        </div>
        <div className="space-y-0.5">
          <ControlRow
            icon={Sunset}
            label="Solar Terminator"
            description="Day/night boundary line"
            checked={showTerminator}
            onChange={onToggleTerminator}
            iconColor="text-yellow-400"
          />
          <ControlRow
            icon={CloudSun}
            label="Twilight Zone"
            description="Civil twilight overlay"
            checked={showTwilight}
            onChange={onToggleTwilight}
            iconColor="text-orange-300"
          />
        </div>
      </div>

      <Separator />

      {/* Globe Rotation */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <RotateCcw className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Globe Rotation</span>
        </div>
        <div className="px-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Speed</span>
            <span className="text-xs font-mono text-foreground">{rotationSpeed === 0 ? 'Off' : rotationSpeed.toFixed(4)}</span>
          </div>
          <Slider
            min={0}
            max={0.005}
            step={0.0001}
            value={[rotationSpeed]}
            onValueChange={([v]) => onRotationSpeedChange(v)}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">Stopped</span>
            <span className="text-[10px] text-muted-foreground">Fast</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Font Size */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Type className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Font Size</span>
        </div>
        <div className="px-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">City Label Size</span>
            <span className="text-xs font-mono text-foreground">{cityFontSize.toFixed(0)}px</span>
          </div>
          <Slider
            min={6}
            max={24}
            step={1}
            value={[cityFontSize]}
            onValueChange={([v]) => onFontSizeChange(v)}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">Small</span>
            <span className="text-[10px] text-muted-foreground">Large</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LocationMapExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  // Map/2D view state: coordinates and location name from search
  const [mapCoordinates, setMapCoordinates] = useState<[number, number]>([51.505, -0.09]);
  const [mapLocationName, setMapLocationName] = useState<string>('London');
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [currentSong, setCurrentSong] = useState<Song & { albumTitle: string } | undefined>(undefined);
  const [showTimeZones, setShowTimeZones] = useState(false);
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false);
  const [globalControlPopoverOpen, setGlobalControlPopoverOpen] = useState(false);
  const [showCapitals, setShowCapitals] = useState(true);
  const [showGlobalCities, setShowGlobalCities] = useState(true);
  const [showMajorCities, setShowMajorCities] = useState(false);
  const [showTerminator, setShowTerminator] = useState(false);
  const [showTwilight, setShowTwilight] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(0.001);
  const [cityFontSize, setCityFontSize] = useState(8);
  const [activeOffsetIndex, setActiveOffsetIndex] = useState(() => ALL_OFFSETS.indexOf(0));
  const [currentTime, setCurrentTime] = useState(new Date());
  // Flight animation state — passed as a single object to InteractiveGlobe
  const [flightAnimation, setFlightAnimation] = useState<FlightAnimationData | null>(null);
  // Journey 2D map: journeyId used as schedule key
  const [journey2DId, setJourney2DId] = useState<string>('');

  const { data: layoutPrefs } = useGetWebsiteLayoutPreferences();

  // Tick clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Apply layout preferences
  useEffect(() => {
    if (layoutPrefs) {
      if (layoutPrefs.cityFontSize) setCityFontSize(layoutPrefs.cityFontSize);
    }
  }, [layoutPrefs]);

  const { mutate: searchLocation, isPending: isSearching } = useSearchLocation();

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    searchLocation(searchQuery.trim(), {
      onSuccess: (result: unknown) => {
        if (result) {
          const loc = result as { name: string; coordinates: [number, number] };
          if (loc.coordinates) setMapCoordinates(loc.coordinates);
          if (loc.name) setMapLocationName(loc.name);
        } else {
          toast.error('Location not found');
        }
      },
      onError: () => toast.error('Search failed'),
    });
  }, [searchQuery, searchLocation]);

  // TraveloguePanel callback: 4 separate params → build FlightAnimationData object
  const handleFlightAnimation = useCallback((
    fromCity: string,
    toCity: string,
    fromCoords: { lat: number; lon: number },
    toCoords: { lat: number; lon: number }
  ) => {
    setFlightAnimation({ fromCity, toCity, fromCoords, toCoords });
    if (viewMode === '2D') setViewMode('3D');
  }, [viewMode]);

  const handleFlightAnimationComplete = useCallback(() => {
    setFlightAnimation(null);
  }, []);

  // TraveloguePanel callback: journeyId (journey.title) only
  const handleJourney2DMap = useCallback((journeyId: string) => {
    setJourney2DId(journeyId);
    setViewMode('2D');
  }, []);

  const showMusicPlayer = layoutPrefs?.showMusicPlayer ?? true;

  return (
    <TooltipProvider>
      <div className="relative w-full h-screen overflow-hidden bg-background">
        {/* ── Map / Globe ── */}
        <div className="absolute inset-0">
          {viewMode === '3D' ? (
            <InteractiveGlobe
              showCapitals={showCapitals}
              showGlobalCities={showGlobalCities}
              showMajorCities={showMajorCities}
              showTerminator={showTerminator}
              showTwilight={showTwilight}
              rotationSpeed={rotationSpeed}
              showTimeZones={showTimeZones}
              activeOffsetIndex={activeOffsetIndex}
              countryFontSize={cityFontSize}
              flightAnimation={flightAnimation}
              onFlightAnimationComplete={handleFlightAnimationComplete}
            />
          ) : (
            <MapComponent
              coordinates={mapCoordinates}
              locationName={mapLocationName}
              journeyId={journey2DId || undefined}
            />
          )}
        </div>

        {/* ── Search Bar (top center) ── */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2" style={{ width: '37.5%' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search location…"
              className="pl-9 bg-background/90 backdrop-blur border-border shadow-lg"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching} size="icon" className="shrink-0 shadow-lg">
            {isSearching ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* ── Upper-Left Controls: World Travel, Time Zone, Global Control + 3D/2D toggles ── */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {/* World Travel button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-background/90 backdrop-blur shadow-lg border-border gap-2 justify-start"
              >
                <Earth className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">World Travel</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              className="w-[420px] max-h-[85vh] overflow-y-auto p-4"
              sideOffset={8}
            >
              <div className="mb-4">
                <h3 className="text-base font-semibold">World Travel</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Your journeys and travelogues</p>
              </div>
              <TraveloguePanel
                onFlightAnimation={handleFlightAnimation}
                onJourney2DMap={handleJourney2DMap}
              />
            </PopoverContent>
          </Popover>

          {/* Time Zone button */}
          <Popover open={timezonePopoverOpen} onOpenChange={setTimezonePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-background/90 backdrop-blur shadow-lg border-border gap-2 justify-start"
              >
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">Time Zone</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              className="w-[380px] max-h-[85vh] overflow-y-auto p-4"
              sideOffset={8}
            >
              <div className="mb-4">
                <h3 className="text-base font-semibold">Time Zone</h3>
                <p className="text-xs text-muted-foreground mt-0.5">World clock & timezone overlay</p>
              </div>
              <TimeZonePopoverContent
                activeOffsetIndex={activeOffsetIndex}
                onOffsetChange={setActiveOffsetIndex}
                showTimeZones={showTimeZones}
                onToggleTimeZones={setShowTimeZones}
                currentTime={currentTime}
              />
            </PopoverContent>
          </Popover>

          {/* Global Control button */}
          <Popover open={globalControlPopoverOpen} onOpenChange={setGlobalControlPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-background/90 backdrop-blur shadow-lg border-border gap-2 justify-start"
              >
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">Global Control</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              className="w-[340px] max-h-[85vh] overflow-y-auto p-4"
              sideOffset={8}
            >
              <div className="mb-4">
                <h3 className="text-base font-semibold">Global Control</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Globe display & layer settings</p>
              </div>
              <GlobalControlPopoverContent
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                showCapitals={showCapitals}
                onToggleCapitals={setShowCapitals}
                showGlobalCities={showGlobalCities}
                onToggleGlobalCities={setShowGlobalCities}
                showMajorCities={showMajorCities}
                onToggleMajorCities={setShowMajorCities}
                showTerminator={showTerminator}
                onToggleTerminator={setShowTerminator}
                showTwilight={showTwilight}
                onToggleTwilight={setShowTwilight}
                rotationSpeed={rotationSpeed}
                onRotationSpeedChange={setRotationSpeed}
                cityFontSize={cityFontSize}
                onFontSizeChange={setCityFontSize}
              />
            </PopoverContent>
          </Popover>

          {/* 3D / 2D Toggle Buttons */}
          <div className="flex gap-1 mt-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === '3D' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('3D')}
                  className={`flex-1 gap-1 shadow-lg ${viewMode === '3D' ? '' : 'bg-background/90 backdrop-blur border-border'}`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">3D</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Switch to 3D Globe</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === '2D' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('2D')}
                  className={`flex-1 gap-1 shadow-lg ${viewMode === '2D' ? '' : 'bg-background/90 backdrop-blur border-border'}`}
                >
                  <Map className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">2D</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Switch to 2D Map</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Right-side panel buttons ── */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <VibesPanel />
          <MusicPanel onSongSelect={setCurrentSong} />
          <WebsiteLayoutPanel />
          <AdminPanel />
          <LoginPanel />
        </div>

        {/* ── Music Player Bar (bottom) ── */}
        {showMusicPlayer && (
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <MusicPlayerBar
              currentSong={currentSong}
              onSongChange={setCurrentSong}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
