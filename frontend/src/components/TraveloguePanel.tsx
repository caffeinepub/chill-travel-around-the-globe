import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Map, BookOpen, Scroll, Calendar, MapPin } from 'lucide-react';
import { useGetAllJourneys } from '../hooks/useQueries';
import type { Journey } from '../backend';
import { getJourneyKey } from '../lib/journeyUtils';
import DoodleItineraryDialogContent from './itinerary/DoodleItineraryDialogContent';
import RetroItineraryDialogContent from './itinerary/RetroItineraryDialogContent';

interface TraveloguePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onShowCityOnMap?: (city: string) => void;
}

type ItineraryStyle = 'doodle' | 'retro';

interface ItineraryDialogState {
  open: boolean;
  journey: Journey | null;
  style: ItineraryStyle;
}

function formatDate(dateNs: bigint): string {
  const ms = Number(dateNs) / 1_000_000;
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getJourneyStatus(journey: Journey): 'live' | 'upcoming' | 'past' {
  const now = Date.now() * 1_000_000;
  const start = Number(journey.startDate);
  const end = Number(journey.endDate);
  if (now >= start && now <= end) return 'live';
  if (now < start) return 'upcoming';
  return 'past';
}

function JourneyCard({
  journey,
  onShowOnMap,
  onOpenItinerary,
}: {
  journey: Journey;
  onShowOnMap: (city: string) => void;
  onOpenItinerary: (journey: Journey, style: ItineraryStyle) => void;
}) {
  const status = getJourneyStatus(journey);

  const statusBadge = {
    live: <Badge className="bg-green-500 text-white text-xs">🟢 Live</Badge>,
    upcoming: <Badge className="bg-blue-500 text-white text-xs">🔵 Upcoming</Badge>,
    past: <Badge variant="secondary" className="text-xs">Past</Badge>,
  }[status];

  return (
    <div className="border border-border rounded-xl p-4 bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">
              {journey.title || journey.city}
            </h3>
            {statusBadge}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-xs">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{journey.city}</span>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <Calendar className="w-3 h-3 shrink-0" />
        <span>
          {formatDate(journey.startDate)} – {formatDate(journey.endDate)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2 gap-1"
          onClick={() => onShowOnMap(journey.city)}
        >
          <Map className="w-3 h-3" />
          2D Map
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2 gap-1"
          onClick={() => onOpenItinerary(journey, 'doodle')}
        >
          <BookOpen className="w-3 h-3" />
          Doodle
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2 gap-1"
          onClick={() => onOpenItinerary(journey, 'retro')}
        >
          <Scroll className="w-3 h-3" />
          Retro
        </Button>
      </div>
    </div>
  );
}

export default function TraveloguePanel({
  isOpen,
  onClose,
  onShowCityOnMap,
}: TraveloguePanelProps) {
  const { data: journeys, isLoading } = useGetAllJourneys();
  const [itineraryDialog, setItineraryDialog] = useState<ItineraryDialogState>({
    open: false,
    journey: null,
    style: 'doodle',
  });

  const handleShowOnMap = (city: string) => {
    onShowCityOnMap?.(city);
    onClose();
  };

  const handleOpenItinerary = (journey: Journey, style: ItineraryStyle) => {
    setItineraryDialog({ open: true, journey, style });
  };

  const handleCloseItinerary = () => {
    setItineraryDialog((prev) => ({ ...prev, open: false }));
  };

  // Sort journeys: live first, then upcoming, then past
  const sortedJourneys = React.useMemo(() => {
    if (!journeys) return [];
    return [...journeys].sort((a, b) => {
      const order = { live: 0, upcoming: 1, past: 2 };
      const aStatus = getJourneyStatus(a);
      const bStatus = getJourneyStatus(b);
      if (order[aStatus] !== order[bStatus]) return order[aStatus] - order[bStatus];
      return Number(b.startDate - a.startDate);
    });
  }, [journeys]);

  const activeJourney = itineraryDialog.journey;
  const activeJourneyKey = activeJourney ? getJourneyKey(activeJourney) : '';

  return (
    <>
      {/* Main Travelogue Panel Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg w-full max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-primary" />
              Travelogue
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : sortedJourneys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">🗺️</div>
                <p className="text-muted-foreground">No journeys yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add journeys in the Admin Panel to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {sortedJourneys.map((journey) => (
                  <JourneyCard
                    key={`${journey.city}-${journey.createdAt}`}
                    journey={journey}
                    onShowOnMap={handleShowOnMap}
                    onOpenItinerary={handleOpenItinerary}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Itinerary Dialog */}
      <Dialog open={itineraryDialog.open} onOpenChange={(open) => !open && handleCloseItinerary()}>
        <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {itineraryDialog.style === 'doodle' ? (
                <BookOpen className="w-5 h-5 text-pink-500" />
              ) : (
                <Scroll className="w-5 h-5 text-amber-600" />
              )}
              <span>
                {itineraryDialog.style === 'doodle' ? 'Doodle Itinerary' : 'Retro Itinerary'}
                {activeJourney && (
                  <span className="text-muted-foreground font-normal ml-2 text-sm">
                    — {activeJourney.title || activeJourney.city}
                  </span>
                )}
              </span>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            {activeJourney && itineraryDialog.style === 'doodle' && (
              <DoodleItineraryDialogContent
                journeyKey={activeJourneyKey}
                journeyCity={activeJourney.city}
              />
            )}
            {activeJourney && itineraryDialog.style === 'retro' && (
              <RetroItineraryDialogContent
                journeyKey={activeJourneyKey}
                journeyCity={activeJourney.city}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
