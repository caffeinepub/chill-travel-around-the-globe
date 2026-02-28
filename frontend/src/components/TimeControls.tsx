import React from 'react';
import { Clock, Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type TimeMode = 'real' | 'hourly' | 'yearly';

export interface TimeControlsProps {
  /** The currently displayed date/time */
  currentDate: Date;
  /** Whether an animation (hourly or yearly) is currently running */
  isAnimating: boolean;
  /** Whether the yearly animation mode is active */
  isYearlyAnimation: boolean;
  /** Callback to toggle hourly play/pause */
  onToggleAnimation: () => void;
  /** Callback to start/pause the yearly animation */
  onPlayYearlyAnimation: () => void;
  /** Callback to pause the yearly animation */
  onPauseYearlyAnimation: () => void;
  /** Callback to sync back to real time */
  onSyncToRealTime: () => void;
  /** Format a date for hourly display */
  formatHourlyDate: (date: Date) => string;
  /** Format a date for yearly display */
  formatYearlyDate: (date: Date) => string;
}

/**
 * Standalone TimeControls component.
 * Renders the time display, Real/Hourly/Yearly mode buttons, and play/pause controls.
 * All state and handlers are passed in via props — this component is purely presentational.
 */
export default function TimeControls({
  currentDate,
  isAnimating,
  isYearlyAnimation,
  onToggleAnimation,
  onPlayYearlyAnimation,
  onPauseYearlyAnimation,
  onSyncToRealTime,
  formatHourlyDate,
  formatYearlyDate,
}: TimeControlsProps) {
  const isHourlyAnimating = isAnimating && !isYearlyAnimation;
  const isYearlyAnimating = isAnimating && isYearlyAnimation;

  return (
    <div className="flex flex-col gap-2">
      {/* Current date/time display */}
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-black/30 backdrop-blur-sm border border-white/20">
        <Clock className="h-3 w-3 text-white/70 shrink-0" />
        <span className="text-xs text-white/90 font-mono leading-tight">
          {isYearlyAnimation
            ? formatYearlyDate(currentDate)
            : formatHourlyDate(currentDate)}
        </span>
      </div>

      {/* Mode buttons row */}
      <div className="flex items-center gap-1">
        {/* Real-time sync button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onSyncToRealTime}
          className="h-7 px-2 text-xs text-white/80 hover:text-white hover:bg-white/20 bg-black/20 backdrop-blur-sm border border-white/20 rounded"
          title="Sync to real time"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Real
        </Button>

        {/* Hourly animation button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={isHourlyAnimating ? onToggleAnimation : onToggleAnimation}
          className={`h-7 px-2 text-xs hover:text-white hover:bg-white/20 backdrop-blur-sm border rounded ${
            isHourlyAnimating
              ? 'text-white bg-white/30 border-white/40'
              : 'text-white/80 bg-black/20 border-white/20'
          }`}
          title={isHourlyAnimating ? 'Pause hourly animation' : 'Play hourly animation'}
        >
          {isHourlyAnimating ? (
            <Pause className="h-3 w-3 mr-1" />
          ) : (
            <Play className="h-3 w-3 mr-1" />
          )}
          Hourly
        </Button>

        {/* Yearly animation button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={isYearlyAnimating ? onPauseYearlyAnimation : onPlayYearlyAnimation}
          className={`h-7 px-2 text-xs hover:text-white hover:bg-white/20 backdrop-blur-sm border rounded ${
            isYearlyAnimating
              ? 'text-white bg-white/30 border-white/40'
              : 'text-white/80 bg-black/20 border-white/20'
          }`}
          title={isYearlyAnimating ? 'Pause yearly animation' : 'Play yearly animation (full year)'}
        >
          {isYearlyAnimating ? (
            <Pause className="h-3 w-3 mr-1" />
          ) : (
            <FastForward className="h-3 w-3 mr-1" />
          )}
          Yearly
        </Button>
      </div>
    </div>
  );
}
