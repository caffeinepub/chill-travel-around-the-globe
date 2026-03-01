import React, { useState, useEffect } from 'react';
import InteractiveGlobe from '@/components/InteractiveGlobe';
import MapComponent from '@/components/MapComponent';
import TraveloguePanel from '@/components/TraveloguePanel';
import WebsiteLayoutPanel from '@/components/WebsiteLayoutPanel';
import LoginPanel from '@/components/LoginPanel';
import AdminPanel from '@/components/AdminPanel';
import VibesPanel from '@/components/VibesPanel';
import MusicPanel from '@/components/MusicPanel';
import MusicPlayerBar from '@/components/MusicPlayerBar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Map, Globe, Clock, Search } from 'lucide-react';
import { useGetWebsiteLayoutSettings, useSearchLocation } from '@/hooks/useQueries';
import { Song } from '@/backend';
import { toast } from 'sonner';

// Timezone offset options
const TIMEZONE_OFFSETS = [
  { label: 'UTC−12:00', value: -12 },
  { label: 'UTC−11:00', value: -11 },
  { label: 'UTC−10:00', value: -10 },
  { label: 'UTC−9:30', value: -9.5 },
  { label: 'UTC−9:00', value: -9 },
  { label: 'UTC−8:00', value: -8 },
  { label: 'UTC−7:00', value: -7 },
  { label: 'UTC−6:00', value: -6 },
  { label: 'UTC−5:00', value: -5 },
  { label: 'UTC−4:30', value: -4.5 },
  { label: 'UTC−4:00', value: -4 },
  { label: 'UTC−3:30', value: -3.5 },
  { label: 'UTC−3:00', value: -3 },
  { label: 'UTC−2:00', value: -2 },
  { label: 'UTC−1:00', value: -1 },
  { label: 'UTC±0:00', value: 0 },
  { label: 'UTC+1:00', value: 1 },
  { label: 'UTC+2:00', value: 2 },
  { label: 'UTC+3:00', value: 3 },
  { label: 'UTC+3:30', value: 3.5 },
  { label: 'UTC+4:00', value: 4 },
  { label: 'UTC+4:30', value: 4.5 },
  { label: 'UTC+5:00', value: 5 },
  { label: 'UTC+5:30', value: 5.5 },
  { label: 'UTC+5:45', value: 5.75 },
  { label: 'UTC+6:00', value: 6 },
  { label: 'UTC+6:30', value: 6.5 },
  { label: 'UTC+7:00', value: 7 },
  { label: 'UTC+8:00', value: 8 },
  { label: 'UTC+8:45', value: 8.75 },
  { label: 'UTC+9:00', value: 9 },
  { label: 'UTC+9:30', value: 9.5 },
  { label: 'UTC+10:00', value: 10 },
  { label: 'UTC+10:30', value: 10.5 },
  { label: 'UTC+11:00', value: 11 },
  { label: 'UTC+12:00', value: 12 },
  { label: 'UTC+12:45', value: 12.75 },
  { label: 'UTC+13:00', value: 13 },
  { label: 'UTC+14:00', value: 14 },
];

function formatUTCTime(offsetHours: number): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const offsetMs = offsetHours * 3600000;
  const localTime = new Date(utcMs + offsetMs);
  return localTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatLocalTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

interface MapLocation {
  coordinates: [number, number];
  locationName: string;
}

const DEFAULT_MAP_LOCATION: MapLocation = {
  coordinates: [48.8566, 2.3522], // Paris as default
  locationName: 'Paris',
};

