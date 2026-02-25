import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useGetAllMusicAlbums, useGetWebsiteLayoutPreferences } from '@/hooks/useQueries';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { Song } from '@/backend';
import { useFileUrl } from '@/blob-storage/FileStorage';

interface MusicPlayerBarProps {
  className?: string;
  currentSong?: Song & { albumTitle: string };
  onSongChange?: (song: Song & { albumTitle: string }) => void;
}

export default function MusicPlayerBar({ className = '', currentSong: externalCurrentSong, onSongChange }: MusicPlayerBarProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  
  const { data: musicAlbums = [] } = useGetAllMusicAlbums();
  const { data: layoutPreferences } = useGetWebsiteLayoutPreferences();
  
  // Check if music player should be visible based on user preferences
  const isMusicPlayerVisible = layoutPreferences?.showMusicPlayer !== false; // Default to true if not set
  
  // Get all songs from all albums
  const allSongs = musicAlbums.flatMap(album => 
    album.songs.map(song => ({
      ...song,
      albumTitle: album.title
    }))
  );

  const [internalCurrentSongIndex, setInternalCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use external current song if provided, otherwise use internal state
  const currentSong = externalCurrentSong || allSongs[internalCurrentSongIndex];
  const currentSongIndex = externalCurrentSong 
    ? allSongs.findIndex(song => song.filePath === externalCurrentSong.filePath)
    : internalCurrentSongIndex;

  const { data: currentSongUrl } = useFileUrl(currentSong?.filePath || '');

  // Update internal state when external song changes
  useEffect(() => {
    if (externalCurrentSong) {
      const index = allSongs.findIndex(song => song.filePath === externalCurrentSong.filePath);
      if (index !== -1) {
        setInternalCurrentSongIndex(index);
      }
    }
  }, [externalCurrentSong, allSongs]);

  // Initialize audio element when song changes and auto-play if a new song is selected
  useEffect(() => {
    if (currentSongUrl && currentSong) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(currentSongUrl);
      audioRef.current = audio;
      
      audio.volume = isMuted ? 0 : volume;
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('ended', () => {
        handleNext();
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setIsPlaying(false);
      });

      // Auto-play when a new song is selected from the music panel
      if (externalCurrentSong) {
        audio.addEventListener('canplay', () => {
          audio.play().then(() => {
            setIsPlaying(true);
          }).catch((error) => {
            console.error('Auto-play failed:', error);
            setIsPlaying(false);
          });
        });
      }

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        audio.pause();
        audio.remove();
      };
    }
  }, [currentSongUrl, currentSong?.filePath, externalCurrentSong]);

  // Update progress
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const handlePlayPause = async () => {
    if (!audioRef.current || !currentSong) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (allSongs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % allSongs.length;
    const nextSong = allSongs[nextIndex];
    
    setInternalCurrentSongIndex(nextIndex);
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Notify parent component if callback is provided
    if (onSongChange && nextSong) {
      onSongChange(nextSong);
    }
  };

  const handlePrevious = () => {
    if (allSongs.length === 0) return;
    const prevIndex = currentSongIndex === 0 ? allSongs.length - 1 : currentSongIndex - 1;
    const prevSong = allSongs[prevIndex];
    
    setInternalCurrentSongIndex(prevIndex);
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Notify parent component if callback is provided
    if (onSongChange && prevSong) {
      onSongChange(prevSong);
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVolume;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) {
        audioRef.current.volume = volume;
      }
    } else {
      setPreviousVolume(volume);
      setIsMuted(true);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if user is not authenticated, has no songs, or has disabled the music player
  if (!isAuthenticated || allSongs.length === 0 || !isMusicPlayerVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[2500] light-blue-music-player ${className}`}>
      <div className="flex items-center gap-3 px-4 py-2 max-w-7xl mx-auto">
        {/* Song Info - Compact Layout */}
        <div className="flex-1 min-w-0 max-w-xs">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm truncate text-blue-primary leading-tight">
                {currentSong?.title || 'Unknown Title'}
              </h4>
              <div className="flex items-center gap-1 text-xs text-blue-secondary">
                <span className="truncate">
                  {currentSong?.artist || 'Unknown Artist'}
                </span>
                {currentSong?.albumTitle && (
                  <>
                    <span className="text-blue-muted">•</span>
                    <span className="truncate">
                      {currentSong.albumTitle}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls - Compact */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePrevious}
            disabled={allSongs.length <= 1}
            className="h-7 w-7 rounded-full light-blue-control-btn"
          >
            <SkipBack className="h-3 w-3" />
          </Button>
          
          <Button
            size="sm"
            onClick={handlePlayPause}
            disabled={!currentSong || !currentSongUrl}
            className="h-8 w-8 rounded-full light-blue-play-btn"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleNext}
            disabled={allSongs.length <= 1}
            className="h-7 w-7 rounded-full light-blue-control-btn"
          >
            <SkipForward className="h-3 w-3" />
          </Button>
        </div>

        {/* Progress Section - Ultra Compact */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs text-blue-muted whitespace-nowrap font-mono">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="light-blue-progress-slider"
              disabled={!currentSong || !currentSongUrl}
            />
          </div>
          
          <span className="text-xs text-blue-muted whitespace-nowrap font-mono">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume Controls - Compact */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMuteToggle}
            className="h-7 w-7 rounded-full light-blue-control-btn"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </Button>
          
          <div className="w-16">
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="light-blue-volume-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
