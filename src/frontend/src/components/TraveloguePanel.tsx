import React, { useState } from 'react';
import { BookOpen, Calendar, MapPin, ChevronDown, ChevronRight, Eye, MoreHorizontal, Filter, Plane, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useGetAllJourneys, useGetJourneyScheduleWithDays, useUpdateScheduleItem, useDeleteScheduleItem, useAddScheduleItem, useGetWebsiteLayoutPreferences } from '@/hooks/useQueries';
import { Journey, ScheduleItem } from '@/backend';
import { toast } from 'sonner';

interface TraveloguePanelProps {
  onFlightAnimation?: (fromCity: string, toCity: string, fromCoords: { lat: number; lon: number }, toCoords: { lat: number; lon: number }) => void;
}

export default function TraveloguePanel({ onFlightAnimation }: TraveloguePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedJourneys, setExpandedJourneys] = useState<string[]>([]);
  const [fullItineraryJourney, setFullItineraryJourney] = useState<Journey | null>(null);
  const [retroItineraryJourney, setRetroItineraryJourney] = useState<Journey | null>(null);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<ScheduleItem | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [editForm, setEditForm] = useState({ date: '', time: '', location: '', activity: '' });
  const [filterTab, setFilterTab] = useState<'live' | 'upcoming' | 'past'>('live');
  const [flyingJourneys, setFlyingJourneys] = useState<Set<string>>(new Set());

  const { data: journeys = [] } = useGetAllJourneys();
  const { data: layoutPreferences } = useGetWebsiteLayoutPreferences();
  const updateScheduleItem = useUpdateScheduleItem();
  const deleteScheduleItem = useDeleteScheduleItem();
  const addScheduleItem = useAddScheduleItem();

  const toggleJourney = (journeyCity: string) => {
    setExpandedJourneys(prev => 
      prev.includes(journeyCity) 
        ? prev.filter(city => city !== journeyCity)
        : [...prev, journeyCity]
    );
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatScheduleDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date range as "DD Mon YY (Ddd) ~ DD Mon YY (Ddd)"
  const formatDateRange = (startTimestamp: bigint, endTimestamp: bigint) => {
    const startDate = new Date(Number(startTimestamp) / 1000000);
    const endDate = new Date(Number(endTimestamp) / 1000000);
    
    const formatParts = (date: Date) => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        weekday: 'short'
      });
      const parts = formatter.formatToParts(date);
      
      const day = parts.find(p => p.type === 'day')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const year = parts.find(p => p.type === 'year')?.value || '';
      const weekday = parts.find(p => p.type === 'weekday')?.value || '';
      
      return `${day} ${month} ${year} (${weekday})`;
    };
    
    return `${formatParts(startDate)} ~ ${formatParts(endDate)}`;
  };

  // Geocode a city to get coordinates
  const geocodeCity = async (cityName: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const encodedQuery = encodeURIComponent(cityName);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LocationMapExplorer/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        if (!isNaN(lat) && !isNaN(lon)) {
          return { lat, lon };
        }
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Handle flying button click with toggle logic
  const handleFlyingClick = async (journey: Journey) => {
    if (!onFlightAnimation) return;

    const defaultSearchPlace = layoutPreferences?.defaultSearchPlace || 'Zurich';
    const journeyKey = journey.city;
    
    // Check if this journey is currently flying
    if (flyingJourneys.has(journeyKey)) {
      // Stop flying - trigger animation with same journey to stop it
      const fromCoords = await geocodeCity(defaultSearchPlace);
      const toCoords = await geocodeCity(journey.city);

      if (!fromCoords || !toCoords) {
        toast.error('Failed to get coordinates for flight animation');
        return;
      }

      onFlightAnimation(defaultSearchPlace, journey.city, fromCoords, toCoords);
      
      // Remove from flying set
      setFlyingJourneys(prev => {
        const newSet = new Set(prev);
        newSet.delete(journeyKey);
        return newSet;
      });
      
      console.log(`[TRAVELOGUE] Stopped flying to ${journey.city}`);
    } else {
      // Start flying
      const fromCoords = await geocodeCity(defaultSearchPlace);
      const toCoords = await geocodeCity(journey.city);

      if (!fromCoords || !toCoords) {
        toast.error('Failed to get coordinates for flight animation');
        return;
      }

      onFlightAnimation(defaultSearchPlace, journey.city, fromCoords, toCoords);
      
      // Add to flying set
      setFlyingJourneys(prev => new Set(prev).add(journeyKey));
      
      console.log(`[TRAVELOGUE] Started flying to ${journey.city}`);
    }
  };

  // Handle map button click - no-op placeholder
  const handleMapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // No-op placeholder - no functionality yet
  };

  // Filter journeys based on current date
  const now = Date.now();
  const liveJourneys = journeys.filter(journey => {
    const startDate = Number(journey.startDate) / 1000000;
    const endDate = Number(journey.endDate) / 1000000;
    return startDate <= now && endDate >= now;
  }).sort((a, b) => Number(b.startDate) - Number(a.startDate));

  const upcomingJourneys = journeys.filter(journey => {
    const startDate = Number(journey.startDate) / 1000000;
    return startDate > now;
  }).sort((a, b) => Number(b.startDate) - Number(a.startDate));

  const pastJourneys = journeys.filter(journey => {
    const endDate = Number(journey.endDate) / 1000000;
    return endDate < now;
  }).sort((a, b) => Number(b.startDate) - Number(a.startDate));

  // Get filtered journeys based on selected tab
  const getFilteredJourneys = () => {
    switch (filterTab) {
      case 'live':
        return liveJourneys;
      case 'upcoming':
        return upcomingJourneys;
      case 'past':
        return pastJourneys;
      default:
        return [];
    }
  };

  const filteredJourneys = getFilteredJourneys();

  // Handle six-dot button click to open edit popup
  const handleSixDotClick = (item: ScheduleItem, journey: Journey) => {
    setSelectedScheduleItem(item);
    setSelectedJourney(journey);
    const dateObj = new Date(Number(item.date) / 1000000);
    setEditForm({
      date: dateObj.toISOString().split('T')[0],
      time: item.time,
      location: item.location || '',
      activity: item.activity
    });
    setEditPopupOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Make location field mandatory in edit form
    if (!selectedScheduleItem || !selectedJourney || !editForm.date || !editForm.time || !editForm.location.trim() || !editForm.activity.trim()) {
      toast.error('Please fill in all required fields including location');
      return;
    }

    // Validate date is within journey range - CORRECTED LOGIC
    const newDateTime = new Date(`${editForm.date}T${editForm.time}`);
    const journeyStart = new Date(Number(selectedJourney.startDate) / 1000000);
    const journeyEnd = new Date(Number(selectedJourney.endDate) / 1000000);

    // Schedule must be on or after journey start AND on or before journey end
    if (newDateTime < journeyStart || newDateTime > journeyEnd) {
      toast.error(`Date/time must be between ${journeyStart.toLocaleString()} and ${journeyEnd.toLocaleString()}`);
      return;
    }

    try {
      // Delete the old item
      await deleteScheduleItem.mutateAsync({
        journeyCity: selectedJourney.city,
        date: selectedScheduleItem.date,
        time: selectedScheduleItem.time
      });

      // Add the item with new details
      const newDateTimestamp = BigInt(newDateTime.getTime() * 1000000);
      await addScheduleItem.mutateAsync({
        journeyCity: selectedJourney.city,
        date: newDateTimestamp,
        time: editForm.time,
        location: editForm.location.trim(),
        activity: editForm.activity.trim()
      });

      toast.success('Schedule item updated successfully!');
      setEditPopupOpen(false);
      setSelectedScheduleItem(null);
      setSelectedJourney(null);
      setEditForm({ date: '', time: '', location: '', activity: '' });
    } catch (error) {
      console.error('Error updating schedule item:', error);
      toast.error('Failed to update schedule item');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
            title="Travelogue"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[3100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Travelogue
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Filter Tabs */}
            <Tabs value={filterTab} onValueChange={(value) => setFilterTab(value as 'live' | 'upcoming' | 'past')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="live" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Live
                  <Badge variant="secondary" className="ml-1">
                    {liveJourneys.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming
                  <Badge variant="secondary" className="ml-1">
                    {upcomingJourneys.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="past" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Past
                  <Badge variant="secondary" className="ml-1">
                    {pastJourneys.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="live" className="space-y-4 mt-4">
                {liveJourneys.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No live journeys</p>
                    <p className="text-sm">You don't have any journeys currently in progress</p>
                  </div>
                ) : (
                  liveJourneys.map((journey) => (
                    <JourneyCard 
                      key={journey.city} 
                      journey={journey} 
                      isExpanded={expandedJourneys.includes(journey.city)}
                      onToggle={() => toggleJourney(journey.city)}
                      onViewFullItinerary={() => setFullItineraryJourney(journey)}
                      onViewRetroItinerary={() => setRetroItineraryJourney(journey)}
                      onFlyingClick={() => handleFlyingClick(journey)}
                      onMapClick={handleMapClick}
                      isFlying={flyingJourneys.has(journey.city)}
                      formatDate={formatDate}
                      formatScheduleDate={formatScheduleDate}
                      formatTime={formatTime}
                      onSixDotClick={handleSixDotClick}
                      badgeColor="orange"
                      defaultSearchPlace={layoutPreferences?.defaultSearchPlace || 'Zurich'}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-4 mt-4">
                {upcomingJourneys.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No upcoming journeys</p>
                    <p className="text-sm">Add journeys in Trip Management to see your future travels here!</p>
                  </div>
                ) : (
                  upcomingJourneys.map((journey) => (
                    <JourneyCard 
                      key={journey.city} 
                      journey={journey} 
                      isExpanded={expandedJourneys.includes(journey.city)}
                      onToggle={() => toggleJourney(journey.city)}
                      onViewFullItinerary={() => setFullItineraryJourney(journey)}
                      onViewRetroItinerary={() => setRetroItineraryJourney(journey)}
                      onFlyingClick={() => handleFlyingClick(journey)}
                      onMapClick={handleMapClick}
                      isFlying={flyingJourneys.has(journey.city)}
                      formatDate={formatDate}
                      formatScheduleDate={formatScheduleDate}
                      formatTime={formatTime}
                      onSixDotClick={handleSixDotClick}
                      badgeColor="green"
                      defaultSearchPlace={layoutPreferences?.defaultSearchPlace || 'Zurich'}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4 mt-4">
                {pastJourneys.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No past journeys</p>
                    <p className="text-sm">Your completed travels will appear here</p>
                  </div>
                ) : (
                  pastJourneys.map((journey) => (
                    <JourneyCard 
                      key={journey.city} 
                      journey={journey} 
                      isExpanded={expandedJourneys.includes(journey.city)}
                      onToggle={() => toggleJourney(journey.city)}
                      onViewFullItinerary={() => setFullItineraryJourney(journey)}
                      onViewRetroItinerary={() => setRetroItineraryJourney(journey)}
                      onFlyingClick={() => handleFlyingClick(journey)}
                      onMapClick={handleMapClick}
                      isFlying={flyingJourneys.has(journey.city)}
                      formatDate={formatDate}
                      formatScheduleDate={formatScheduleDate}
                      formatTime={formatTime}
                      onSixDotClick={handleSixDotClick}
                      badgeColor="blue"
                      defaultSearchPlace={layoutPreferences?.defaultSearchPlace || 'Zurich'}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Itinerary Popup - Cute Illustrated Travel Diary/Scrapbook Poster */}
      <Dialog open={!!fullItineraryJourney} onOpenChange={() => setFullItineraryJourney(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden z-[3200] p-0 bg-[#fef9f3] border-none">
          {fullItineraryJourney && (
            <ScrapbookItineraryView 
              journey={fullItineraryJourney}
              formatDate={formatDate}
              formatDateRange={formatDateRange}
              formatScheduleDate={formatScheduleDate}
              formatTime={formatTime}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Retro Itinerary Popup - Vintage Postcard Theme */}
      <Dialog open={!!retroItineraryJourney} onOpenChange={() => setRetroItineraryJourney(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden z-[3200] p-0 bg-[#f5e6d3] border-none">
          {retroItineraryJourney && (
            <RetroPostcardItineraryView 
              journey={retroItineraryJourney}
              formatDate={formatDate}
              formatDateRange={formatDateRange}
              formatScheduleDate={formatScheduleDate}
              formatTime={formatTime}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Item Popup */}
      <Dialog open={editPopupOpen} onOpenChange={setEditPopupOpen}>
        <DialogContent className="z-[3300]">
          <DialogHeader>
            <DialogTitle>Edit Schedule Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-time">Time</Label>
              <Input
                id="edit-time"
                type="time"
                value={editForm.time}
                onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="Enter location"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-activity">Activity</Label>
              <Input
                id="edit-activity"
                type="text"
                value={editForm.activity}
                onChange={(e) => setEditForm({ ...editForm, activity: e.target.value })}
                placeholder="Enter activity"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditPopupOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Journey Card Component
interface JourneyCardProps {
  journey: Journey;
  isExpanded: boolean;
  onToggle: () => void;
  onViewFullItinerary: () => void;
  onViewRetroItinerary: () => void;
  onFlyingClick: () => void;
  onMapClick: (e: React.MouseEvent) => void;
  isFlying: boolean;
  formatDate: (timestamp: bigint) => string;
  formatScheduleDate: (timestamp: bigint) => string;
  formatTime: (timeString: string) => string;
  onSixDotClick: (item: ScheduleItem, journey: Journey) => void;
  badgeColor: 'orange' | 'green' | 'blue';
  defaultSearchPlace: string;
}

function JourneyCard({
  journey,
  isExpanded,
  onToggle,
  onViewFullItinerary,
  onViewRetroItinerary,
  onFlyingClick,
  onMapClick,
  isFlying,
  formatDate,
  formatScheduleDate,
  formatTime,
  onSixDotClick,
  badgeColor,
  defaultSearchPlace
}: JourneyCardProps) {
  const { data: scheduleData } = useGetJourneyScheduleWithDays(journey.city);

  const badgeColorClass = {
    orange: 'bg-orange-500 hover:bg-orange-600',
    green: 'bg-green-500 hover:bg-green-600',
    blue: 'bg-blue-500 hover:bg-blue-600'
  }[badgeColor];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {journey.city}
              <Badge className={`${badgeColorClass} text-white`}>
                {badgeColor === 'orange' ? 'Live' : badgeColor === 'green' ? 'Upcoming' : 'Past'}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onFlyingClick}
              className={isFlying ? 'bg-blue-100 dark:bg-blue-900' : ''}
              title={isFlying ? 'Stop Flying' : 'Start Flying'}
            >
              <Plane className={`h-4 w-4 mr-1 ${isFlying ? 'animate-pulse' : ''}`} />
              Flying
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onMapClick}
              title="Map"
            >
              <span className="text-xs font-bold mr-1">2D</span>
              Map
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggle}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* View Itinerary Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onViewFullItinerary}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Doodle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onViewRetroItinerary}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Retro
                </Button>
              </div>

              {/* Schedule Items */}
              {scheduleData && scheduleData.length > 0 ? (
                <div className="space-y-3">
                  {scheduleData.map(([dayLabel, items]) => (
                    <div key={dayLabel} className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">{dayLabel}</h4>
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div
                            key={`${item.date}-${item.time}-${idx}`}
                            className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                  {formatTime(item.time)}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-sm font-medium truncate">{item.location}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{item.activity}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onSixDotClick(item, journey)}
                              className="shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No schedule items yet
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Scrapbook Itinerary View Component
interface ItineraryViewProps {
  journey: Journey;
  formatDate: (timestamp: bigint) => string;
  formatDateRange: (startTimestamp: bigint, endTimestamp: bigint) => string;
  formatScheduleDate: (timestamp: bigint) => string;
  formatTime: (timeString: string) => string;
}

function ScrapbookItineraryView({ journey, formatDate, formatDateRange, formatScheduleDate, formatTime }: ItineraryViewProps) {
  const { data: scheduleData } = useGetJourneyScheduleWithDays(journey.city);

  return (
    <div className="relative w-full h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#fef9f3] border-b-4 border-[#8b4513] p-6">
        <h2 className="text-4xl font-bold text-[#8b4513] text-center mb-2" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
          ✈️ {journey.city} Adventure! ✈️
        </h2>
        <p className="text-center text-[#8b4513] text-sm">
          {formatDateRange(journey.startDate, journey.endDate)}
        </p>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        {scheduleData && scheduleData.length > 0 ? (
          scheduleData.map(([dayLabel, items], dayIdx) => (
            <div key={dayLabel} className="relative">
              {/* Day Header */}
              <div className="bg-[#fff8dc] border-4 border-[#8b4513] rounded-lg p-4 mb-4 transform -rotate-1 shadow-lg">
                <h3 className="text-2xl font-bold text-[#8b4513]" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                  📅 {dayLabel}
                </h3>
              </div>

              {/* Schedule Items */}
              <div className="space-y-4 ml-8">
                {items.map((item, idx) => (
                  <div key={`${item.date}-${item.time}-${idx}`} className="relative">
                    {/* Connector Arrow */}
                    {idx < items.length - 1 && (
                      <div className="absolute left-6 top-full h-8 w-0.5 bg-[#8b4513]" style={{ height: '16px' }}>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-[#8b4513]"></div>
                        </div>
                      </div>
                    )}

                    {/* Item Card */}
                    <div className="bg-white border-2 border-[#8b4513] rounded-lg p-4 shadow-md transform hover:scale-105 transition-transform">
                      <div className="flex items-start gap-3">
                        <div className="bg-[#ffd700] rounded-full w-12 h-12 flex items-center justify-center text-2xl shrink-0">
                          ⏰
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-lg font-bold text-[#8b4513]">
                              {formatTime(item.time)}
                            </span>
                            <span className="text-[#8b4513]">•</span>
                            <span className="text-lg font-semibold text-[#8b4513] truncate">
                              {item.location}
                            </span>
                          </div>
                          <p className="text-[#8b4513]">{item.activity}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-2xl text-[#8b4513]" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              No adventures planned yet! 🌟
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Retro Postcard Itinerary View Component
function RetroPostcardItineraryView({ journey, formatDate, formatDateRange, formatScheduleDate, formatTime }: ItineraryViewProps) {
  const { data: scheduleData } = useGetJourneyScheduleWithDays(journey.city);

  return (
    <div className="relative w-full h-full overflow-y-auto bg-[#f5e6d3]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#8b4513] text-[#f5e6d3] p-6 border-b-4 border-[#654321]">
        <h2 className="text-4xl font-bold text-center mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          {journey.city}
        </h2>
        <p className="text-center text-sm" style={{ fontFamily: 'Georgia, serif' }}>
          {formatDateRange(journey.startDate, journey.endDate)}
        </p>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        {scheduleData && scheduleData.length > 0 ? (
          scheduleData.map(([dayLabel, items], dayIdx) => (
            <div key={dayLabel} className="relative">
              {/* Day Header */}
              <div className="bg-[#d4a574] border-4 border-[#8b4513] rounded-sm p-4 mb-4 shadow-lg">
                <h3 className="text-2xl font-bold text-[#654321]" style={{ fontFamily: 'Georgia, serif' }}>
                  {dayLabel}
                </h3>
              </div>

              {/* Schedule Items */}
              <div className="space-y-4 ml-8">
                {items.map((item, idx) => (
                  <div key={`${item.date}-${item.time}-${idx}`} className="relative">
                    {/* Connector Arrow */}
                    {idx < items.length - 1 && (
                      <div className="absolute left-6 top-full h-8 w-0.5 bg-[#8b4513]" style={{ height: '16px' }}>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-[#8b4513]"></div>
                        </div>
                      </div>
                    )}

                    {/* Item Card */}
                    <div className="bg-[#faf0e6] border-2 border-[#8b4513] rounded-sm p-4 shadow-md">
                      <div className="flex items-start gap-3">
                        <div className="bg-[#d4a574] rounded-sm w-12 h-12 flex items-center justify-center text-xl font-bold text-[#654321] shrink-0" style={{ fontFamily: 'Georgia, serif' }}>
                          {formatTime(item.time).split(' ')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-lg font-bold text-[#654321]" style={{ fontFamily: 'Georgia, serif' }}>
                              {formatTime(item.time)}
                            </span>
                            <span className="text-[#654321]">•</span>
                            <span className="text-lg font-semibold text-[#654321] truncate" style={{ fontFamily: 'Georgia, serif' }}>
                              {item.location}
                            </span>
                          </div>
                          <p className="text-[#654321]" style={{ fontFamily: 'Georgia, serif' }}>
                            {item.activity}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-2xl text-[#654321]" style={{ fontFamily: 'Georgia, serif' }}>
              No itinerary available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
