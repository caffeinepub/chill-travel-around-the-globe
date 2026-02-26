import React, { useState, useEffect } from 'react';
import { Search, Globe, Map, Clock, X, Settings, BookOpen, Sparkles, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearchLocation, SUPPORTED_COUNTRIES, useGetWebsiteLayoutPreferences } from '@/hooks/useQueries';
import InteractiveGlobe from '@/components/InteractiveGlobe';
import MapComponent from '@/components/MapComponent';
import LoginPanel from '@/components/LoginPanel';
import AdminPanel from '@/components/AdminPanel';
import TraveloguePanel from '@/components/TraveloguePanel';
import VibesPanel from '@/components/VibesPanel';
import MusicPanel from '@/components/MusicPanel';
import MusicPlayerBar from '@/components/MusicPlayerBar';
import WebsiteLayoutPanel from '@/components/WebsiteLayoutPanel';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { TravelSpot, MapBookmark, Song } from '@/backend';

interface SearchResult {
  coordinates: [number, number];
  name: string;
  type: string;
}

export default function LocationMapExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [is3DView, setIs3DView] = useState(true);
  const [localTime, setLocalTime] = useState('');
  const [utcOffsetTime, setUtcOffsetTime] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showTraveloguePanel, setShowTraveloguePanel] = useState(false);
  const [focusedTravelSpot, setFocusedTravelSpot] = useState<TravelSpot | null>(null);
  const [focusedBookmark, setFocusedBookmark] = useState<MapBookmark | null>(null);
  const [journeyCityFilter, setJourneyCityFilter] = useState<string | null>(null);
  const [currentSong, setCurrentSong] = useState<(Song & { albumTitle: string }) | undefined>(undefined);

  const searchLocation = useSearchLocation();
  const { data: layoutPreferences } = useGetWebsiteLayoutPreferences();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  // Clock update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLocalTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (searchResult?.coordinates) {
        try {
          const offsetMs = now.getTimezoneOffset() * -60000;
          const offsetHours = offsetMs / 3600000;
          const sign = offsetHours >= 0 ? '+' : '-';
          const absHours = Math.floor(Math.abs(offsetHours));
          const absMins = Math.round((Math.abs(offsetHours) - absHours) * 60);
          const offsetStr = `UTC ${sign}${absHours}${absMins > 0 ? `:${absMins.toString().padStart(2, '0')}` : ''}`;
          setUtcOffsetTime(`${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (${offsetStr})`);
        } catch {
          setUtcOffsetTime('');
        }
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [searchResult]);

  // Load default search place from layout preferences
  useEffect(() => {
    if (layoutPreferences?.defaultSearchPlace && !searchResult) {
      handleSearch(layoutPreferences.defaultSearchPlace);
    }
  }, [layoutPreferences?.defaultSearchPlace]);

  const handleSearch = async (query?: string) => {
    const q = (query || searchQuery).trim();
    if (!q) return;

    try {
      const result = await searchLocation.mutateAsync(q);
      if (result) {
        setSearchResult({
          coordinates: result.coordinates,
          name: result.name,
          type: result.type,
        });
        if (!query) setSearchQuery(result.name);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleJourney2DMap = (journeyCity: string) => {
    setJourneyCityFilter(journeyCity);
    setIs3DView(false);
    setShowTraveloguePanel(false);
  };

  const handleTravelSpotFocus = (spot: TravelSpot) => {
    setFocusedTravelSpot(spot);
    setIs3DView(false);
  };

  const handleBookmarkFocus = (bookmark: MapBookmark) => {
    setFocusedBookmark(bookmark);
    setIs3DView(false);
  };

  const showMusicPlayer = layoutPreferences?.showMusicPlayer !== false;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Main view */}
      {is3DView ? (
        <InteractiveGlobe />
      ) : (
        <MapComponent
          coordinates={searchResult?.coordinates || [0, 0]}
          locationName={searchResult?.name || ''}
          locationType={searchResult?.type}
          focusedTravelSpot={focusedTravelSpot}
          focusedBookmark={focusedBookmark}
          onTravelSpotFocused={() => setFocusedTravelSpot(null)}
          onBookmarkFocused={() => setFocusedBookmark(null)}
          journeyCityFilter={journeyCityFilter}
        />
      )}

      {/* Top search bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 w-[37.5%] min-w-64">
        <div className="flex-1 flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-white/40 dark:border-slate-700/60">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search location..."
            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg border border-white/40 dark:border-slate-700/60 rounded-full"
          onClick={() => handleSearch()}
          disabled={searchLocation.isPending}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Right-side controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
          onClick={() => setIs3DView(!is3DView)}
          title={is3DView ? 'Switch to 2D Map' : 'Switch to 3D Globe'}
        >
          {is3DView ? <Map className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
        </Button>

        <LoginPanel />

        {isAuthenticated && (
          <>
            <Button
              size="icon"
              variant="secondary"
              className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
              onClick={() => setShowAdminPanel(true)}
              title="Admin Panel"
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="secondary"
              className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
              onClick={() => setShowTraveloguePanel(true)}
              title="Travelogue"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </>
        )}

        <VibesPanel
          onTravelSpotFocus={handleTravelSpotFocus}
          onBookmarkFocus={handleBookmarkFocus}
        />

        {isAuthenticated && (
          <MusicPanel
            onSongSelect={setCurrentSong}
            currentlyPlayingSong={currentSong}
          />
        )}

        <WebsiteLayoutPanel />
      </div>

      {/* Clock display */}
      {searchResult && (
        <div className="absolute bottom-20 left-4 z-[1000] bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-2 shadow border border-white/40 dark:border-slate-700/60 text-xs space-y-0.5">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Local Time</span>
            <span className="font-mono font-medium">{localTime}</span>
          </div>
          {utcOffsetTime && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">UTC Offset</span>
              <span className="font-mono font-medium text-xs">{utcOffsetTime}</span>
            </div>
          )}
        </div>
      )}

      {/* Music player bar */}
      {isAuthenticated && showMusicPlayer && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
          <MusicPlayerBar
            currentSong={currentSong}
            onSongChange={setCurrentSong}
          />
        </div>
      )}

      {/* Admin Panel */}
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />

      {/* Travelogue Panel */}
      <TraveloguePanel
        isOpen={showTraveloguePanel}
        onClose={() => setShowTraveloguePanel(false)}
        onShowCityOnMap={handleJourney2DMap}
      />

      {/* Footer */}
      <div className="absolute bottom-4 right-4 z-[1000] text-xs text-muted-foreground/60">
        Built with ❤️ using{' '}
        <a
          href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-muted-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </div>
    </div>
  );
}