export default function LocationMapExplorer() {
  const [is3DView, setIs3DView] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapLocation, setMapLocation] = useState<MapLocation>(DEFAULT_MAP_LOCATION);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(formatLocalTime());
  const [utcOffset, setUtcOffset] = useState(0);
  const [utcTime, setUtcTime] = useState(formatUTCTime(0));
  const [showTimezoneDialog, setShowTimezoneDialog] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const { data: layoutSettings } = useGetWebsiteLayoutSettings();
  const { mutate: searchLocation, isPending: isSearching } = useSearchLocation();

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatLocalTime());
      setUtcTime(formatUTCTime(utcOffset));
    }, 1000);
    return () => clearInterval(interval);
  }, [utcOffset]);

  const performSearch = (query: string) => {
    searchLocation(query, {
      onSuccess: (result) => {
        if (result) {
          setMapLocation({
            coordinates: result.coordinates,
            locationName: result.searchQuery,
          });
          setIs3DView(false);
        } else {
          toast.error(`"${query}" not found. Try a different location.`);
        }
      },
      onError: () => {
        toast.error('Failed to search for location. Please try again.');
      },
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim());
    }
  };

  const handleJourney2DMap = (journeyId: string, city: string) => {
    setSelectedJourneyId(journeyId);
    performSearch(city);
  };

  const handleFlightAnimation = (_fromCity: string, _toCity: string) => {
    setIs3DView(true);
  };

  const handleSongChange = (song: Song | null) => {
    setCurrentSong(song);
  };

  const showMusicBar = layoutSettings?.showMusicPlayerBar ?? true;
  const selectedOffsetLabel = TIMEZONE_OFFSETS.find(o => o.value === utcOffset)?.label ?? 'UTC±0:00';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Main View */}
      {is3DView ? (
        <InteractiveGlobe />
      ) : (
        <MapComponent
          coordinates={mapLocation.coordinates}
          locationName={mapLocation.locationName}
          journeyId={selectedJourneyId}
        />
      )}

      {/* Top-left controls */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
        {/* Row 1: Three main buttons */}
        <div className="flex items-center gap-1.5">
          <TraveloguePanel
            onJourney2DMap={handleJourney2DMap}
            onFlightAnimation={handleFlightAnimation}
          />
          {/* Time Zone Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-sm"
            title="Time Zone"
            onClick={() => setShowTimezoneDialog(true)}
          >
            <Clock className="w-4 h-4 text-white/80" />
          </Button>
          <WebsiteLayoutPanel />
        </div>

        {/* Row 2: Live clock display */}
        <div className="flex flex-col gap-1">
          <div className="bg-black/40 backdrop-blur-sm border border-white/15 rounded-md px-2.5 py-1.5">
            <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Local</p>
            <p className="text-xs font-mono text-white/80 tabular-nums">{currentTime}</p>
          </div>
          <div
            className="bg-black/40 backdrop-blur-sm border border-white/15 rounded-md px-2.5 py-1.5 cursor-pointer hover:border-white/30 transition-colors"
            onClick={() => setShowTimezoneDialog(true)}
            title="Click to change timezone"
          >
            <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">{selectedOffsetLabel}</p>
            <p className="text-xs font-mono text-white/80 tabular-nums">{utcTime}</p>
          </div>
        </div>
      </div>

      {/* Top-right controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        <LoginPanel />
        <AdminPanel />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-sm"
          onClick={() => setIs3DView(!is3DView)}
          title={is3DView ? 'Switch to 2D Map' : 'Switch to 3D Globe'}
        >
          {is3DView ? <Map className="w-4 h-4 text-white/80" /> : <Globe className="w-4 h-4 text-white/80" />}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20" style={{ width: '37.5%' }}>
        <form onSubmit={handleSearch} className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city or place…"
              className="w-full h-8 pl-8 pr-3 text-xs bg-black/50 backdrop-blur-sm border border-white/20 rounded-full text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isSearching}
            className="h-8 px-3 text-xs rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/80"
          >
            {isSearching ? '…' : 'Go'}
          </Button>
        </form>
      </div>

      {/* Bottom panels */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-between px-3 pb-3 pointer-events-none">
        <div className="pointer-events-auto flex items-end gap-2">
          <VibesPanel />
        </div>
        <div className="pointer-events-auto">
          <MusicPanel onSongSelect={handleSongChange} />
        </div>
      </div>

      {/* Music Player Bar */}
      {showMusicBar && (
        <div className="absolute bottom-14 left-0 right-0 z-10 pointer-events-auto">
          <MusicPlayerBar />
        </div>
      )}

      {/* Timezone Dialog */}
      <Dialog open={showTimezoneDialog} onOpenChange={setShowTimezoneDialog}>
        <DialogContent className="max-w-[280px] w-[280px] bg-slate-900/95 border-white/15 backdrop-blur-xl text-white p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-white">Time Zone</DialogTitle>
                <p className="text-[10px] text-white/40 mt-0.5">Select UTC offset</p>
              </div>
            </div>
          </DialogHeader>

          <Separator className="bg-white/10" />

          {/* Current time preview */}
          <div className="px-4 py-3 bg-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Current offset</p>
                <p className="text-sm font-semibold text-cyan-300 mt-0.5">{selectedOffsetLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Time</p>
                <p className="text-sm font-mono text-white/80 tabular-nums mt-0.5">{utcTime}</p>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Offset list */}
          <ScrollArea className="h-[240px]">
            <div className="py-1">
              {TIMEZONE_OFFSETS.map((tz) => {
                const isSelected = tz.value === utcOffset;
                const previewTime = formatUTCTime(tz.value);
                return (
                  <button
                    key={tz.value}
                    onClick={() => {
                      setUtcOffset(tz.value);
                      setUtcTime(formatUTCTime(tz.value));
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors hover:bg-white/5 ${
                      isSelected ? 'bg-cyan-500/15 border-l-2 border-cyan-400' : 'border-l-2 border-transparent'
                    }`}
                  >
                    <span className={`text-xs font-medium ${isSelected ? 'text-cyan-300' : 'text-white/70'}`}>
                      {tz.label}
                    </span>
                    <span className={`text-[10px] font-mono tabular-nums ${isSelected ? 'text-cyan-400/80' : 'text-white/30'}`}>
                      {previewTime}
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <Separator className="bg-white/10" />

          {/* Footer */}
          <div className="px-4 py-3">
            <Button
              onClick={() => setShowTimezoneDialog(false)}
              className="w-full h-7 text-xs bg-cyan-600 hover:bg-cyan-700 text-white border-0"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
