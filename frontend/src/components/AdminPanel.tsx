import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Plus,
  Trash2,
  MapPin,
  Calendar,
  Loader2,
  BookOpen,
  Settings,
} from 'lucide-react';
import {
  useGetAllJourneys,
  useAddJourney,
  useDeleteJourney,
  useGetScheduleItems,
  useAddScheduleItem,
  useDeleteScheduleItem,
  useGetAllLocationInfo,
  useAddLocationInfo,
  useDeleteLocationInfo,
  useGetWebsiteLayoutSettings,
  useAddWebsiteLayoutSettings,
  useUpdateWebsiteLayoutSettings,
} from '../hooks/useQueries';
import type { Journey, ScheduleItem } from '../backend';
import { getJourneyKey } from '../lib/journeyUtils';
import CityAlbumManager from './CityAlbumManager';
import TravelSpotManager from './TravelSpotManager';
import MusicAlbumManager from './MusicAlbumManager';
import GeonameGeographicalManager from './GeonameGeographicalManager';
import TimezoneManagement from './TimezoneManagement';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(dateNs: bigint): string {
  const ms = Number(dateNs) / 1_000_000;
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Schedule Section ─────────────────────────────────────────────────────────

interface ScheduleSectionProps {
  journey: Journey;
}

function ScheduleSection({ journey }: ScheduleSectionProps) {
  const journeyKey = getJourneyKey(journey);
  const { data: scheduleItems, isLoading } = useGetScheduleItems(journeyKey);
  const addScheduleItem = useAddScheduleItem();
  const deleteScheduleItem = useDeleteScheduleItem();

  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '',
    location: '',
    activity: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<ScheduleItem | null>(null);

  const handleAddScheduleItem = async () => {
    if (!scheduleForm.date || !scheduleForm.time || !scheduleForm.location || !scheduleForm.activity) return;
    const dateMs = new Date(scheduleForm.date).getTime();
    const dateNs = BigInt(dateMs) * 1_000_000n;
    await addScheduleItem.mutateAsync({
      journeyKey,
      date: dateNs,
      time: scheduleForm.time,
      location: scheduleForm.location,
      activity: scheduleForm.activity,
    });
    setScheduleForm({ date: '', time: '', location: '', activity: '' });
  };

  const handleDeleteScheduleItem = async (item: ScheduleItem) => {
    await deleteScheduleItem.mutateAsync({
      journeyKey,
      date: item.date,
      time: item.time,
    });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-3">
      {/* Add form */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={scheduleForm.date}
            onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Time</Label>
          <Input
            type="time"
            value={scheduleForm.time}
            onChange={(e) => setScheduleForm((f) => ({ ...f, time: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Location</Label>
          <Input
            value={scheduleForm.location}
            onChange={(e) => setScheduleForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="e.g. Eiffel Tower"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Activity</Label>
          <Input
            value={scheduleForm.activity}
            onChange={(e) => setScheduleForm((f) => ({ ...f, activity: e.target.value }))}
            placeholder="e.g. Sightseeing"
            className="h-8 text-xs"
          />
        </div>
      </div>
      <Button
        size="sm"
        className="w-full h-8 text-xs"
        onClick={handleAddScheduleItem}
        disabled={
          addScheduleItem.isPending ||
          !scheduleForm.date ||
          !scheduleForm.time ||
          !scheduleForm.location ||
          !scheduleForm.activity
        }
      >
        {addScheduleItem.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin mr-1" />
        ) : (
          <Plus className="w-3 h-3 mr-1" />
        )}
        Add Schedule Item
      </Button>

      {/* Items list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !scheduleItems || scheduleItems.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          No schedule items yet for this journey.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {scheduleItems
            .slice()
            .sort((a, b) => {
              const dateDiff = Number(a.date - b.date);
              if (dateDiff !== 0) return dateDiff;
              return a.time.localeCompare(b.time);
            })
            .map((item, idx) => (
              <div
                key={`${item.date}-${item.time}-${idx}`}
                className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{item.activity}</span>
                  <span className="text-muted-foreground ml-1">@ {item.location}</span>
                  <div className="text-muted-foreground">
                    {formatDate(item.date)} {item.time}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0"
                  onClick={() => setDeleteTarget(item)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.activity}" from this journey's travelogue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteScheduleItem(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteScheduleItem.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Journey Card ─────────────────────────────────────────────────────────────

interface JourneyCardProps {
  journey: Journey;
  onDelete: (journey: Journey) => void;
}

function JourneyCard({ journey, onDelete }: JourneyCardProps) {
  const [expanded, setExpanded] = useState(false);

  const now = Date.now() * 1_000_000;
  const start = Number(journey.startDate);
  const end = Number(journey.endDate);
  const isLive = now >= start && now <= end;
  const isUpcoming = now < start;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground truncate">
              {journey.title || journey.city}
            </span>
            {isLive && <Badge className="bg-green-500 text-white text-xs py-0">Live</Badge>}
            {isUpcoming && <Badge className="bg-blue-500 text-white text-xs py-0">Upcoming</Badge>}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{journey.city}</span>
            <span className="mx-1">·</span>
            <Calendar className="w-3 h-3 shrink-0" />
            <span>
              {formatDate(journey.startDate)} – {formatDate(journey.endDate)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setExpanded((e) => !e)}
          >
            <BookOpen className="w-3 h-3" />
            {expanded ? 'Hide' : 'Schedule'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(journey)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Expanded schedule section */}
      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-background">
          <ScheduleSection journey={journey} />
        </div>
      )}
    </div>
  );
}

// ─── Albums Tab with city selector ───────────────────────────────────────────

function AlbumsTab() {
  const { data: journeys = [] } = useGetAllJourneys();
  const [selectedCity, setSelectedCity] = useState('');

  // Get unique cities from journeys
  const cities = [...new Set(journeys.map((j) => j.city))].sort();

  // Auto-select first city if none selected
  useEffect(() => {
    if (!selectedCity && cities.length > 0) {
      setSelectedCity(cities[0]);
    }
  }, [cities, selectedCity]);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Select City</Label>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background mt-1"
        >
          <option value="">-- Select a city --</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      {selectedCity ? (
        <CityAlbumManager city={selectedCity} />
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          Select a city above to manage its album.
        </p>
      )}
    </div>
  );
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { data: journeys, isLoading: journeysLoading } = useGetAllJourneys();
  const addJourney = useAddJourney();
  const deleteJourney = useDeleteJourney();

  const { data: locationInfoList, isLoading: locationLoading } = useGetAllLocationInfo();
  const addLocationInfo = useAddLocationInfo();
  const deleteLocationInfo = useDeleteLocationInfo();

  const { data: layoutSettings } = useGetWebsiteLayoutSettings();
  const addLayoutSettings = useAddWebsiteLayoutSettings();
  const updateLayoutSettings = useUpdateWebsiteLayoutSettings();

  const [journeyForm, setJourneyForm] = useState({
    title: '',
    city: '',
    startDate: '',
    endDate: '',
  });
  const [deleteJourneyTarget, setDeleteJourneyTarget] = useState<Journey | null>(null);

  const [locationForm, setLocationForm] = useState({
    name: '',
    lat: '',
    lng: '',
  });

  const [layoutForm, setLayoutForm] = useState({
    showMusicPlayerBar: false,
    defaultSearchPlace: '',
    showAllTravelSpots: false,
    rippleSize: 0.5,
    cityFontSize: 8.0,
  });

  useEffect(() => {
    if (layoutSettings) {
      setLayoutForm({
        showMusicPlayerBar: layoutSettings.showMusicPlayerBar,
        defaultSearchPlace: layoutSettings.defaultSearchPlace,
        showAllTravelSpots: layoutSettings.showAllTravelSpots,
        rippleSize: layoutSettings.rippleSize,
        cityFontSize: layoutSettings.cityFontSize,
      });
    }
  }, [layoutSettings]);

  // ── Journey handlers ──

  const handleAddJourney = async () => {
    if (!journeyForm.city || !journeyForm.startDate || !journeyForm.endDate) return;
    const startMs = new Date(journeyForm.startDate).getTime();
    const endMs = new Date(journeyForm.endDate).getTime();
    await addJourney.mutateAsync({
      title: journeyForm.title,
      city: journeyForm.city,
      startDate: BigInt(startMs) * 1_000_000n,
      endDate: BigInt(endMs) * 1_000_000n,
    });
    setJourneyForm({ title: '', city: '', startDate: '', endDate: '' });
  };

  const handleDeleteJourney = async (journey: Journey) => {
    await deleteJourney.mutateAsync(journey.city);
    setDeleteJourneyTarget(null);
  };

  // ── Location handlers ──

  const handleAddLocation = async () => {
    if (!locationForm.name || !locationForm.lat || !locationForm.lng) return;
    await addLocationInfo.mutateAsync({
      name: locationForm.name,
      coordinates: [parseFloat(locationForm.lat), parseFloat(locationForm.lng)],
      photoPath: null,
    });
    setLocationForm({ name: '', lat: '', lng: '' });
  };

  // ── Layout handlers ──

  const handleSaveLayout = async () => {
    if (layoutSettings) {
      await updateLayoutSettings.mutateAsync(layoutForm);
    } else {
      await addLayoutSettings.mutateAsync(layoutForm);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Admin Panel
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="journeys" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-3 shrink-0 grid grid-cols-7 h-8">
              <TabsTrigger value="journeys" className="text-xs">Journeys</TabsTrigger>
              <TabsTrigger value="locations" className="text-xs">Locations</TabsTrigger>
              <TabsTrigger value="albums" className="text-xs">Albums</TabsTrigger>
              <TabsTrigger value="spots" className="text-xs">Spots</TabsTrigger>
              <TabsTrigger value="music" className="text-xs">Music</TabsTrigger>
              <TabsTrigger value="geo" className="text-xs">Geo</TabsTrigger>
              <TabsTrigger value="layout" className="text-xs">Layout</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-6 py-4">
              {/* ── Journeys Tab ── */}
              <TabsContent value="journeys" className="mt-0 space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Add New Journey</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Journey Title</Label>
                      <Input
                        value={journeyForm.title}
                        onChange={(e) => setJourneyForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Summer Paris Trip"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">City</Label>
                      <Input
                        value={journeyForm.city}
                        onChange={(e) => setJourneyForm((f) => ({ ...f, city: e.target.value }))}
                        placeholder="e.g. Paris"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={journeyForm.startDate}
                        onChange={(e) => setJourneyForm((f) => ({ ...f, startDate: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End Date</Label>
                      <Input
                        type="date"
                        value={journeyForm.endDate}
                        onChange={(e) => setJourneyForm((f) => ({ ...f, endDate: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={handleAddJourney}
                    disabled={
                      addJourney.isPending ||
                      !journeyForm.city ||
                      !journeyForm.startDate ||
                      !journeyForm.endDate
                    }
                  >
                    {addJourney.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Plus className="w-3 h-3 mr-1" />
                    )}
                    Add Journey
                  </Button>
                </div>

                {/* Journey list */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Journeys ({journeys?.length ?? 0})
                  </h3>
                  {journeysLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !journeys || journeys.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No journeys yet. Add one above.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {journeys.map((journey) => (
                        <JourneyCard
                          key={`${journey.city}-${journey.createdAt}`}
                          journey={journey}
                          onDelete={setDeleteJourneyTarget}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Locations Tab ── */}
              <TabsContent value="locations" className="mt-0 space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Add Location</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={locationForm.name}
                        onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Location name"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Latitude</Label>
                      <Input
                        type="number"
                        value={locationForm.lat}
                        onChange={(e) => setLocationForm((f) => ({ ...f, lat: e.target.value }))}
                        placeholder="48.8566"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Longitude</Label>
                      <Input
                        type="number"
                        value={locationForm.lng}
                        onChange={(e) => setLocationForm((f) => ({ ...f, lng: e.target.value }))}
                        placeholder="2.3522"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={handleAddLocation}
                    disabled={
                      addLocationInfo.isPending ||
                      !locationForm.name ||
                      !locationForm.lat ||
                      !locationForm.lng
                    }
                  >
                    {addLocationInfo.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Plus className="w-3 h-3 mr-1" />
                    )}
                    Add Location
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Locations ({locationInfoList?.length ?? 0})
                  </h3>
                  {locationLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !locationInfoList || locationInfoList.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No locations yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {locationInfoList.map((loc) => (
                        <div
                          key={loc.name}
                          className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5 text-xs"
                        >
                          <div>
                            <span className="font-medium">{loc.name}</span>
                            <span className="text-muted-foreground ml-2">
                              ({loc.coordinates[0].toFixed(4)}, {loc.coordinates[1].toFixed(4)})
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteLocationInfo.mutate(loc.name)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Albums Tab ── */}
              <TabsContent value="albums" className="mt-0">
                <AlbumsTab />
              </TabsContent>

              {/* ── Travel Spots Tab ── */}
              <TabsContent value="spots" className="mt-0">
                <TravelSpotManager />
              </TabsContent>

              {/* ── Music Tab ── */}
              <TabsContent value="music" className="mt-0">
                <MusicAlbumManager />
              </TabsContent>

              {/* ── Geo Tab ── */}
              <TabsContent value="geo" className="mt-0 space-y-4">
                <GeonameGeographicalManager />
                <TimezoneManagement />
              </TabsContent>

              {/* ── Layout Tab ── */}
              <TabsContent value="layout" className="mt-0 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Website Layout Settings</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Default Search Place</Label>
                    <Input
                      value={layoutForm.defaultSearchPlace}
                      onChange={(e) =>
                        setLayoutForm((f) => ({ ...f, defaultSearchPlace: e.target.value }))
                      }
                      placeholder="e.g. Paris"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Ripple Size ({layoutForm.rippleSize})</Label>
                    <Input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={layoutForm.rippleSize}
                      onChange={(e) =>
                        setLayoutForm((f) => ({ ...f, rippleSize: parseFloat(e.target.value) }))
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">City Font Size ({layoutForm.cityFontSize})</Label>
                    <Input
                      type="range"
                      min="4"
                      max="20"
                      step="0.5"
                      value={layoutForm.cityFontSize}
                      onChange={(e) =>
                        setLayoutForm((f) => ({ ...f, cityFontSize: parseFloat(e.target.value) }))
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showMusicPlayer"
                      checked={layoutForm.showMusicPlayerBar}
                      onChange={(e) =>
                        setLayoutForm((f) => ({ ...f, showMusicPlayerBar: e.target.checked }))
                      }
                    />
                    <Label htmlFor="showMusicPlayer" className="text-xs cursor-pointer">
                      Show Music Player Bar
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showAllSpots"
                      checked={layoutForm.showAllTravelSpots}
                      onChange={(e) =>
                        setLayoutForm((f) => ({ ...f, showAllTravelSpots: e.target.checked }))
                      }
                    />
                    <Label htmlFor="showAllSpots" className="text-xs cursor-pointer">
                      Show All Travel Spots on Map
                    </Label>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={handleSaveLayout}
                    disabled={addLayoutSettings.isPending || updateLayoutSettings.isPending}
                  >
                    {addLayoutSettings.isPending || updateLayoutSettings.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : null}
                    Save Layout Settings
                  </Button>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Journey Confirmation */}
      <AlertDialog
        open={!!deleteJourneyTarget}
        onOpenChange={(open) => !open && setDeleteJourneyTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the journey "
              {deleteJourneyTarget?.title || deleteJourneyTarget?.city}". This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteJourneyTarget && handleDeleteJourney(deleteJourneyTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteJourney.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
