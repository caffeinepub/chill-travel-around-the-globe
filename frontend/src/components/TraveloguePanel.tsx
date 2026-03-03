import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  MapPin, Calendar, Clock, ChevronDown, ChevronUp, Plane,
  BookOpen, Scroll, List, Navigation, Globe
} from 'lucide-react';
import { useGetAllJourneys, useGetJourneyScheduleWithDays } from '@/hooks/useQueries';
import { Journey, ScheduleItem } from '@/backend';
import DoodleItineraryDialogContent from './itinerary/DoodleItineraryDialogContent';
import RetroItineraryDialogContent from './itinerary/RetroItineraryDialogContent';

interface TraveloguePanelProps {
  onFlightAnimation?: (fromCity: string, toCity: string, fromCoords: { lat: number; lon: number }, toCoords: { lat: number; lon: number }) => void;
  onJourney2DMap?: (journeyId: string) => void;
}

function formatDate(time: bigint): string {
  const date = new Date(Number(time) / 1_000_000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(start: bigint, end: bigint): string {
  const ms = Number(end - start) / 1_000_000;
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `${days} day${days !== 1 ? 's' : ''}`;
}

function SchedulePreview({ journeyId }: { journeyId: string }) {
  const { data: scheduleDays, isLoading } = useGetJourneyScheduleWithDays(journeyId);

  if (isLoading) {
    return <div className="text-xs text-muted-foreground py-2">Loading schedule…</div>;
  }
  if (!scheduleDays || scheduleDays.length === 0) {
    return <div className="text-xs text-muted-foreground py-2 italic">No schedule items yet.</div>;
  }

  return (
    <div className="space-y-3 mt-2">
      {scheduleDays.map(([dayLabel, items]: [string, ScheduleItem[]]) => (
        <div key={dayLabel}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">{dayLabel}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-1 pl-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <Clock className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-12 shrink-0">{item.time}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{item.activity}</span>
                  {item.location && (
                    <span className="text-muted-foreground ml-1">@ {item.location}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface JourneyCardProps {
  journey: Journey;
  status: 'live' | 'upcoming' | 'past';
  onFlightAnimation?: TraveloguePanelProps['onFlightAnimation'];
  onJourney2DMap?: TraveloguePanelProps['onJourney2DMap'];
}

function JourneyCard({ journey, status, onFlightAnimation, onJourney2DMap }: JourneyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [retroOpen, setRetroOpen] = useState(false);

  const statusConfig = {
    live: { label: 'Live', className: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' },
    upcoming: { label: 'Upcoming', className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    past: { label: 'Past', className: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30' },
  };

  const cfg = statusConfig[status];

  const geocodeCity = async (cityName: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`,
        { headers: { 'User-Agent': 'LocationMapExplorer/1.0' } }
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleFly = async () => {
    if (!onFlightAnimation) return;
    const fromCoords = await geocodeCity('London');
    const toCoords = await geocodeCity(journey.city);
    if (fromCoords && toCoords) {
      onFlightAnimation('London', journey.city, fromCoords, toCoords);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden transition-all hover:border-primary/30">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.className}`}>
                {cfg.label}
              </span>
              {status === 'live' && (
                <span className="flex items-center gap-1 text-[10px] text-green-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  In Progress
                </span>
              )}
            </div>
            <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{journey.title}</h3>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">{journey.city}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">{formatDuration(journey.startDate, journey.endDate)}</div>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{formatDate(journey.startDate)}</span>
          <span>→</span>
          <span>{formatDate(journey.endDate)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {onFlightAnimation && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 px-2"
              onClick={handleFly}
            >
              <Plane className="w-3 h-3" />
              Fly
            </Button>
          )}
          {onJourney2DMap && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 px-2"
              onClick={() => onJourney2DMap(journey.title)}
            >
              <Navigation className="w-3 h-3" />
              Map
            </Button>
          )}

          {/* Doodle Itinerary */}
          <Dialog open={itineraryOpen} onOpenChange={setItineraryOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2">
                <BookOpen className="w-3 h-3" />
                Doodle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto z-[3200]">
              <DoodleItineraryDialogContent journey={journey} />
            </DialogContent>
          </Dialog>

          {/* Retro Itinerary */}
          <Dialog open={retroOpen} onOpenChange={setRetroOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2">
                <Scroll className="w-3 h-3" />
                Retro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto z-[3200]">
              <RetroItineraryDialogContent journey={journey} />
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 px-2 ml-auto"
            onClick={() => setExpanded(!expanded)}
          >
            <List className="w-3 h-3" />
            Schedule
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Expandable Schedule */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3">
          <SchedulePreview journeyId={journey.title} />
        </div>
      )}
    </div>
  );
}

function TravelStats({ journeys }: { journeys: Journey[] }) {
  const cities = new Set(journeys.map(j => j.city));
  const totalDays = journeys.reduce((acc, j) => {
    const ms = Number(j.endDate - j.startDate) / 1_000_000;
    return acc + Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, 0);

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
        <div className="text-2xl font-bold text-primary">{journeys.length}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Journeys</div>
      </div>
      <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
        <div className="text-2xl font-bold text-primary">{cities.size}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Cities</div>
      </div>
      <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
        <div className="text-2xl font-bold text-primary">{totalDays}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Days</div>
      </div>
    </div>
  );
}

export default function TraveloguePanel({ onFlightAnimation, onJourney2DMap }: TraveloguePanelProps) {
  const [open, setOpen] = useState(false);
  const { data: allJourneys = [] } = useGetAllJourneys();

  const now = Date.now();

  const liveJourneys = allJourneys.filter(j => {
    const start = Number(j.startDate) / 1_000_000;
    const end = Number(j.endDate) / 1_000_000;
    return start <= now && end >= now;
  }).sort((a, b) => Number(b.startDate) - Number(a.startDate));

  const upcomingJourneys = allJourneys.filter(j => {
    return Number(j.startDate) / 1_000_000 > now;
  }).sort((a, b) => Number(a.startDate) - Number(b.startDate));

  const pastJourneys = allJourneys.filter(j => {
    return Number(j.endDate) / 1_000_000 < now;
  }).sort((a, b) => Number(b.startDate) - Number(a.startDate));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
          title="World Travel"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden z-[3100]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5 text-primary" />
              World Travel
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mt-1">Your journey log and travel itineraries</p>
          <div className="mt-4">
            <TravelStats journeys={allJourneys} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="live" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-3 shrink-0">
              <TabsList className="w-full grid grid-cols-3 h-8">
                <TabsTrigger value="live" className="text-xs gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Live
                  {liveJourneys.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">{liveJourneys.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="text-xs gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Upcoming
                  {upcomingJourneys.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">{upcomingJourneys.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="past" className="text-xs gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Past
                  {pastJourneys.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">{pastJourneys.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="live" className="flex-1 overflow-hidden mt-0 px-6 pb-6 pt-3">
              <ScrollArea className="h-[400px]">
                {liveJourneys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Plane className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No active journeys right now</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Check upcoming journeys for what's next</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-2">
                    {liveJourneys.map(j => (
                      <JourneyCard key={j.title} journey={j} status="live"
                        onFlightAnimation={onFlightAnimation} onJourney2DMap={onJourney2DMap} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="upcoming" className="flex-1 overflow-hidden mt-0 px-6 pb-6 pt-3">
              <ScrollArea className="h-[400px]">
                {upcomingJourneys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No upcoming journeys planned</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Add journeys in the admin panel</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-2">
                    {upcomingJourneys.map(j => (
                      <JourneyCard key={j.title} journey={j} status="upcoming"
                        onFlightAnimation={onFlightAnimation} onJourney2DMap={onJourney2DMap} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="past" className="flex-1 overflow-hidden mt-0 px-6 pb-6 pt-3">
              <ScrollArea className="h-[400px]">
                {pastJourneys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No past journeys yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Your travel history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-2">
                    {pastJourneys.map(j => (
                      <JourneyCard key={j.title} journey={j} status="past"
                        onFlightAnimation={onFlightAnimation} onJourney2DMap={onJourney2DMap} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
