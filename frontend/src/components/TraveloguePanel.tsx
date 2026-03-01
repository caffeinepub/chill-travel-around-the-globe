import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plane, MapPin, Calendar, Clock, ChevronRight, Globe, BookOpen, Scroll } from 'lucide-react';
import { useGetAllJourneys, useGetScheduleItems } from '@/hooks/useQueries';
import { Journey } from '@/backend';
import DoodleItineraryDialogContent from './itinerary/DoodleItineraryDialogContent';
import RetroItineraryDialogContent from './itinerary/RetroItineraryDialogContent';

interface TraveloguePanelProps {
  onJourney2DMap?: (journeyId: string, city: string) => void;
  onFlightAnimation?: (fromCity: string, toCity: string) => void;
}

function formatDateShort(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDurationDays(start: bigint, end: bigint): number {
  const ms = Number(end - start) / 1_000_000;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function getJourneyStatus(journey: Journey): 'live' | 'upcoming' | 'past' {
  const now = BigInt(Date.now()) * BigInt(1_000_000);
  if (journey.startDate <= now && now <= journey.endDate) return 'live';
  if (journey.startDate > now) return 'upcoming';
  return 'past';
}

interface JourneyCardProps {
  journey: Journey;
  status: 'live' | 'upcoming' | 'past';
  onMapClick?: (journeyId: string, city: string) => void;
  onFlightClick?: (city: string) => void;
}

function JourneyCard({ journey, status, onMapClick, onFlightClick }: JourneyCardProps) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showDoodle, setShowDoodle] = useState(false);
  const [showRetro, setShowRetro] = useState(false);
  const { data: scheduleItems } = useGetScheduleItems(journey.title);

  const statusColors = {
    live: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    upcoming: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    past: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };

  const statusDot = {
    live: 'bg-emerald-400 animate-pulse',
    upcoming: 'bg-blue-400',
    past: 'bg-slate-400',
  };

  const duration = getDurationDays(journey.startDate, journey.endDate);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      {/* Card Header */}
      <div className="px-3 py-2.5 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${statusDot[status]}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{journey.title}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-white/40 flex-shrink-0" />
              <p className="text-xs text-white/50 truncate">{journey.city}</p>
            </div>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ${statusColors[status]}`}>
          {status === 'live' ? 'LIVE' : status === 'upcoming' ? 'SOON' : 'PAST'}
        </span>
      </div>

      {/* Date & Duration Row */}
      <div className="px-3 pb-2 flex items-center gap-3 text-xs text-white/40">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{formatDateShort(journey.startDate)} – {formatDateShort(journey.endDate)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{duration}d</span>
        </div>
        {scheduleItems && scheduleItems.length > 0 && (
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>{scheduleItems.length} items</span>
          </div>
        )}
      </div>

      <Separator className="bg-white/10" />

      {/* Actions Row */}
      <div className="px-2 py-1.5 flex items-center gap-1 flex-wrap">
        {onMapClick && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => onMapClick(journey.title, journey.city)}
          >
            <MapPin className="w-3 h-3 mr-1" />
            Map
          </Button>
        )}
        {onFlightClick && status !== 'past' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => onFlightClick(journey.city)}
          >
            <Plane className="w-3 h-3 mr-1" />
            Fly
          </Button>
        )}
        {scheduleItems && scheduleItems.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setShowSchedule(!showSchedule)}
            >
              <ChevronRight className={`w-3 h-3 mr-1 transition-transform ${showSchedule ? 'rotate-90' : ''}`} />
              Schedule
            </Button>
            <Dialog open={showDoodle} onOpenChange={setShowDoodle}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Doodle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-white/20">
                <DoodleItineraryDialogContent journey={journey} />
              </DialogContent>
            </Dialog>
            <Dialog open={showRetro} onOpenChange={setShowRetro}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10">
                  <Scroll className="w-3 h-3 mr-1" />
                  Retro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-white/20">
                <RetroItineraryDialogContent journey={journey} />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Inline Schedule Preview */}
      {showSchedule && scheduleItems && scheduleItems.length > 0 && (
        <div className="border-t border-white/10 bg-black/20 px-3 py-2 space-y-1">
          {scheduleItems.slice(0, 4).map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <span className="text-white/30 w-10 flex-shrink-0">{item.time}</span>
              <span className="text-white/70 truncate">{item.activity}</span>
            </div>
          ))}
          {scheduleItems.length > 4 && (
            <p className="text-[10px] text-white/30 pt-0.5">+{scheduleItems.length - 4} more items</p>
          )}
        </div>
      )}
    </div>
  );
}

interface JourneySectionProps {
  title: string;
  journeys: Journey[];
  status: 'live' | 'upcoming' | 'past';
  onMapClick?: (journeyId: string, city: string) => void;
  onFlightClick?: (city: string) => void;
  defaultOpen?: boolean;
}

function JourneySection({ title, journeys, status, onMapClick, onFlightClick, defaultOpen = false }: JourneySectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (journeys.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-1 py-1 text-left group"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">{title}</span>
          <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-full">{journeys.length}</span>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 text-white/30 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="mt-1.5 space-y-2">
          {journeys.map((journey) => (
            <JourneyCard
              key={journey.title}
              journey={journey}
              status={status}
              onMapClick={onMapClick}
              onFlightClick={onFlightClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TraveloguePanel({ onJourney2DMap, onFlightAnimation }: TraveloguePanelProps) {
  const [open, setOpen] = useState(false);
  const { data: allJourneys = [] } = useGetAllJourneys();

  const now = BigInt(Date.now()) * BigInt(1_000_000);
  const liveJourneys = allJourneys.filter(j => j.startDate <= now && now <= j.endDate);
  const upcomingJourneys = allJourneys.filter(j => j.startDate > now);
  const pastJourneys = allJourneys.filter(j => j.endDate < now);

  const totalJourneys = allJourneys.length;

  const handleMapClick = (journeyId: string, city: string) => {
    onJourney2DMap?.(journeyId, city);
    setOpen(false);
  };

  const handleFlightClick = (city: string) => {
    onFlightAnimation?.(city, city);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-sm"
          title="World Travel"
        >
          <img src="/assets/generated/world-button-icon-transparent.dim_32x32.png" alt="World Travel" className="w-5 h-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xs w-[320px] bg-slate-900/95 border-white/15 backdrop-blur-xl text-white p-0 gap-0 max-h-[75vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white">World Travel</DialogTitle>
              <p className="text-[10px] text-white/40 mt-0.5">
                {totalJourneys} {totalJourneys === 1 ? 'journey' : 'journeys'} total
              </p>
            </div>
          </div>
        </DialogHeader>

        <Separator className="bg-white/10 flex-shrink-0" />

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 py-3 space-y-3">
            {totalJourneys === 0 ? (
              <div className="text-center py-8">
                <Globe className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-xs text-white/40">No journeys yet</p>
                <p className="text-[10px] text-white/25 mt-1">Add journeys in the Admin panel</p>
              </div>
            ) : (
              <>
                <JourneySection
                  title="Live"
                  journeys={liveJourneys}
                  status="live"
                  onMapClick={handleMapClick}
                  onFlightClick={handleFlightClick}
                  defaultOpen={true}
                />
                {liveJourneys.length > 0 && (upcomingJourneys.length > 0 || pastJourneys.length > 0) && (
                  <Separator className="bg-white/10" />
                )}
                <JourneySection
                  title="Upcoming"
                  journeys={upcomingJourneys}
                  status="upcoming"
                  onMapClick={handleMapClick}
                  onFlightClick={handleFlightClick}
                  defaultOpen={upcomingJourneys.length > 0 && liveJourneys.length === 0}
                />
                {upcomingJourneys.length > 0 && pastJourneys.length > 0 && (
                  <Separator className="bg-white/10" />
                )}
                <JourneySection
                  title="Past"
                  journeys={pastJourneys}
                  status="past"
                  onMapClick={handleMapClick}
                  onFlightClick={handleFlightClick}
                  defaultOpen={pastJourneys.length > 0 && liveJourneys.length === 0 && upcomingJourneys.length === 0}
                />
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
