import React, { useState, useEffect, useRef, useCallback } from 'react';
import InteractiveGlobe from '../components/InteractiveGlobe';
import MapComponent from '../components/MapComponent';
import TraveloguePanel from '../components/TraveloguePanel';
import VibesPanel from '../components/VibesPanel';
import MusicPanel from '../components/MusicPanel';
import AdminPanel from '../components/AdminPanel';
import LoginPanel from '../components/LoginPanel';
import WebsiteLayoutPanel from '../components/WebsiteLayoutPanel';
import CityloguePanel from '../components/CityloguePanel';
import MusicPlayerBar from '../components/MusicPlayerBar';
import TimeControls from '../components/TimeControls';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetWebsiteLayoutSettings } from '../hooks/useQueries';
import { Globe, Map, BookOpen, Music, Settings, LogIn, Layout, BookMarked, Clock } from 'lucide-react';
import { TravelSpot, MapBookmark, Song } from '../backend';

type ViewMode = 'globe' | 'map';
type PanelType = 'travelogue' | 'vibes' | 'music' | 'admin' | 'layout' | 'login' | 'citylogue' | null;
type TimeMode = 'real' | 'hourly' | 'yearly';

export default function LocationMapExplorer() {
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGlobalControl, setShowGlobalControl] = useState(false);
  const [showTimeControls, setShowTimeControls] = useState(false);
  const [currentSong, setCurrentSong] = useState<(Song & { albumTitle: string }) | undefined>(undefined);
  const [mapCoordinates, setMapCoordinates] = useState<[number, number]>([22.3193, 114.1694]);
  const [mapLocationName, setMapLocationName] = useState('Hong Kong');
  const [journeyId, setJourneyId] = useState<string | undefined>(undefined);

  // Time Controls state
  const [tcIsAnimating, setTcIsAnimating] = useState(false);
  const [tcCurrentDate, setTcCurrentDate] = useState(new Date());
  const [tcTimeMode, setTcTimeMode] = useState<TimeMode>('real');
  const tcAnimationRef = useRef<number | null>(null);

  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: layoutSettings } = useGetWebsiteLayoutSettings();

  // Time Controls handlers
  const handleTcTimeModeChange = useCallback((mode: TimeMode) => {
    setTcTimeMode(mode);
    setTcIsAnimating(false);
    if (tcAnimationRef.current) {
      cancelAnimationFrame(tcAnimationRef.current);
      tcAnimationRef.current = null;
    }
    if (mode === 'real') {
      setTcCurrentDate(new Date());
    }
  }, []);

  const handleTcPlayPause = useCallback(() => {
    if (tcTimeMode === 'real') return;
    setTcIsAnimating(prev => !prev);
  }, [tcTimeMode]);

  // Animation loop for time controls
  useEffect(() => {
    if (!tcIsAnimating || tcTimeMode === 'real') {
      if (tcAnimationRef.current) {
        cancelAnimationFrame(tcAnimationRef.current);
        tcAnimationRef.current = null;
      }
      return;
    }

    const animate = () => {
      setTcCurrentDate(prev => {
        const next = new Date(prev);
        if (tcTimeMode === 'hourly') {
          next.setMinutes(next.getMinutes() + 1);
        } else if (tcTimeMode === 'yearly') {
          next.setDate(next.getDate() + 1);
        }
        return next;
      });
      tcAnimationRef.current = requestAnimationFrame(animate);
    };

    tcAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (tcAnimationRef.current) {
        cancelAnimationFrame(tcAnimationRef.current);
        tcAnimationRef.current = null;
      }
    };
  }, [tcIsAnimating, tcTimeMode]);

  // Keep real-time mode in sync with actual time
  useEffect(() => {
    if (tcTimeMode !== 'real') return;
    const interval = setInterval(() => {
      setTcCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [tcTimeMode]);

  const geocodeAndNavigate = useCallback(async (query: string) => {
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
        { headers: { 'User-Agent': 'WorldExplorer/1.0' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          setMapCoordinates([lat, lon]);
          setMapLocationName(query);
          setViewMode('map');
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    geocodeAndNavigate(searchQuery.trim());
  };

  const handlePanelToggle = (panel: PanelType) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  // TraveloguePanel.onJourney2DMap: (journeyId: string) => void
  const handleJourney2DMap = useCallback((journeyId: string) => {
    setJourneyId(journeyId);
    geocodeAndNavigate(journeyId);
  }, [geocodeAndNavigate]);

  // VibesPanel.onTravelSpotFocus: (spot: TravelSpot) => void
  const handleTravelSpotFocus = useCallback((spot: TravelSpot) => {
    setMapCoordinates([spot.coordinates[0], spot.coordinates[1]]);
    setMapLocationName(spot.city);
    setViewMode('map');
  }, []);

  // VibesPanel.onBookmarkFocus: (bookmark: MapBookmark) => void
  const handleBookmarkFocus = useCallback((bookmark: MapBookmark) => {
    setMapCoordinates([bookmark.coordinates[0], bookmark.coordinates[1]]);
    setMapLocationName(bookmark.city);
    setViewMode('map');
  }, []);

  // CityloguePanel.onSpotFocus: (coordinates, spotName) => void
  const handleSpotFocus = useCallback((coordinates: [number, number], spotName: string) => {
    setMapCoordinates(coordinates);
    setMapLocationName(spotName);
    setViewMode('map');
  }, []);

  // MusicPanel/TraveloguePanel song select: Song & { albumTitle: string }
  const handleSongSelect = useCallback((song: Song & { albumTitle: string }) => {
    setCurrentSong(song);
  }, []);

  const showMusicBar = layoutSettings?.showMusicPlayerBar ?? true;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-card border-b border-border z-10 shrink-0">
        <div className="flex items-center gap-2">
          <img src="/assets/generated/fab-icon.dim_48x48.png" alt="App Icon" className="w-8 h-8" />
          <span className="font-bold text-lg text-foreground">World Explorer</span>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2" style={{ width: '37.5%' }}>
          <div className="relative flex-1">
            <img
              src="/assets/generated/search-magnifier-icon-grey-transparent.dim_24x24.png"
              alt="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search cities, countries..."
              className="w-full pl-9 pr-4 py-1.5 rounded-full bg-muted text-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go
          </button>
        </form>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('globe')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'globe' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            <Globe className="w-4 h-4" />
            Globe
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            <Map className="w-4 h-4" />
            Map
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <aside className="w-14 flex flex-col items-center py-3 gap-2 bg-card border-r border-border shrink-0 overflow-y-auto">
          {/* Travelogue Button */}
          <button
            onClick={() => handlePanelToggle('travelogue')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activePanel === 'travelogue' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            title="Travelogue"
          >
            <BookOpen className="w-5 h-5" />
          </button>

          {/* Citylogue Button */}
          <button
            onClick={() => handlePanelToggle('citylogue')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activePanel === 'citylogue' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            title="Citylogue"
          >
            <BookMarked className="w-5 h-5" />
          </button>

          {/* Vibes Button */}
          <button
            onClick={() => handlePanelToggle('vibes')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activePanel === 'vibes' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            title="Vibes"
          >
            <Music className="w-5 h-5" />
          </button>

          {/* Music Button */}
          <button
            onClick={() => handlePanelToggle('music')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activePanel === 'music' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            title="Music"
          >
            <img src="/assets/generated/music-icon.png" alt="Music" className="w-5 h-5" />
          </button>

          {/* Separator */}
          <div className="w-8 h-px bg-border my-1" />

          {/* Day/Night Terminator indicator */}
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-muted text-muted-foreground hover:bg-muted/80"
            title="Day/Night Terminator"
          >
            ☀️
          </button>

          {/* Twilight Zone indicator */}
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-muted text-muted-foreground hover:bg-muted/80"
            title="Twilight Zone"
          >
            🌙
          </button>

          {/* Global Control Button */}
          <button
            onClick={() => setShowGlobalControl(prev => !prev)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showGlobalControl ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            title="Global Control"
          >
            <img src="/assets/generated/world-button-icon-transparent.dim_32x32.png" alt="Global Control" className="w-6 h-6" />
          </button>

          {/* Time Controls Button — directly below Global Control */}
          <button
            onClick={() => setShowTimeControls(prev => !prev)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showTimeControls ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            title="Time Controls"
          >
            <Clock className="w-5 h-5" />
          </button>

          {/* Inline Time Controls — shown directly below the button when active */}
          {showTimeControls && (
            <TimeControls
              timeMode={tcTimeMode}
              isPlaying={tcIsAnimating}
              currentTime={tcCurrentDate}
              onTimeChange={setTcCurrentDate}
              onTimeModeChange={handleTcTimeModeChange}
              onPlayPause={handleTcPlayPause}
              compact
            />
          )}

          {/* Separator */}
          <div className="w-8 h-px bg-border my-1" />

          {/* Admin Button */}
          {isAuthenticated && (
            <button
              onClick={() => handlePanelToggle('admin')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activePanel === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              title="Admin"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {/* Layout Button */}
          {isAuthenticated && (
            <button
              onClick={() => handlePanelToggle('layout')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activePanel === 'layout' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              title="Layout"
            >
              <Layout className="w-5 h-5" />
            </button>
          )}

          {/* Login Button */}
          <button
            onClick={() => handlePanelToggle('login')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activePanel === 'login' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            title="Login"
          >
            <LogIn className="w-5 h-5" />
          </button>
        </aside>

        {/* Main View */}
        <main className="flex-1 relative overflow-hidden">
          {viewMode === 'globe' ? (
            <InteractiveGlobe
              showTerminator={true}
              showTwilight={true}
              flightAnimation={null}
            />
          ) : (
            <MapComponent
              coordinates={mapCoordinates}
              locationName={mapLocationName}
              journeyId={journeyId}
            />
          )}
        </main>

        {/* Right Panel - Slide-in panels */}
        {activePanel && (
          <aside className="w-80 bg-card border-l border-border overflow-y-auto shrink-0">
            {activePanel === 'travelogue' && (
              <TraveloguePanel
                onJourney2DMap={handleJourney2DMap}
              />
            )}
            {activePanel === 'citylogue' && (
              <CityloguePanel onSpotFocus={handleSpotFocus} />
            )}
            {activePanel === 'vibes' && (
              <VibesPanel
                onTravelSpotFocus={handleTravelSpotFocus}
                onBookmarkFocus={handleBookmarkFocus}
              />
            )}
            {activePanel === 'music' && (
              <MusicPanel onSongSelect={handleSongSelect} />
            )}
            {activePanel === 'admin' && (
              <AdminPanel />
            )}
            {activePanel === 'layout' && (
              <WebsiteLayoutPanel />
            )}
            {activePanel === 'login' && (
              <LoginPanel />
            )}
          </aside>
        )}
      </div>

      {/* Music Player Bar */}
      {showMusicBar && (
        <MusicPlayerBar
          currentSong={currentSong}
          onSongChange={setCurrentSong}
        />
      )}

      {/* Footer */}
      <footer className="px-4 py-1.5 bg-card border-t border-border text-center text-xs text-muted-foreground shrink-0">
        © {new Date().getFullYear()} World Explorer · Built with ❤️ using{' '}
        <a
          href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
