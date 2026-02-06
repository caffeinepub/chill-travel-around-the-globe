import React, { useState, useRef } from 'react';
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
import { formatJourneyPeriod } from '@/utils/itineraryDateFormat';
import { useRowWrapBreaks } from '@/hooks/useRowWrapBreaks';

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
              formatScheduleDate={formatScheduleDate}
              formatTime={formatTime}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Date/Time Popup */}
      <Dialog open={editPopupOpen} onOpenChange={setEditPopupOpen}>
        <DialogContent className="sm:max-w-md z-[3300]">
          <DialogHeader>
            <DialogTitle>Edit Schedule Item</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="editDate">Date</Label>
              <Input
                id="editDate"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="editTime">Time</Label>
              <Input
                id="editTime"
                type="time"
                value={editForm.time}
                onChange={(e) => setEditForm(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="editLocation">Location *</Label>
              <Input
                id="editLocation"
                type="text"
                placeholder="e.g., Central Park, Tokyo Station, Hotel Lobby"
                value={editForm.location}
                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Location is required and will be displayed on the map with an airplane icon
              </p>
            </div>
            
            <div>
              <Label htmlFor="editActivity">Activity</Label>
              <Input
                id="editActivity"
                type="text"
                placeholder="e.g., Visit museum, Lunch at restaurant, Flight departure"
                value={editForm.activity}
                onChange={(e) => setEditForm(prev => ({ ...prev, activity: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditPopupOpen(false)}
              >
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

// Separate component for each journey to handle its own schedule data
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
  badgeColor = 'primary',
  defaultSearchPlace
}: {
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
  badgeColor?: 'primary' | 'green' | 'orange' | 'blue';
  defaultSearchPlace: string;
}) {
  // Get schedule items with day labels for this specific journey
  const { data: scheduleWithDays = [] } = useGetJourneyScheduleWithDays(journey.city);

  // Sort items within each day by time in chronological order
  const sortedScheduleWithDays = scheduleWithDays.map(([dayLabel, items]) => {
    const sortedItems = [...items].sort((a, b) => {
      // Convert time strings to comparable format (24-hour)
      const timeA = a.time;
      const timeB = b.time;
      return timeA.localeCompare(timeB);
    });
    return [dayLabel, sortedItems] as [string, ScheduleItem[]];
  });

  // Calculate total items across all days
  const totalItems = sortedScheduleWithDays.reduce((sum, [_, items]) => sum + items.length, 0);

  const getBadgeColorClass = () => {
    switch (badgeColor) {
      case 'green':
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      case 'orange':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400';
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getBadgeColorClass()}`}>
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{journey.city}</CardTitle>
                    {totalItems > 0 && (
                      <Badge variant="outline">
                        {totalItems} items
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={isFlying ? "destructive" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlyingClick();
                      }}
                      className="flex items-center gap-1"
                      title={isFlying ? `Stop flying to ${journey.city}` : `Fly from ${defaultSearchPlace} to ${journey.city} on 3D globe`}
                    >
                      {isFlying ? (
                        <>
                          <X className="h-3 w-3" />
                          Stop Flying
                        </>
                      ) : (
                        <>
                          <Plane className="h-3 w-3" />
                          Flying
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewFullItinerary();
                      }}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Doodle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewRetroItinerary();
                      }}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Retro
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {totalItems === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No itinerary items for this journey</p>
                <p className="text-sm">Add schedule items in Trip Management to see them here!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedScheduleWithDays.map(([dayLabel, items]) => (
                  <div key={dayLabel} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Badge variant="secondary" className="font-medium">
                        {dayLabel}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {items.length > 0 && formatScheduleDate(items[0].date)}
                      </span>
                    </div>
                    
                    {/* Timeline for this day */}
                    <div className="relative pl-6">
                      {/* Vertical line */}
                      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border"></div>
                      
                      <div className="space-y-4">
                        {items.map((item, index) => (
                          <div 
                            key={`${Number(item.date)}-${item.time}-${index}`} 
                            className="relative flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                          >
                            {/* Timeline dot */}
                            <div className="absolute -left-6 top-4 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                            
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-fit">
                                <span className="font-medium">
                                  {formatTime(item.time)}
                                </span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{item.activity}</p>
                                {item.location && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {item.location}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Six-dot handle moved to the right */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onSixDotClick(item, journey)}
                              className="text-muted-foreground hover:text-foreground flex-shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
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

// Cute illustrated travel diary/scrapbook poster view - Compact layout with wrapping and between-row connectors
function ScrapbookItineraryView({
  journey,
  formatDate,
  formatScheduleDate,
  formatTime
}: {
  journey: Journey;
  formatDate: (timestamp: bigint) => string;
  formatScheduleDate: (timestamp: bigint) => string;
  formatTime: (timeString: string) => string;
}) {
  const { data: scheduleWithDays = [] } = useGetJourneyScheduleWithDays(journey.city);

  // Sort items within each day by time in chronological order
  const sortedScheduleWithDays = scheduleWithDays.map(([dayLabel, items]) => {
    const sortedItems = [...items].sort((a, b) => {
      const timeA = a.time;
      const timeB = b.time;
      return timeA.localeCompare(timeB);
    });
    return [dayLabel, sortedItems] as [string, ScheduleItem[]];
  });

  const getDaysDifference = (startDate: bigint, endDate: bigint) => {
    const start = new Date(Number(startDate) / 1000000);
    const end = new Date(Number(endDate) / 1000000);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalDays = getDaysDifference(journey.startDate, journey.endDate);
  const totalNights = totalDays > 0 ? totalDays - 1 : 0;

  // Activity type to icon mapping
  const getActivityIcon = (activity: string): string => {
    const lowerActivity = activity.toLowerCase();
    if (lowerActivity.includes('flight') || lowerActivity.includes('plane') || lowerActivity.includes('airport')) return '✈️';
    if (lowerActivity.includes('train') || lowerActivity.includes('railway')) return '🚂';
    if (lowerActivity.includes('food') || lowerActivity.includes('lunch') || lowerActivity.includes('dinner') || lowerActivity.includes('breakfast') || lowerActivity.includes('restaurant') || lowerActivity.includes('eat')) return '🍽️';
    if (lowerActivity.includes('hotel') || lowerActivity.includes('check-in') || lowerActivity.includes('accommodation')) return '🏨';
    if (lowerActivity.includes('car') || lowerActivity.includes('drive') || lowerActivity.includes('taxi')) return '🚗';
    if (lowerActivity.includes('museum') || lowerActivity.includes('gallery') || lowerActivity.includes('landmark') || lowerActivity.includes('visit') || lowerActivity.includes('tour')) return '🏛️';
    if (lowerActivity.includes('shopping') || lowerActivity.includes('shop') || lowerActivity.includes('market')) return '🛍️';
    if (lowerActivity.includes('beach') || lowerActivity.includes('swim')) return '🏖️';
    if (lowerActivity.includes('hike') || lowerActivity.includes('mountain') || lowerActivity.includes('trek')) return '⛰️';
    if (lowerActivity.includes('coffee') || lowerActivity.includes('cafe')) return '☕';
    return '📍';
  };

  return (
    <div className="h-[90vh] overflow-y-auto bg-[#fef9f3] relative" style={{
      backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 92, 46, 0.03) 2px, rgba(139, 92, 46, 0.03) 4px),
        repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 92, 46, 0.03) 2px, rgba(139, 92, 46, 0.03) 4px)
      `
    }}>
      {/* Decorative border elements */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-[#ffd4a3]/30 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#ffd4a3]/30 to-transparent pointer-events-none" />
      
      {/* Decorative corner flowers */}
      <div className="absolute top-3 left-3 text-3xl opacity-60 pointer-events-none">🌸</div>
      <div className="absolute top-3 right-3 text-3xl opacity-60 pointer-events-none">🌺</div>
      <div className="absolute bottom-3 left-3 text-3xl opacity-60 pointer-events-none">🌼</div>
      <div className="absolute bottom-3 right-3 text-3xl opacity-60 pointer-events-none">🌻</div>

      <div className="max-w-5xl mx-auto p-8 relative">
        {/* Compact header with city and duration on one line, plus journey period */}
        <div className="text-center mb-8 relative">
          <div className="inline-block relative">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h1 className="text-4xl font-bold relative z-10" style={{
                fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
                color: '#d97706',
                textShadow: '2px 2px 0px rgba(251, 191, 36, 0.3), -1px -1px 0px rgba(251, 191, 36, 0.2)'
              }}>
                {journey.city}
              </h1>
              <span className="text-2xl text-amber-700 font-bold" style={{
                fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive"
              }}>
                {totalDays}D{totalNights}N
              </span>
            </div>
            {/* Decorative underline */}
            <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent opacity-50 rounded-full" />
          </div>
          <p className="text-base mt-2 text-amber-700">
            {formatJourneyPeriod(journey.startDate, journey.endDate)}
          </p>
          
          {/* Decorative travel stamps */}
          <div className="absolute -top-3 -right-6 text-4xl opacity-40 rotate-12">✈️</div>
          <div className="absolute -top-2 -left-6 text-3xl opacity-40 -rotate-12">🗺️</div>
        </div>

        {/* Day storylines */}
        {sortedScheduleWithDays.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📔</div>
            <p className="text-xl text-amber-800" style={{
              fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive"
            }}>
              No activities scheduled yet
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedScheduleWithDays.map(([dayLabel, items], dayIndex) => (
              <DayScheduleRow
                key={dayLabel}
                dayLabel={dayLabel}
                items={items}
                dayIndex={dayIndex}
                formatTime={formatTime}
                getActivityIcon={getActivityIcon}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Day schedule row component with wrapping and between-row connectors
function DayScheduleRow({
  dayLabel,
  items,
  dayIndex,
  formatTime,
  getActivityIcon
}: {
  dayLabel: string;
  items: ScheduleItem[];
  dayIndex: number;
  formatTime: (timeString: string) => string;
  getActivityIcon: (activity: string) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rowBreakIndices, itemRefs } = useRowWrapBreaks(items.length, containerRef);

  return (
    <div className="relative">
      {/* Horizontal layout: Day label on left, schedule items on right */}
      <div className="flex items-start gap-3">
        {/* Compact day badge - 50% smaller */}
        <div className="flex-shrink-0 relative">
          <div className="bg-gradient-to-br from-amber-200 to-orange-200 rounded-full px-3 py-1.5 shadow-md border-2 border-white" style={{
            boxShadow: '0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)'
          }}>
            <span className="text-sm font-bold text-amber-900" style={{
              fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive"
            }}>
              {dayLabel}
            </span>
          </div>
          {/* Decorative pin */}
          <div className="absolute -top-1 -right-1 text-lg">📌</div>
        </div>

        {/* Schedule items in wrapping row - 50% smaller */}
        <div className="flex-1 relative bg-white/60 backdrop-blur-sm rounded-2xl p-3 shadow-lg border-2 border-amber-100" style={{
          boxShadow: '0 4px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)'
        }}>
          {/* Activity sequence with wrapping */}
          <div ref={containerRef} className="flex flex-wrap items-start gap-3">
            {items.map((item, index) => (
              <React.Fragment key={`${Number(item.date)}-${item.time}-${index}`}>
                {/* Activity icon with details - 50% smaller */}
                <div 
                  ref={(el) => { itemRefs.current[index] = el; }}
                  className="flex-shrink-0 text-center"
                >
                  {/* Doodle-style icon */}
                  <div className="relative mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center text-xl border-2 border-white shadow-md" style={{
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)'
                    }}>
                      {getActivityIcon(item.activity)}
                    </div>
                    {/* Small decorative star */}
                    {index === 0 && <div className="absolute -top-0.5 -right-0.5 text-sm">⭐</div>}
                  </div>
                  
                  {/* Time pill */}
                  <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full px-2 py-0.5 mb-1 border border-white shadow-sm">
                    <span className="text-[10px] font-bold text-blue-800 whitespace-nowrap" style={{
                      fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive"
                    }}>
                      {formatTime(item.time)}
                    </span>
                  </div>
                  
                  {/* Activity text with wrapping */}
                  <div className="max-w-[70px]">
                    <p className="text-[10px] font-semibold text-amber-900 mb-0.5 break-words whitespace-normal" style={{
                      fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word'
                    }}>
                      {item.activity}
                    </p>
                    {item.location && (
                      <p className="text-[9px] text-amber-700 break-words whitespace-normal" style={{
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word'
                      }}>
                        📍 {item.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Between-row connector (only at row breaks) - 50% smaller */}
                {rowBreakIndices.includes(index) && (
                  <div className="w-full flex justify-center my-1">
                    <svg width="15" height="10" viewBox="0 0 15 10" className="text-amber-400">
                      <path
                        d="M 7.5 0 L 7.5 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="2 2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 7.5 10 L 6 8.5 M 7.5 10 L 9 8.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}

                {/* Dotted curved arrow connector between items on same row - smaller */}
                {index < items.length - 1 && !rowBreakIndices.includes(index) && (
                  <div className="flex-shrink-0 flex items-center">
                    <svg width="15" height="10" viewBox="0 0 15 10" className="text-amber-400">
                      <path
                        d="M 1.25 5 Q 7.5 1.25, 13.75 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="2 2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 13.75 5 L 12.5 4.25 M 13.75 5 L 12.5 5.75"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative wave or leaf on alternating sides */}
      {dayIndex % 2 === 0 ? (
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-3xl opacity-40">🍃</div>
      ) : (
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-3xl opacity-40">🌊</div>
      )}
    </div>
  );
}

// Retro vintage postcard themed itinerary view - Compact layout with wrapping and between-row connectors
function RetroPostcardItineraryView({
  journey,
  formatDate,
  formatScheduleDate,
  formatTime
}: {
  journey: Journey;
  formatDate: (timestamp: bigint) => string;
  formatScheduleDate: (timestamp: bigint) => string;
  formatTime: (timeString: string) => string;
}) {
  const { data: scheduleWithDays = [] } = useGetJourneyScheduleWithDays(journey.city);

  // Sort items within each day by time in chronological order
  const sortedScheduleWithDays = scheduleWithDays.map(([dayLabel, items]) => {
    const sortedItems = [...items].sort((a, b) => {
      const timeA = a.time;
      const timeB = b.time;
      return timeA.localeCompare(timeB);
    });
    return [dayLabel, sortedItems] as [string, ScheduleItem[]];
  });

  const getDaysDifference = (startDate: bigint, endDate: bigint) => {
    const start = new Date(Number(startDate) / 1000000);
    const end = new Date(Number(endDate) / 1000000);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalDays = getDaysDifference(journey.startDate, journey.endDate);
  const totalNights = totalDays > 0 ? totalDays - 1 : 0;

  // Activity type to icon mapping (same as scrapbook)
  const getActivityIcon = (activity: string): string => {
    const lowerActivity = activity.toLowerCase();
    if (lowerActivity.includes('flight') || lowerActivity.includes('plane') || lowerActivity.includes('airport')) return '✈️';
    if (lowerActivity.includes('train') || lowerActivity.includes('railway')) return '🚂';
    if (lowerActivity.includes('food') || lowerActivity.includes('lunch') || lowerActivity.includes('dinner') || lowerActivity.includes('breakfast') || lowerActivity.includes('restaurant') || lowerActivity.includes('eat')) return '🍽️';
    if (lowerActivity.includes('hotel') || lowerActivity.includes('check-in') || lowerActivity.includes('accommodation')) return '🏨';
    if (lowerActivity.includes('car') || lowerActivity.includes('drive') || lowerActivity.includes('taxi')) return '🚗';
    if (lowerActivity.includes('museum') || lowerActivity.includes('gallery') || lowerActivity.includes('landmark') || lowerActivity.includes('visit') || lowerActivity.includes('tour')) return '🏛️';
    if (lowerActivity.includes('shopping') || lowerActivity.includes('shop') || lowerActivity.includes('market')) return '🛍️';
    if (lowerActivity.includes('beach') || lowerActivity.includes('swim')) return '🏖️';
    if (lowerActivity.includes('hike') || lowerActivity.includes('mountain') || lowerActivity.includes('trek')) return '⛰️';
    if (lowerActivity.includes('coffee') || lowerActivity.includes('cafe')) return '☕';
    return '📍';
  };

  return (
    <div className="h-[90vh] overflow-y-auto bg-[#f5e6d3] relative" style={{
      backgroundImage: `
        url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4a574' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
      `
    }}>
      {/* Stamp edge border effect */}
      <div className="absolute inset-0 pointer-events-none" style={{
        boxShadow: 'inset 0 0 0 10px #f5e6d3, inset 0 0 0 12px #c9a876, inset 0 0 0 14px #f5e6d3',
        background: `
          repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(139, 92, 46, 0.15) 8px, rgba(139, 92, 46, 0.15) 10px),
          repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(139, 92, 46, 0.15) 8px, rgba(139, 92, 46, 0.15) 10px)
        `,
        backgroundPosition: '0 0, 0 0',
        backgroundSize: '100% 14px, 14px 100%',
        backgroundRepeat: 'repeat-x, repeat-y'
      }} />

      {/* Film grain texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'multiply'
      }} />

      <div className="max-w-5xl mx-auto p-8 relative">
        {/* Compact vintage postcard title with city and duration on one line, plus journey period */}
        <div className="text-center mb-8 relative">
          <div className="inline-block relative">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h1 className="text-4xl font-bold relative z-10" style={{
                fontFamily: "'Courier New', 'Courier', monospace",
                color: '#8b5a2b',
                textShadow: '1.5px 1.5px 0px rgba(139, 90, 43, 0.2)',
                letterSpacing: '0.05em'
              }}>
                {journey.city}
              </h1>
              <span className="text-2xl font-bold" style={{ 
                fontFamily: "'Courier New', 'Courier', monospace",
                color: '#6b4423' 
              }}>
                {totalDays}D{totalNights}N
              </span>
            </div>
            {/* Vintage underline */}
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#8b5a2b] opacity-30" />
          </div>
          <p className="text-base mt-2" style={{ color: '#8b5a2b' }}>
            {formatJourneyPeriod(journey.startDate, journey.endDate)}
          </p>
          
          {/* Vintage postal stamps */}
          <div className="absolute -top-3 -right-6 text-4xl opacity-50 rotate-12">📮</div>
          <div className="absolute -top-2 -left-6 text-3xl opacity-50 -rotate-12">✉️</div>
        </div>

        {/* Day storylines with vintage postcard aesthetic */}
        {sortedScheduleWithDays.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📬</div>
            <p className="text-xl" style={{
              fontFamily: "'Courier New', 'Courier', monospace",
              color: '#8b5a2b'
            }}>
              No activities scheduled yet
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedScheduleWithDays.map(([dayLabel, items], dayIndex) => (
              <RetroDayScheduleRow
                key={dayLabel}
                dayLabel={dayLabel}
                items={items}
                dayIndex={dayIndex}
                formatTime={formatTime}
                getActivityIcon={getActivityIcon}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Retro day schedule row component with wrapping and between-row connectors
function RetroDayScheduleRow({
  dayLabel,
  items,
  dayIndex,
  formatTime,
  getActivityIcon
}: {
  dayLabel: string;
  items: ScheduleItem[];
  dayIndex: number;
  formatTime: (timeString: string) => string;
  getActivityIcon: (activity: string) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rowBreakIndices, itemRefs } = useRowWrapBreaks(items.length, containerRef);

  return (
    <div className="relative">
      {/* Horizontal layout: Day label on left, schedule items on right */}
      <div className="flex items-start gap-3">
        {/* Compact day stamp - 50% smaller */}
        <div className="flex-shrink-0 relative">
          <div className="bg-gradient-to-br from-[#d4a574] to-[#b8956a] rounded px-3 py-1.5 shadow-md border border-[#8b5a2b]" style={{
            boxShadow: '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
          }}>
            <span className="text-sm font-bold" style={{
              fontFamily: "'Courier New', 'Courier', monospace",
              color: '#4a2f1a'
            }}>
              {dayLabel}
            </span>
          </div>
          {/* Vintage postmark */}
          <div className="absolute -top-1 -right-1 text-lg opacity-70">📌</div>
        </div>

        {/* Schedule items in wrapping row - 50% smaller */}
        <div className="flex-1 relative bg-[#ede0cc]/80 backdrop-blur-sm rounded p-3 shadow-lg border border-[#c9a876]" style={{
          boxShadow: '0 4px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)'
        }}>
          {/* Activity sequence with wrapping */}
          <div ref={containerRef} className="flex flex-wrap items-start gap-3">
            {items.map((item, index) => (
              <React.Fragment key={`${Number(item.date)}-${item.time}-${index}`}>
                {/* Activity icon with vintage styling - 50% smaller */}
                <div 
                  ref={(el) => { itemRefs.current[index] = el; }}
                  className="flex-shrink-0 text-center"
                >
                  {/* Vintage stamp-style icon */}
                  <div className="relative mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#e8d4b8] to-[#d4a574] rounded flex items-center justify-center text-xl border border-[#8b5a2b] shadow-md" style={{
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
                    }}>
                      {getActivityIcon(item.activity)}
                    </div>
                    {/* Vintage postmark circle */}
                    {index === 0 && <div className="absolute -top-0.5 -right-0.5 text-sm opacity-70">⭐</div>}
                  </div>
                  
                  {/* Time stamp */}
                  <div className="bg-gradient-to-r from-[#c9a876] to-[#b8956a] rounded px-2 py-0.5 mb-1 border border-[#8b5a2b] shadow-sm">
                    <span className="text-[10px] font-bold whitespace-nowrap" style={{
                      fontFamily: "'Courier New', 'Courier', monospace",
                      color: '#4a2f1a'
                    }}>
                      {formatTime(item.time)}
                    </span>
                  </div>
                  
                  {/* Activity text with vintage typography and wrapping */}
                  <div className="max-w-[70px]">
                    <p className="text-[10px] font-semibold mb-0.5 break-words whitespace-normal" style={{
                      fontFamily: "'Courier New', 'Courier', monospace",
                      color: '#6b4423',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word'
                    }}>
                      {item.activity}
                    </p>
                    {item.location && (
                      <p className="text-[9px] break-words whitespace-normal" style={{ 
                        color: '#8b5a2b',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word'
                      }}>
                        📍 {item.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Between-row connector (only at row breaks) - 50% smaller */}
                {rowBreakIndices.includes(index) && (
                  <div className="w-full flex justify-center my-1">
                    <svg width="15" height="10" viewBox="0 0 15 10" className="text-[#8b5a2b] opacity-50">
                      <path
                        d="M 7.5 0 L 7.5 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="2 2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 7.5 10 L 6 8.5 M 7.5 10 L 9 8.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}

                {/* Dotted curved arrow connector between items on same row - smaller */}
                {index < items.length - 1 && !rowBreakIndices.includes(index) && (
                  <div className="flex-shrink-0 flex items-center">
                    <svg width="15" height="10" viewBox="0 0 15 10" className="text-[#8b5a2b] opacity-50">
                      <path
                        d="M 1.25 5 Q 7.5 1.25, 13.75 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="2 2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 13.75 5 L 12.5 4.25 M 13.75 5 L 12.5 5.75"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Vintage decorative elements on alternating sides */}
      {dayIndex % 2 === 0 ? (
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-3xl opacity-30">📜</div>
      ) : (
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-3xl opacity-30">🗺️</div>
      )}
    </div>
  );
}
