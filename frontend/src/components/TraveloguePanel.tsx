import React, { useState } from 'react';
import { Journey } from '../backend';
import {
  useGetAllJourneys,
  useAddJourney,
  useUpdateJourney,
  useDeleteJourney,
} from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Map as MapIcon,
  BookOpen,
  Loader2,
  Calendar,
} from 'lucide-react';
import DoodleItineraryDialogContent from './itinerary/DoodleItineraryDialogContent';
import RetroItineraryDialogContent from './itinerary/RetroItineraryDialogContent';

interface TraveloguePanelProps {
  onJourneySelect?: (journey: Journey) => void;
  selectedJourney?: Journey | null;
  onFlightAnimation?: (
    fromCity: string,
    toCity: string,
    fromCoords: { lat: number; lon: number },
    toCoords: { lat: number; lon: number }
  ) => void;
  onJourney2DMap?: (journeyCity: string) => void;
}

type ItineraryStyle = 'doodle' | 'retro';

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateRange(startTimestamp: bigint, endTimestamp: bigint): string {
  return `${formatDate(startTimestamp)} – ${formatDate(endTimestamp)}`;
}

function formatScheduleDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timeString: string): string {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getJourneyStatus(journey: Journey): 'live' | 'upcoming' | 'past' {
  const now = BigInt(Date.now()) * BigInt(1_000_000);
  if (journey.startDate <= now && now <= journey.endDate) return 'live';
  if (journey.startDate > now) return 'upcoming';
  return 'past';
}

function getJourneyLabel(journey: Journey): string {
  if (journey.customTitle) return journey.customTitle;
  return `${formatDate(journey.startDate)} – ${formatDate(journey.endDate)}`;
}

// Group journeys by city — use a plain object to avoid shadowing the global Map type
function groupJourneysByCity(journeys: Journey[]): Record<string, Journey[]> {
  const groups: Record<string, Journey[]> = {};
  for (const journey of journeys) {
    if (!groups[journey.city]) groups[journey.city] = [];
    groups[journey.city].push(journey);
  }
  return groups;
}

interface JourneyFormData {
  city: string;
  customTitle: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

const defaultFormData: JourneyFormData = {
  city: '',
  customTitle: '',
  startDate: '',
  startTime: '00:00',
  endDate: '',
  endTime: '23:59',
};

export default function TraveloguePanel({
  onJourneySelect,
  selectedJourney,
  onFlightAnimation,
  onJourney2DMap,
}: TraveloguePanelProps) {
  const { data: journeys = [], isLoading } = useGetAllJourneys();
  const addJourney = useAddJourney();
  const updateJourney = useUpdateJourney();
  const deleteJourney = useDeleteJourney();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [deletingJourney, setDeletingJourney] = useState<Journey | null>(null);
  const [formData, setFormData] = useState<JourneyFormData>(defaultFormData);
  const [itineraryJourney, setItineraryJourney] = useState<Journey | null>(null);
  const [itineraryStyle, setItineraryStyle] = useState<ItineraryStyle>('doodle');
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  // Separate journeys by status
  const liveJourneys = journeys.filter(j => getJourneyStatus(j) === 'live');
  const upcomingJourneys = journeys.filter(j => getJourneyStatus(j) === 'upcoming');
  const pastJourneys = journeys.filter(j => getJourneyStatus(j) === 'past');

  const toggleCity = (city: string) => {
    setExpandedCities(prev => {
      const next = new Set(prev);
      if (next.has(city)) {
        next.delete(city);
      } else {
        next.add(city);
      }
      return next;
    });
  };

  const openAddDialog = () => {
    setFormData(defaultFormData);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (journey: Journey) => {
    const start = new Date(Number(journey.startDate) / 1_000_000);
    const end = new Date(Number(journey.endDate) / 1_000_000);
    setFormData({
      city: journey.city,
      customTitle: journey.customTitle || '',
      startDate: start.toISOString().split('T')[0],
      startTime: start.toTimeString().slice(0, 5),
      endDate: end.toISOString().split('T')[0],
      endTime: end.toTimeString().slice(0, 5),
    });
    setEditingJourney(journey);
  };

  const handleSubmitAdd = async () => {
    if (!formData.city || !formData.startDate || !formData.endDate) return;
    const startMs = new Date(`${formData.startDate}T${formData.startTime}`).getTime();
    const endMs = new Date(`${formData.endDate}T${formData.endTime}`).getTime();
    await addJourney.mutateAsync({
      city: formData.city,
      customTitle: formData.customTitle.trim() || null,
      startDate: BigInt(startMs) * BigInt(1_000_000),
      endDate: BigInt(endMs) * BigInt(1_000_000),
    });
    setIsAddDialogOpen(false);
    setFormData(defaultFormData);
  };

  const handleSubmitEdit = async () => {
    if (!editingJourney || !formData.city || !formData.startDate || !formData.endDate) return;
    const startMs = new Date(`${formData.startDate}T${formData.startTime}`).getTime();
    const endMs = new Date(`${formData.endDate}T${formData.endTime}`).getTime();
    await updateJourney.mutateAsync({
      id: editingJourney.id,
      city: formData.city,
      customTitle: formData.customTitle.trim() || null,
      startDate: BigInt(startMs) * BigInt(1_000_000),
      endDate: BigInt(endMs) * BigInt(1_000_000),
    });
    setEditingJourney(null);
    setFormData(defaultFormData);
  };

  const handleDelete = async () => {
    if (!deletingJourney) return;
    await deleteJourney.mutateAsync(deletingJourney.id);
    setDeletingJourney(null);
  };

  const renderJourneyCard = (journey: Journey) => {
    const status = getJourneyStatus(journey);
    const label = getJourneyLabel(journey);
    const isSelected = selectedJourney?.id === journey.id;

    return (
      <div
        key={String(journey.id)}
        className={`rounded-lg border p-3 cursor-pointer transition-all ${
          isSelected
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:border-primary/50 hover:bg-accent/30'
        }`}
        onClick={() => onJourneySelect?.(journey)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">{label}</span>
              {status === 'live' && (
                <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600 shrink-0">
                  Live
                </Badge>
              )}
              {status === 'upcoming' && (
                <Badge variant="outline" className="text-xs shrink-0">
                  Upcoming
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(journey.startDate)} – {formatDate(journey.endDate)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={e => {
                e.stopPropagation();
                setItineraryStyle('doodle');
                setItineraryJourney(journey);
              }}
              title="Doodle Itinerary"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={e => {
                e.stopPropagation();
                if (onJourney2DMap) {
                  onJourney2DMap(journey.city);
                } else {
                  onJourneySelect?.(journey);
                }
              }}
              title="View on 2D Map"
            >
              <MapIcon className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={e => { e.stopPropagation(); openEditDialog(journey); }}
              title="Edit Journey"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={e => { e.stopPropagation(); setDeletingJourney(journey); }}
              title="Delete Journey"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCityGroup = (city: string, cityJourneys: Journey[]) => {
    const isExpanded = expandedCities.has(city);
    const hasLive = cityJourneys.some(j => getJourneyStatus(j) === 'live');

    return (
      <Collapsible key={city} open={isExpanded} onOpenChange={() => toggleCity(city)}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">{city}</span>
              <span className="text-xs text-muted-foreground">({cityJourneys.length})</span>
              {hasLive && (
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Has live journey" />
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 ml-3 pl-3 border-l border-border space-y-2 pb-1">
            {cityJourneys.map(journey => renderJourneyCard(journey))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderStatusSection = (
    title: string,
    sectionJourneys: Journey[],
    badgeColor?: string
  ) => {
    if (sectionJourneys.length === 0) return null;
    const grouped = groupJourneysByCity(sectionJourneys);

    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h3>
          {badgeColor && (
            <span className={`inline-block w-2 h-2 rounded-full ${badgeColor}`} />
          )}
        </div>
        <div className="space-y-1">
          {Object.entries(grouped).map(([city, cityJourneys]) =>
            renderCityGroup(city, cityJourneys)
          )}
        </div>
      </div>
    );
  };

  const JourneyFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="journey-city">City *</Label>
        <Input
          id="journey-city"
          placeholder="e.g. Paris"
          value={formData.city}
          onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="journey-title">Journey Title (optional)</Label>
        <Input
          id="journey-title"
          placeholder="e.g. Summer 2024, Business Trip..."
          value={formData.customTitle}
          onChange={e => setFormData(prev => ({ ...prev, customTitle: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          If left empty, the date range will be used as the label.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="journey-start-date">Start Date *</Label>
          <Input
            id="journey-start-date"
            type="date"
            value={formData.startDate}
            onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="journey-start-time">Start Time</Label>
          <Input
            id="journey-start-time"
            type="time"
            value={formData.startTime}
            onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="journey-end-date">End Date *</Label>
          <Input
            id="journey-end-date"
            type="date"
            value={formData.endDate}
            onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="journey-end-time">End Time</Label>
          <Input
            id="journey-end-time"
            type="time"
            value={formData.endTime}
            onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Travel Journeys</h2>
          {journeys.length > 0 && (
            <Badge variant="secondary" className="text-xs">{journeys.length}</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openAddDialog} title="Add Journey">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Journey List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : journeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No journeys yet</p>
              <p className="text-xs mt-1">Click + to add your first journey</p>
            </div>
          ) : (
            <>
              {renderStatusSection('🟢 Live', liveJourneys, 'bg-green-500')}
              {renderStatusSection('🔵 Upcoming', upcomingJourneys, 'bg-blue-500')}
              {renderStatusSection('⚫ Past', pastJourneys)}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Add Journey Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Journey</DialogTitle>
          </DialogHeader>
          <JourneyFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={addJourney.isPending || !formData.city || !formData.startDate || !formData.endDate}
            >
              {addJourney.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
              ) : (
                'Add Journey'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Journey Dialog */}
      <Dialog open={!!editingJourney} onOpenChange={open => { if (!open) setEditingJourney(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Journey</DialogTitle>
          </DialogHeader>
          <JourneyFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingJourney(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={updateJourney.isPending || !formData.city || !formData.startDate || !formData.endDate}
            >
              {updateJourney.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingJourney} onOpenChange={open => { if (!open) setDeletingJourney(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journey</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the journey to{' '}
              <strong>{deletingJourney?.city}</strong>
              {deletingJourney?.customTitle ? ` (${deletingJourney.customTitle})` : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteJourney.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Itinerary Dialog */}
      <Dialog
        open={!!itineraryJourney}
        onOpenChange={open => { if (!open) setItineraryJourney(null); }}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {itineraryJourney ? getJourneyLabel(itineraryJourney) : ''} — Itinerary
            </DialogTitle>
            <div className="flex gap-2 pt-2">
              <Button
                variant={itineraryStyle === 'doodle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setItineraryStyle('doodle')}
              >
                Doodle
              </Button>
              <Button
                variant={itineraryStyle === 'retro' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setItineraryStyle('retro')}
              >
                Retro
              </Button>
            </div>
          </DialogHeader>
          {itineraryJourney && itineraryStyle === 'doodle' && (
            <DoodleItineraryDialogContent
              journey={itineraryJourney}
              formatDate={formatDate}
              formatDateRange={formatDateRange}
              formatScheduleDate={formatScheduleDate}
              formatTime={formatTime}
            />
          )}
          {itineraryJourney && itineraryStyle === 'retro' && (
            <RetroItineraryDialogContent
              journey={itineraryJourney}
              formatDate={formatDate}
              formatDateRange={formatDateRange}
              formatScheduleDate={formatScheduleDate}
              formatTime={formatTime}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
