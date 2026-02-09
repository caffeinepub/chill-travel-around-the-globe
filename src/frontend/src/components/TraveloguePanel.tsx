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

  // Helper function to format date as "DD Mon" (e.g., "11 Feb")
  const formatDayDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    const formatter = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short'
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    return `${day} ${month}`;
  };

  // Helper function to format weekday as "Ddd" (e.g., "Wed")
  const formatWeekday = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
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
              formatDayDate={formatDayDate}
              formatWeekday={formatWeekday}
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
              formatDayDate={formatDayDate}
              formatWeekday={formatWeekday}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Item Popup */}
      <Dialog open={editPopupOpen} onOpenChange={setEditPopupOpen}>
        <DialogContent className="max-w-md z-[3300]">
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
              <Button type="submit" disabled={updateScheduleItem.isPending || deleteScheduleItem.isPending || addScheduleItem.isPending}>
                {(updateScheduleItem.isPending || deleteScheduleItem.isPending || addScheduleItem.isPending) ? 'Saving...' : 'Save Changes'}
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
  isFlying,
  formatDate, 
  formatScheduleDate, 
  formatTime, 
  onSixDotClick,
  badgeColor,
  defaultSearchPlace
}: JourneyCardProps) {
  const { data: scheduleWithDays = [] } = useGetJourneyScheduleWithDays(journey.city);

  const badgeColorClass = {
    orange: 'bg-orange-500 hover:bg-orange-600',
    green: 'bg-green-500 hover:bg-green-600',
    blue: 'bg-blue-500 hover:bg-blue-600'
  }[badgeColor];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="p-0 h-auto hover:bg-transparent"
            >
              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
            <div>
              <CardTitle className="text-lg">{journey.city}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${badgeColorClass} text-white`}>
              {scheduleWithDays.length} {scheduleWithDays.length === 1 ? 'Day' : 'Days'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onFlyingClick}
              className={isFlying ? 'bg-blue-100 border-blue-300' : ''}
              title={isFlying ? `Stop flying from ${defaultSearchPlace}` : `Fly from ${defaultSearchPlace}`}
            >
              <Plane className={`h-4 w-4 ${isFlying ? 'text-blue-600' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewFullItinerary}
              title="View Scrapbook Itinerary"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewRetroItinerary}
              title="View Retro Postcard Itinerary"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <CardContent>
            {scheduleWithDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No schedule items yet</p>
            ) : (
              <div className="space-y-4">
                {scheduleWithDays.map(([dayLabel, items]) => (
                  <div key={dayLabel} className="space-y-2">
                    <h4 className="font-semibold text-sm">{dayLabel}</h4>
                    <div className="space-y-2 pl-4">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground min-w-[80px]">
                            {formatTime(item.time)}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">{item.location}</p>
                            <p className="text-muted-foreground">{item.activity}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSixDotClick(item, journey)}
                            className="p-1 h-auto"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Scrapbook Itinerary View Component
interface ScrapbookItineraryViewProps {
  journey: Journey;
  formatDate: (timestamp: bigint) => string;
  formatDateRange: (startTimestamp: bigint, endTimestamp: bigint) => string;
  formatScheduleDate: (timestamp: bigint) => string;
  formatTime: (timeString: string) => string;
  formatDayDate: (timestamp: bigint) => string;
  formatWeekday: (timestamp: bigint) => string;
}

function ScrapbookItineraryView({ 
  journey, 
  formatDate, 
  formatDateRange, 
  formatScheduleDate, 
  formatTime,
  formatDayDate,
  formatWeekday
}: ScrapbookItineraryViewProps) {
  const { data: scheduleWithDays = [] } = useGetJourneyScheduleWithDays(journey.city);

  return (
    <div className="h-[90vh] overflow-y-auto p-8 bg-[#fef9f3]">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#8b4513] mb-2" style={{ fontFamily: 'cursive' }}>
          {journey.city} Adventure
        </h1>
        <p className="text-lg text-[#a0522d]">
          {formatDateRange(journey.startDate, journey.endDate)}
        </p>
      </div>

      {/* Schedule by Days */}
      <div className="space-y-8">
        {scheduleWithDays.map(([dayLabel, items], dayIndex) => {
          // Get the date from the first item in this day
          const firstItemDate = items.length > 0 ? items[0].date : journey.startDate;
          
          return (
            <div key={dayIndex} className="relative">
              {/* Day Header with Scrapbook Style */}
              <div className="flex items-start gap-4 mb-4">
                <span className="inline-block bg-[#ffd700] text-[#8b4513] px-4 py-2 rounded-lg shadow-md transform -rotate-2 font-bold text-center leading-tight">
                  {dayLabel}
                  <br />
                  {formatDayDate(firstItemDate)}
                  <br />
                  {formatWeekday(firstItemDate)}
                </span>
                <div className="flex-1 border-b-2 border-dashed border-[#d2691e] mt-4"></div>
              </div>

              {/* Schedule Items */}
              <div className="space-y-3 pl-8">
                {items.map((item, itemIndex) => (
                  <div key={itemIndex} className="relative">
                    <div className="flex flex-wrap items-start gap-3 bg-white/60 p-3 rounded-lg shadow-sm border-2 border-[#daa520]">
                      <span className="text-sm font-semibold text-[#8b4513] min-w-[80px]">
                        {formatTime(item.time)}
                      </span>
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold text-[#8b4513]">{item.location}</p>
                        <p className="text-sm text-[#a0522d]">{item.activity}</p>
                      </div>
                    </div>
                    {itemIndex < items.length - 1 && (
                      <div className="ml-12 my-1">
                        <svg width="20" height="20" viewBox="0 0 20 20" className="text-[#d2691e]">
                          <path d="M10 0 L10 20 M5 15 L10 20 L15 15" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Retro Postcard Itinerary View Component
interface RetroPostcardItineraryViewProps {
  journey: Journey;
  formatDate: (timestamp: bigint) => string;
  formatDateRange: (startTimestamp: bigint, endTimestamp: bigint) => string;
  formatScheduleDate: (timestamp: bigint) => string;
  formatTime: (timeString: string) => string;
  formatDayDate: (timestamp: bigint) => string;
  formatWeekday: (timestamp: bigint) => string;
}

function RetroPostcardItineraryView({ 
  journey, 
  formatDate, 
  formatDateRange, 
  formatScheduleDate, 
  formatTime,
  formatDayDate,
  formatWeekday
}: RetroPostcardItineraryViewProps) {
  const { data: scheduleWithDays = [] } = useGetJourneyScheduleWithDays(journey.city);

  return (
    <div className="h-[90vh] overflow-y-auto p-8 bg-[#f5e6d3]">
      {/* Header with Vintage Postcard Style */}
      <div className="text-center mb-8 border-4 border-[#8b4513] p-6 bg-[#fff8dc] shadow-lg">
        <h1 className="text-5xl font-bold text-[#8b4513] mb-2" style={{ fontFamily: 'serif', letterSpacing: '2px' }}>
          GREETINGS FROM
        </h1>
        <h2 className="text-4xl font-bold text-[#cd853f] mb-3" style={{ fontFamily: 'serif' }}>
          {journey.city}
        </h2>
        <p className="text-lg text-[#a0522d] italic">
          {formatDateRange(journey.startDate, journey.endDate)}
        </p>
      </div>

      {/* Schedule by Days */}
      <div className="space-y-8">
        {scheduleWithDays.map(([dayLabel, items], dayIndex) => {
          // Get the date from the first item in this day
          const firstItemDate = items.length > 0 ? items[0].date : journey.startDate;
          
          return (
            <div key={dayIndex} className="bg-[#fff8dc] border-4 border-[#8b4513] p-6 shadow-lg">
              {/* Day Header with Vintage Stamp Style */}
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-block bg-[#cd853f] text-white px-4 py-3 border-4 border-[#8b4513] font-bold text-center leading-tight" style={{ fontFamily: 'serif' }}>
                  {dayLabel}
                  <br />
                  {formatDayDate(firstItemDate)}
                  <br />
                  {formatWeekday(firstItemDate)}
                </span>
                <div className="flex-1 border-t-4 border-dotted border-[#8b4513]"></div>
              </div>

              {/* Schedule Items */}
              <div className="space-y-3">
                {items.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    <div className="flex flex-wrap items-start gap-3 bg-white/80 p-4 border-2 border-[#cd853f]">
                      <span className="text-sm font-bold text-[#8b4513] min-w-[80px]" style={{ fontFamily: 'serif' }}>
                        {formatTime(item.time)}
                      </span>
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold text-[#8b4513] text-lg" style={{ fontFamily: 'serif' }}>
                          {item.location}
                        </p>
                        <p className="text-sm text-[#a0522d] italic">{item.activity}</p>
                      </div>
                    </div>
                    {itemIndex < items.length - 1 && (
                      <div className="ml-12 my-1">
                        <svg width="20" height="20" viewBox="0 0 20 20" className="text-[#8b4513]">
                          <path d="M10 0 L10 20 M5 15 L10 20 L15 15" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
