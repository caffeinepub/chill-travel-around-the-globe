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
  const isMusicPlayerVisible = layoutPreferences?.showMusicPlayer !== false;

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

      audio.addEventListener('error', () => {
        setIsPlaying(false);
      });

      // Auto-play when a new song is selected from the music panel
      if (externalCurrentSong) {
        audio.addEventListener('canplay', () => {
          audio.play().then(() => {
            setIsPlaying(true);
          }).catch(() => {
            setIsPlaying(false);
          });
        }, { once: true });
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentSongUrl]);

  // Progress tracking
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleNext = () => {
    if (allSongs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % allSongs.length;
    setInternalCurrentSongIndex(nextIndex);
    if (onSongChange) {
      onSongChange(allSongs[nextIndex]);
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handlePrev = () => {
    if (allSongs.length === 0) return;
    const prevIndex = (currentSongIndex - 1 + allSongs.length) % allSongs.length;
    setInternalCurrentSongIndex(prevIndex);
    if (onSongChange) {
      onSongChange(allSongs[prevIndex]);
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleVolumeToggle = () => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.volume = previousVolume;
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const handleProgressChange = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated || !isMusicPlayerVisible || allSongs.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 bg-blue-50/90 dark:bg-blue-950/90 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 rounded-full shadow-sm ${className}`}>
      {/* Song info */}
      <div className="flex-1 min-w-0 max-w-32">
        <p className="text-xs font-medium truncate text-blue-900 dark:text-blue-100">
          {currentSong?.title || 'Unknown'}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
          {currentSong?.artist || currentSong?.albumTitle || ''}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
          onClick={handlePrev}
        >
          <SkipBack className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
          onClick={handlePlayPause}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
          onClick={handleNext}
        >
          <SkipForward className="h-3 w-3" />
        </Button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">{formatTime(currentTime)}</span>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleProgressChange}
          className="flex-1 min-w-12"
        />
        <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">{formatTime(duration)}</span>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
          onClick={handleVolumeToggle}
        >
          {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.05}
          onValueChange={handleVolumeChange}
          className="w-16"
        />
      </div>
    </div>
  );
}
