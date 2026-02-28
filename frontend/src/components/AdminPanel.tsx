import React, { useState } from 'react';
import { Menu, Calendar as CalendarIcon, Plus, Edit, Trash2, MapPin, Clock, Music, ChevronDown, ChevronRight, MoreHorizontal, Globe, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { useGetAllJourneys, useAddJourney, useUpdateJourney, useDeleteJourney, useGetScheduleItems, useAddScheduleItem, useUpdateScheduleItem, useDeleteScheduleItem } from '@/hooks/useQueries';
import { Journey, ScheduleItem } from '@/backend';
import TravelSpotManager from './TravelSpotManager';
import MusicAlbumManager from './MusicAlbumManager';
import GeonameGeographicalManager from './GeonameGeographicalManager';
import TimezoneManagement from './TimezoneManagement';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

interface JourneyFormData {
  title: string;
  city: string;
  startDate: string;
  endDate: string;
}

export default function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isJourneyDialogOpen, setIsJourneyDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [selectedJourneyForSchedule, setSelectedJourneyForSchedule] = useState<Journey | null>(null);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<ScheduleItem | null>(null);
  const [editForm, setEditForm] = useState({ date: '', time: '', location: '', activity: '' });
  const [journeyForm, setJourneyForm] = useState<JourneyFormData>({
    title: '',
    city: '',
    startDate: '',
    endDate: ''
  });

  // Calendar popover state
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Schedule state
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '',
    location: '',
    activity: ''
  });
  const [editingScheduleItem, setEditingScheduleItem] = useState<ScheduleItem | null>(null);

  // Accordion state for main panels
  const [openPanels, setOpenPanels] = useState<string[]>([]);

  // Journey queries and mutations - now using getAllJourneys and filtering on frontend
  const { data: allJourneys = [], refetch: refetchJourneys } = useGetAllJourneys();
  const addJourney = useAddJourney();
  const updateJourney = useUpdateJourney();
  const deleteJourney = useDeleteJourney();

  // Schedule queries and mutations - use journey title as the unique key (journeyId)
  const { data: scheduleItems = [] } = useGetScheduleItems(selectedJourneyForSchedule?.title || '');
  const addScheduleItem = useAddScheduleItem();
  const updateScheduleItem = useUpdateScheduleItem();
  const deleteScheduleItem = useDeleteScheduleItem();

  // Filter journeys based on current date
  const now = Date.now();
  const upcomingJourneys = allJourneys.filter(journey => {
    const startDate = Number(journey.startDate) / 1000000;
    return startDate > now;
  });
  
  const currentJourneys = allJourneys.filter(journey => {
    const startDate = Number(journey.startDate) / 1000000;
    const endDate = Number(journey.endDate) / 1000000;
    return startDate <= now && endDate >= now;
  });
  
  const previousJourneys = allJourneys.filter(journey => {
    const endDate = Number(journey.endDate) / 1000000;
    return endDate < now;
  });

  const togglePanel = (panelId: string) => {
    setOpenPanels(prev => 
      prev.includes(panelId) 
        ? prev.filter(id => id !== panelId)
        : [...prev, panelId]
    );
  };

  const handleJourneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!journeyForm.city.trim() || !dateRange?.from || !dateRange?.to) {
      toast.error('Please fill in all fields');
      return;
    }

    // Create date objects from the date range and time inputs
    const startDateTime = new Date(dateRange.from);
    const [startHour, startMinute] = startTime.split(':');
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    const endDateTime = new Date(dateRange.to);
    const [endHour, endMinute] = endTime.split(':');
    endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    if (endDateTime <= startDateTime) {
      toast.error('End date/time must be after start date/time');
      return;
    }

    try {
      const startTimeNs = BigInt(startDateTime.getTime() * 1000000); // Convert to nanoseconds
      const endTimeNs = BigInt(endDateTime.getTime() * 1000000);

      if (editingJourney) {
        const success = await updateJourney.mutateAsync({
          city: editingJourney.city,
          startDate: startTimeNs,
          endDate: endTimeNs
        });
        
        if (success) {
          toast.success('Journey updated successfully!');
        } else {
          toast.error('Failed to update journey');
          return;
        }
      } else {
        // Use title if provided, otherwise fall back to city name
        const journeyTitle = journeyForm.title.trim() || journeyForm.city.trim();
        await addJourney.mutateAsync({
          title: journeyTitle,
          city: journeyForm.city.trim(),
          startDate: startTimeNs,
          endDate: endTimeNs
        });
        
        // Determine if journey is upcoming, current, or previous for user feedback
        const nowDate = new Date();
        const isUpcoming = startDateTime > nowDate;
        const isCurrent = startDateTime <= nowDate && endDateTime >= nowDate;
        const isPrevious = endDateTime < nowDate;
        
        if (isUpcoming) {
          toast.success('Upcoming journey added successfully!');
        } else if (isCurrent) {
          toast.success('Current journey added successfully!');
        } else if (isPrevious) {
          toast.success('Previous journey added successfully!');
        } else {
          toast.success('Journey added successfully!');
        }
      }

      // Reset form and close dialog
      setJourneyForm({ title: '', city: '', startDate: '', endDate: '' });
      setDateRange(undefined);
      setStartTime('09:00');
      setEndTime('17:00');
      setEditingJourney(null);
      setIsJourneyDialogOpen(false);
      
      // Refetch data
      refetchJourneys();
    } catch (error) {
      console.error('Error saving journey:', error);
      toast.error('Failed to save journey');
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Make location field mandatory
    if (!scheduleForm.date || !scheduleForm.time || !scheduleForm.location.trim() || !scheduleForm.activity.trim() || !selectedJourneyForSchedule) {
      toast.error('Please fill in all required fields including location');
      return;
    }

    // Validate date is within journey range
    const scheduleDateTime = new Date(`${scheduleForm.date}T${scheduleForm.time}`);
    const journeyStart = new Date(Number(selectedJourneyForSchedule.startDate) / 1000000);
    const journeyEnd = new Date(Number(selectedJourneyForSchedule.endDate) / 1000000);

    if (scheduleDateTime < journeyStart || scheduleDateTime > journeyEnd) {
      toast.error(`Schedule date/time must be between ${journeyStart.toLocaleString()} and ${journeyEnd.toLocaleString()}`);
      return;
    }

    try {
      // Convert date string to timestamp (nanoseconds)
      const dateObj = new Date(scheduleForm.date);
      const dateTimestamp = BigInt(dateObj.getTime() * 1000000);

      if (editingScheduleItem) {
        const success = await updateScheduleItem.mutateAsync({
          journeyId: selectedJourneyForSchedule.title,
          date: dateTimestamp,
          time: scheduleForm.time,
          location: scheduleForm.location.trim(),
          activity: scheduleForm.activity.trim()
        });
        
        if (success) {
          toast.success('Schedule item updated successfully!');
        } else {
          toast.error('Failed to update schedule item');
          return;
        }
      } else {
        await addScheduleItem.mutateAsync({
          journeyId: selectedJourneyForSchedule.title,
          date: dateTimestamp,
          time: scheduleForm.time,
          location: scheduleForm.location.trim(),
          activity: scheduleForm.activity.trim()
        });
        
        toast.success('Schedule item added successfully!');
      }

      // Reset form
      setScheduleForm({ date: '', time: '', location: '', activity: '' });
      setEditingScheduleItem(null);
    } catch (error) {
      console.error('Error saving schedule item:', error);
      toast.error('Failed to save schedule item');
    }
  };

  const handleDeleteScheduleItem = async (date: bigint, time: string) => {
    if (!confirm('Are you sure you want to delete this schedule item?') || !selectedJourneyForSchedule) {
      return;
    }

    try {
      const success = await deleteScheduleItem.mutateAsync({ 
        journeyId: selectedJourneyForSchedule.title,
        date, 
        time 
      });
      if (success) {
        toast.success('Schedule item deleted successfully!');
      } else {
        toast.error('Failed to delete schedule item');
      }
    } catch (error) {
      console.error('Error deleting schedule item:', error);
      toast.error('Failed to delete schedule item');
    }
  };

  const handleEditScheduleItem = (item: ScheduleItem) => {
    setEditingScheduleItem(item);
    // Convert timestamp back to date string
    const dateObj = new Date(Number(item.date) / 1000000);
    const dateString = dateObj.toISOString().split('T')[0];
    
    setScheduleForm({
      date: dateString,
      time: item.time,
      location: item.location || '',
      activity: item.activity
    });
  };

  // Handle six-dot button click to open edit popup
  const handleSixDotClick = (item: ScheduleItem) => {
    setSelectedScheduleItem(item);
    const dateObj = new Date(Number(item.date) / 1000000);
    setEditForm({
      date: dateObj.toISOString().split('T')[0],
      time: item.time,
      location: item.location || '',
      activity: item.activity
    });
    setIsEditPopupOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedScheduleItem || !selectedJourneyForSchedule || !editForm.date || !editForm.time || !editForm.location.trim() || !editForm.activity.trim()) {
      toast.error('Please fill in all required fields including location');
      return;
    }

    const newDateTime = new Date(`${editForm.date}T${editForm.time}`);
    const journeyStart = new Date(Number(selectedJourneyForSchedule.startDate) / 1000000);
    const journeyEnd = new Date(Number(selectedJourneyForSchedule.endDate) / 1000000);

    if (newDateTime < journeyStart || newDateTime > journeyEnd) {
      toast.error(`Date/time must be between ${journeyStart.toLocaleString()} and ${journeyEnd.toLocaleString()}`);
      return;
    }

    try {
      // Delete the old item
      await deleteScheduleItem.mutateAsync({
        journeyId: selectedJourneyForSchedule.title,
        date: selectedScheduleItem.date,
        time: selectedScheduleItem.time
      });

      // Add the item with new details
      const newDateTimestamp = BigInt(newDateTime.getTime() * 1000000);
      await addScheduleItem.mutateAsync({
        journeyId: selectedJourneyForSchedule.title,
        date: newDateTimestamp,
        time: editForm.time,
        location: editForm.location.trim(),
        activity: editForm.activity.trim()
      });

      toast.success('Schedule item updated successfully!');
      setIsEditPopupOpen(false);
      setSelectedScheduleItem(null);
      setEditForm({ date: '', time: '', location: '', activity: '' });
    } catch (error) {
      console.error('Error updating schedule item:', error);
      toast.error('Failed to update schedule item');
    }
  };

  const handleEditJourney = (journey: Journey) => {
    setEditingJourney(journey);
    const startDate = new Date(Number(journey.startDate) / 1000000);
    const endDate = new Date(Number(journey.endDate) / 1000000);
    
    setDateRange({
      from: startDate,
      to: endDate
    });
    
    setStartTime(format(startDate, 'HH:mm'));
    setEndTime(format(endDate, 'HH:mm'));
    
    setJourneyForm({
      title: journey.title || journey.city,
      city: journey.city,
      startDate: startDate.toISOString().slice(0, 16),
      endDate: endDate.toISOString().slice(0, 16)
    });
    setIsJourneyDialogOpen(true);
  };

  const handleDeleteJourney = async (city: string) => {
    if (!confirm('Are you sure you want to delete this journey?')) {
      return;
    }

    try {
      const success = await deleteJourney.mutateAsync(city);
      if (success) {
        toast.success('Journey deleted successfully!');
        refetchJourneys();
      } else {
        toast.error('Failed to delete journey');
      }
    } catch (error) {
      console.error('Error deleting journey:', error);
      toast.error('Failed to delete journey');
    }
  };

  const handleViewSchedule = (journey: Journey) => {
    setSelectedJourneyForSchedule(journey);
    setIsScheduleDialogOpen(true);
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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

  const getDaysDifference = (startDate: bigint, endDate: bigint) => {
    const start = new Date(Number(startDate) / 1000000);
    const end = new Date(Number(endDate) / 1000000);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const resetJourneyForm = () => {
    setJourneyForm({ title: '', city: '', startDate: '', endDate: '' });
    setDateRange(undefined);
    setStartTime('09:00');
    setEndTime('17:00');
    setEditingJourney(null);
  };

  const resetScheduleForm = () => {
    setScheduleForm({ date: '', time: '', location: '', activity: '' });
    setEditingScheduleItem(null);
  };

  const handleAddJourneyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetJourneyForm();
    setTimeout(() => {
      setIsJourneyDialogOpen(true);
    }, 0);
  };

  const handleJourneyDialogOpenChange = (open: boolean) => {
    setIsJourneyDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        resetJourneyForm();
      }, 100);
    }
  };

  const handleScheduleDialogOpenChange = (open: boolean) => {
    setIsScheduleDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        resetScheduleForm();
        setSelectedJourneyForSchedule(null);
      }, 100);
    }
  };

  const getJourneyCategory = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return null;
    
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > now) {
      return 'upcoming';
    } else if (start <= now && end >= now) {
      return 'current';
    } else {
      return 'previous';
    }
  };

  const journeyCategory = getJourneyCategory(journeyForm.startDate, journeyForm.endDate);

  const sortAndGroupScheduleItems = (items: ScheduleItem[]): Record<string, ScheduleItem[]> => {
    const sorted = [...items].sort((a, b) => {
      const dateA = Number(a.date);
      const dateB = Number(b.date);
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      const timeA = new Date(`2000-01-01T${a.time}`);
      const timeB = new Date(`2000-01-01T${b.time}`);
      return timeA.getTime() - timeB.getTime();
    });

    return sorted.reduce((acc, item) => {
      const dateKey = formatScheduleDate(item.date);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    }, {} as Record<string, ScheduleItem[]>);
  };

  const groupedScheduleItems = sortAndGroupScheduleItems(scheduleItems);

  const getJourneyDateConstraints = () => {
    if (!selectedJourneyForSchedule) return {};
    const minDate = new Date(Number(selectedJourneyForSchedule.startDate) / 1000000).toISOString().split('T')[0];
    const maxDate = new Date(Number(selectedJourneyForSchedule.endDate) / 1000000).toISOString().split('T')[0];
    return { min: minDate, max: maxDate };
  };

  const dateConstraints = getJourneyDateConstraints();

  const renderJourneyList = (journeyList: Journey[], label: string, badgeColor: string) => {
    if (journeyList.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
        {journeyList.map((journey) => (
          <Collapsible key={journey.city} open={openPanels.includes(journey.city)} onOpenChange={() => togglePanel(journey.city)}>
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-card">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex-1 justify-start gap-2 h-auto p-0">
                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: badgeColor }} />
                    <div className="text-left">
                      <p className="font-medium text-sm">{journey.title || journey.city}</p>
                      <p className="text-xs text-muted-foreground">{journey.city} • {getDaysDifference(journey.startDate, journey.endDate)} days</p>
                    </div>
                    {openPanels.includes(journey.city) ? (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    ) : (
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleViewSchedule(journey)}
                    title="Manage Schedule"
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEditJourney(journey)}
                    title="Edit Journey"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteJourney(journey.city)}
                    title="Delete Journey"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <CollapsibleContent>
                <div className="p-3 border-t bg-muted/30 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Start:</span> {formatDate(journey.startDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">End:</span> {formatDate(journey.endDate)}
                  </p>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
            title="Admin Panel"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[3100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Menu className="h-5 w-5" />
              Admin Panel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Travel Journeys Section */}
            <Collapsible open={openPanels.includes('journeys')} onOpenChange={() => togglePanel('journeys')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Travel Journeys
                    <Badge variant="secondary">{allJourneys.length}</Badge>
                  </div>
                  {openPanels.includes('journeys') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-2">
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleAddJourneyClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Journey
                  </Button>
                </div>

                {allJourneys.length === 0 ? (
                  <Alert>
                    <AlertDescription>No journeys yet. Add your first journey to get started.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {renderJourneyList(currentJourneys, 'Current Journeys', '#22c55e')}
                    {renderJourneyList(upcomingJourneys, 'Upcoming Journeys', '#3b82f6')}
                    {renderJourneyList(previousJourneys, 'Previous Journeys', '#6b7280')}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Travel Spots Section */}
            <Collapsible open={openPanels.includes('travelSpots')} onOpenChange={() => togglePanel('travelSpots')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <MapPinned className="h-4 w-4" />
                    Travel Spots
                  </div>
                  {openPanels.includes('travelSpots') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <TravelSpotManager />
              </CollapsibleContent>
            </Collapsible>

            {/* Music Albums Section */}
            <Collapsible open={openPanels.includes('music')} onOpenChange={() => togglePanel('music')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Music Albums
                  </div>
                  {openPanels.includes('music') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <MusicAlbumManager />
              </CollapsibleContent>
            </Collapsible>

            {/* Geoname Cities Section */}
            <Collapsible open={openPanels.includes('geoname')} onOpenChange={() => togglePanel('geoname')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Geographical Cities
                  </div>
                  {openPanels.includes('geoname') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <GeonameGeographicalManager />
              </CollapsibleContent>
            </Collapsible>

            {/* Timezone Management Section */}
            <Collapsible open={openPanels.includes('timezone')} onOpenChange={() => togglePanel('timezone')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timezone Management
                  </div>
                  {openPanels.includes('timezone') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <TimezoneManagement />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Journey Dialog */}
      <Dialog open={isJourneyDialogOpen} onOpenChange={handleJourneyDialogOpenChange}>
        <DialogContent className="max-w-lg z-[3200]">
          <DialogHeader>
            <DialogTitle>{editingJourney ? 'Edit Journey' : 'Add New Journey'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleJourneySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="journeyTitle">Journey Title</Label>
              <Input
                id="journeyTitle"
                value={journeyForm.title}
                onChange={(e) => setJourneyForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Summer Europe Trip 2025"
                disabled={!!editingJourney}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="journeyCity">City</Label>
              <Input
                id="journeyCity"
                value={journeyForm.city}
                onChange={(e) => setJourneyForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g. Paris"
                disabled={!!editingJourney}
                required
              />
            </div>

            {/* Date Range Picker with drag-select */}
            <div className="space-y-2">
              <Label>Travel Period</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from && dateRange?.to
                      ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                      : 'Select date range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[3300]" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      if (range?.from && range?.to) {
                        setIsCalendarOpen(false);
                      }
                    }}
                    numberOfMonths={2}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {dateRange?.from && dateRange?.to && (
                <p className="text-xs text-muted-foreground">
                  {getDaysDifference(
                    BigInt(dateRange.from.getTime() * 1000000),
                    BigInt(dateRange.to.getTime() * 1000000)
                  )} days selected
                </p>
              )}
            </div>

            {/* Time inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Journey category preview */}
            {journeyCategory && (
              <Alert>
                <AlertDescription>
                  This journey will be categorized as: <strong>{journeyCategory}</strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => handleJourneyDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addJourney.isPending || updateJourney.isPending}>
                {editingJourney ? 'Update Journey' : 'Add Journey'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Management Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={handleScheduleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[3200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule for {selectedJourneyForSchedule?.title || selectedJourneyForSchedule?.city}
            </DialogTitle>
          </DialogHeader>

          {selectedJourneyForSchedule && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Journey period: {formatDate(selectedJourneyForSchedule.startDate)} – {formatDate(selectedJourneyForSchedule.endDate)}
                </AlertDescription>
              </Alert>

              {/* Add/Edit Schedule Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{editingScheduleItem ? 'Edit Schedule Item' : 'Add Schedule Item'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleScheduleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="scheduleDate">Date *</Label>
                        <Input
                          id="scheduleDate"
                          type="date"
                          value={scheduleForm.date}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                          min={dateConstraints.min}
                          max={dateConstraints.max}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="scheduleTime">Time *</Label>
                        <Input
                          id="scheduleTime"
                          type="time"
                          value={scheduleForm.time}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="scheduleLocation">Location *</Label>
                      <Input
                        id="scheduleLocation"
                        value={scheduleForm.location}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g. Eiffel Tower"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="scheduleActivity">Activity *</Label>
                      <Input
                        id="scheduleActivity"
                        value={scheduleForm.activity}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, activity: e.target.value }))}
                        placeholder="e.g. Visit the Eiffel Tower"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={addScheduleItem.isPending || updateScheduleItem.isPending}>
                        {editingScheduleItem ? 'Update' : 'Add'} Item
                      </Button>
                      {editingScheduleItem && (
                        <Button type="button" variant="outline" size="sm" onClick={resetScheduleForm}>
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Schedule Items List */}
              {Object.keys(groupedScheduleItems).length === 0 ? (
                <Alert>
                  <AlertDescription>No schedule items yet. Add your first item above.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedScheduleItems).map(([dateKey, items]) => (
                    <div key={dateKey} className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">{dateKey}</h4>
                      {items.map((item, index) => (
                        <Card key={index}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{item.time}</span>
                                  <span className="text-sm text-muted-foreground">•</span>
                                  <span className="text-sm">{item.activity}</span>
                                </div>
                                {item.location && (
                                  <div className="flex items-center gap-2 ml-5">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{item.location}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleSixDotClick(item)}
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEditScheduleItem(item)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteScheduleItem(item.date, item.time)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Item Popup */}
      <Dialog open={isEditPopupOpen} onOpenChange={setIsEditPopupOpen}>
        <DialogContent className="max-w-md z-[3300]">
          <DialogHeader>
            <DialogTitle>Edit Schedule Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="editDate">Date *</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                  min={dateConstraints.min}
                  max={dateConstraints.max}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="editTime">Time *</Label>
                <Input
                  id="editTime"
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, time: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="editLocation">Location *</Label>
              <Input
                id="editLocation"
                value={editForm.location}
                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Location name"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="editActivity">Activity *</Label>
              <Input
                id="editActivity"
                value={editForm.activity}
                onChange={(e) => setEditForm(prev => ({ ...prev, activity: e.target.value }))}
                placeholder="Activity description"
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditPopupOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={deleteScheduleItem.isPending || addScheduleItem.isPending}>
                Update Item
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
