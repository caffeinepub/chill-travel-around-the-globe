import React from 'react';
import { Play, Pause } from 'lucide-react';

type TimeMode = 'real' | 'hourly' | 'yearly';

interface TimeControlsProps {
  timeMode: TimeMode;
  isPlaying: boolean;
  currentTime: Date;
  onTimeChange: (date: Date) => void;
  onTimeModeChange: (mode: TimeMode) => void;
  onPlayPause: () => void;
  /** When true, renders a compact vertical layout for the left sidebar */
  compact?: boolean;
}

export default function TimeControls({
  timeMode,
  isPlaying,
  currentTime,
  onTimeModeChange,
  onPlayPause,
  compact = false,
}: TimeControlsProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatYear = (date: Date) => {
    return date.getFullYear().toString();
  };

  if (compact) {
    // Compact vertical layout for the left sidebar (w-14 = 56px wide)
    return (
      <div className="w-full flex flex-col items-center gap-1 px-1 py-2 bg-muted/50 rounded-xl border border-border">
        {/* Current time display */}
        <div className="flex flex-col items-center leading-tight">
          <span className="text-[9px] font-bold text-foreground tabular-nums">{formatTime(currentTime)}</span>
          <span className="text-[8px] text-muted-foreground tabular-nums">{formatDate(currentTime)}</span>
          <span className="text-[8px] text-muted-foreground tabular-nums">{formatYear(currentTime)}</span>
        </div>

        {/* Mode buttons — stacked vertically */}
        <div className="flex flex-col items-center gap-0.5 w-full">
          {(['real', 'hourly', 'yearly'] as TimeMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => onTimeModeChange(mode)}
              className={`w-full px-1 py-0.5 rounded text-[8px] font-medium transition-colors capitalize leading-tight ${
                timeMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Play/Pause button */}
        <button
          onClick={onPlayPause}
          disabled={timeMode === 'real'}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors mt-0.5 ${
            timeMode === 'real'
              ? 'bg-muted text-muted-foreground opacity-40 cursor-not-allowed'
              : isPlaying
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
          title={isPlaying ? 'Pause animation' : 'Play animation'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Status indicator */}
        <div className="text-[7px] text-muted-foreground text-center leading-tight px-0.5">
          {timeMode === 'real' && 'Live'}
          {timeMode === 'hourly' && (isPlaying ? '▶ 24h' : '⏸ 24h')}
          {timeMode === 'yearly' && (isPlaying ? '▶ yr' : '⏸ yr')}
        </div>
      </div>
    );
  }

  // Default horizontal layout (kept for potential future use)
  return (
    <div className="shrink-0 bg-card border-t border-border px-4 py-2 flex items-center gap-4">
      {/* Current Time */}
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">{formatTime(currentTime)}</span>
        <span className="text-xs text-muted-foreground">{formatDate(currentTime)} {formatYear(currentTime)}</span>
      </div>

      {/* Mode Buttons */}
      <div className="flex items-center gap-1">
        {(['real', 'hourly', 'yearly'] as TimeMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => onTimeModeChange(mode)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors capitalize ${
              timeMode === mode
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Play/Pause */}
      <button
        onClick={onPlayPause}
        disabled={timeMode === 'real'}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          timeMode === 'real'
            ? 'bg-muted text-muted-foreground opacity-40 cursor-not-allowed'
            : isPlaying
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>

      {/* Description */}
      <span className="text-xs text-muted-foreground hidden sm:block">
        {timeMode === 'real' && 'Live time — terminator updates in real time'}
        {timeMode === 'hourly' && 'Hourly — animate terminator through 24h'}
        {timeMode === 'yearly' && 'Yearly — animate terminator through seasons'}
      </span>
    </div>
  );
}
