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

  // Schedule queries and mutations - now journey-specific
  const { data: scheduleItems = [] } = useGetScheduleItems(selectedJourneyForSchedule?.city || '');
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
        await addJourney.mutateAsync({
          city: journeyForm.city.trim(),
          startDate: startTimeNs,
          endDate: endTimeNs
        });
        
        // Determine if journey is upcoming, current, or previous for user feedback
        const now = new Date();
        const isUpcoming = startDateTime > now;
        const isCurrent = startDateTime <= now && endDateTime >= now;
        const isPrevious = endDateTime < now;
        
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
      setJourneyForm({ city: '', startDate: '', endDate: '' });
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

    // Validate date is within journey range - CORRECTED LOGIC
    const scheduleDateTime = new Date(`${scheduleForm.date}T${scheduleForm.time}`);
    const journeyStart = new Date(Number(selectedJourneyForSchedule.startDate) / 1000000);
    const journeyEnd = new Date(Number(selectedJourneyForSchedule.endDate) / 1000000);

    // Schedule must be on or after journey start AND on or before journey end
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
          journeyCity: selectedJourneyForSchedule.city,
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
          journeyCity: selectedJourneyForSchedule.city,
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
        journeyCity: selectedJourneyForSchedule.city,
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
    
    // Make location field mandatory in edit form too
    if (!selectedScheduleItem || !selectedJourneyForSchedule || !editForm.date || !editForm.time || !editForm.location.trim() || !editForm.activity.trim()) {
      toast.error('Please fill in all required fields including location');
      return;
    }

    // Validate date is within journey range - CORRECTED LOGIC
    const newDateTime = new Date(`${editForm.date}T${editForm.time}`);
    const journeyStart = new Date(Number(selectedJourneyForSchedule.startDate) / 1000000);
    const journeyEnd = new Date(Number(selectedJourneyForSchedule.endDate) / 1000000);

    // Schedule must be on or after journey start AND on or before journey end
    if (newDateTime < journeyStart || newDateTime > journeyEnd) {
      toast.error(`Date/time must be between ${journeyStart.toLocaleString()} and ${journeyEnd.toLocaleString()}`);
      return;
    }

    try {
      // Delete the old item
      await deleteScheduleItem.mutateAsync({
        journeyCity: selectedJourneyForSchedule.city,
        date: selectedScheduleItem.date,
        time: selectedScheduleItem.time
      });

      // Add the item with new details
      const newDateTimestamp = BigInt(newDateTime.getTime() * 1000000);
      await addScheduleItem.mutateAsync({
        journeyCity: selectedJourneyForSchedule.city,
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
    const startDate = new Date(Number(journey.startDate) / 1000000); // Convert from nanoseconds
    const endDate = new Date(Number(journey.endDate) / 1000000);
    
    // Set date range for calendar
    setDateRange({
      from: startDate,
      to: endDate
    });
    
    // Extract time from dates
    setStartTime(format(startDate, 'HH:mm'));
    setEndTime(format(endDate, 'HH:mm'));
    
    setJourneyForm({
      city: journey.city,
      startDate: startDate.toISOString().slice(0, 16), // datetime-local format
      endDate: endDate.toISOString().slice(0, 16) // datetime-local format
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
    setJourneyForm({ city: '', startDate: '', endDate: '' });
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
    // Use setTimeout to ensure state is properly reset before opening
    setTimeout(() => {
      setIsJourneyDialogOpen(true);
    }, 0);
  };

  const handleJourneyDialogOpenChange = (open: boolean) => {
    setIsJourneyDialogOpen(open);
    if (!open) {
      // Reset form when dialog closes
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

  // Helper function to determine journey category based on dates
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

  // Sort schedule items by date and time, then group by date
  const sortAndGroupScheduleItems = (items: ScheduleItem[]): Record<string, ScheduleItem[]> => {
    const sorted = [...items].sort((a, b) => {
      const dateA = Number(a.date);
      const dateB = Number(b.date);
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      // If dates are the same, sort by time
      const timeA = new Date(`2000-01-01T${a.time}`);
      const timeB = new Date(`2000-01-01T${b.time}`);
      return timeA.getTime() - timeB.getTime();
    });

    // Group by date
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

  // Get min and max dates for the selected journey
  const getJourneyDateRange = () => {
    if (!selectedJourneyForSchedule) return { min: '', max: '' };
    
    const startDate = new Date(Number(selectedJourneyForSchedule.startDate) / 1000000);
    const endDate = new Date(Number(selectedJourneyForSchedule.endDate) / 1000000);
    
    return {
      min: startDate.toISOString().split('T')[0],
      max: endDate.toISOString().split('T')[0]
    };
  };

  const scheduleDateRange = getJourneyDateRange();

  // Handle date range selection from calendar
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (range?.from && range?.to) {
      // Combine date with time
      const startDateTime = new Date(range.from);
      const [startHour, startMinute] = startTime.split(':');
      startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
      
      const endDateTime = new Date(range.to);
      const [endHour, endMinute] = endTime.split(':');
      endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
      
      setJourneyForm(prev => ({
        ...prev,
        startDate: startDateTime.toISOString().slice(0, 16),
        endDate: endDateTime.toISOString().slice(0, 16)
      }));
    }
  };

  // Handle time changes
  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    
    if (dateRange?.from) {
      const startDateTime = new Date(dateRange.from);
      const [hour, minute] = time.split(':');
      startDateTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
      
      setJourneyForm(prev => ({
        ...prev,
        startDate: startDateTime.toISOString().slice(0, 16)
      }));
    }
  };

  const handleEndTimeChange = (time: string) => {
    setEndTime(time);
    
    if (dateRange?.to) {
      const endDateTime = new Date(dateRange.to);
      const [hour, minute] = time.split(':');
      endDateTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
      
      setJourneyForm(prev => ({
        ...prev,
        endDate: endDateTime.toISOString().slice(0, 16)
      }));
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
            title="Admin Panel"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto z-[3100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Menu className="h-5 w-5" />
              Admin Control Panel
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Trip Management Panel */}
            <Collapsible 
              open={openPanels.includes('trip')} 
              onOpenChange={() => togglePanel('trip')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between p-4 h-auto"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    <span className="font-semibold">Trip Management</span>
                  </div>
                  {openPanels.includes('trip') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Travel Journeys</h3>
                    <p className="text-sm text-muted-foreground">
                      You can add both upcoming and previous journeys. Click on any journey to manage its detailed schedule with activities and plans.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleAddJourneyClick} 
                    className="flex items-center gap-2"
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Journey
                  </Button>
                </div>
                
                {/* Vertical Layout for Upcoming, Current, and Previous Journeys */}
                <div className="space-y-6">
                  {/* Upcoming Journeys */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <Clock className="h-5 w-5" />
                        Upcoming Journeys
                        <Badge variant="secondary" className="ml-2">
                          {upcomingJourneys.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {upcomingJourneys.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No upcoming journeys planned</p>
                          <p className="text-sm">Add your next adventure!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {upcomingJourneys.map((journey) => {
                            return (
                              <div
                                key={journey.city}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => handleViewSchedule(journey)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                    <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium">{journey.city}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{getDaysDifference(journey.startDate, journey.endDate)} days</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditJourney(journey)}
                                    type="button"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteJourney(journey.city)}
                                    className="text-destructive hover:text-destructive"
                                    type="button"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Current Journeys */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                        <MapPin className="h-5 w-5" />
                        Current Journeys
                        <Badge variant="secondary" className="ml-2">
                          {currentJourneys.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentJourneys.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No journeys currently active</p>
                          <p className="text-sm">Your ongoing travels will appear here</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {currentJourneys.map((journey) => {
                            return (
                              <div
                                key={journey.city}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => handleViewSchedule(journey)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                    <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium">{journey.city}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{getDaysDifference(journey.startDate, journey.endDate)} days</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditJourney(journey)}
                                    type="button"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteJourney(journey.city)}
                                    className="text-destructive hover:text-destructive"
                                    type="button"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Previous Journeys */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <MapPin className="h-5 w-5" />
                        Previous Journeys
                        <Badge variant="secondary" className="ml-2">
                          {previousJourneys.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {previousJourneys.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No previous journeys recorded</p>
                          <p className="text-sm">Your travel history will appear here</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {previousJourneys.map((journey) => {
                            return (
                              <div
                                key={journey.city}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => handleViewSchedule(journey)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium">{journey.city}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{getDaysDifference(journey.startDate, journey.endDate)} days</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditJourney(journey)}
                                    type="button"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteJourney(journey.city)}
                                    className="text-destructive hover:text-destructive"
                                    type="button"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Travel Spot Panel - Now at the same level as Trip Management */}
            <Collapsible 
              open={openPanels.includes('travelspot')} 
              onOpenChange={() => togglePanel('travelspot')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between p-4 h-auto"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span className="font-semibold">Travel Spot</span>
                  </div>
                  {openPanels.includes('travelspot') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 mt-4">
                <TravelSpotManager />
              </CollapsibleContent>
            </Collapsible>

            {/* Music Album Panel */}
            <Collapsible 
              open={openPanels.includes('music')} 
              onOpenChange={() => togglePanel('music')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between p-4 h-auto"
                >
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    <span className="font-semibold">Music Album</span>
                  </div>
                  {openPanels.includes('music') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 mt-4">
                <MusicAlbumManager />
              </CollapsibleContent>
            </Collapsible>

            {/* Geoname Geographical Panel */}
            <Collapsible 
              open={openPanels.includes('geoname')} 
              onOpenChange={() => togglePanel('geoname')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between p-4 h-auto"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    <span className="font-semibold">Geoname Geographical</span>
                  </div>
                  {openPanels.includes('geoname') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 mt-4">
                <GeonameGeographicalManager />
              </CollapsibleContent>
            </Collapsible>

            {/* Timezone Management Panel */}
            <Collapsible 
              open={openPanels.includes('timezone')} 
              onOpenChange={() => togglePanel('timezone')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between p-4 h-auto"
                >
                  <div className="flex items-center gap-2">
                    <MapPinned className="h-5 w-5" />
                    <span className="font-semibold">Timezone Management</span>
                  </div>
                  {openPanels.includes('timezone') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 mt-4">
                <TimezoneManagement />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </DialogContent>
      </Dialog>

      {/* Journey Dialog - Separate from main admin dialog */}
      <Dialog open={isJourneyDialogOpen} onOpenChange={handleJourneyDialogOpenChange}>
        <DialogContent className="sm:max-w-md z-[3200]">
          <DialogHeader>
            <DialogTitle>
              {editingJourney ? 'Edit Journey' : 'Add New Journey'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleJourneySubmit} className="space-y-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                type="text"
                placeholder="Enter city name"
                value={journeyForm.city}
                onChange={(e) => setJourneyForm(prev => ({ ...prev, city: e.target.value }))}
                disabled={!!editingJourney} // Disable city editing for existing journeys
                autoComplete="off"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Travel Period</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'PPP')} - {format(dateRange.to, 'PPP')}
                        </>
                      ) : (
                        format(dateRange.from, 'PPP')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[3300]" align="start">
                  <div className="p-4 space-y-4">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      numberOfMonths={2}
                      initialFocus
                    />
                    
                    <div className="border-t pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="startTime" className="text-xs">Start Time</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={startTime}
                            onChange={(e) => handleStartTimeChange(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endTime" className="text-xs">End Time</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={endTime}
                            onChange={(e) => handleEndTimeChange(e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => setIsCalendarOpen(false)}
                        disabled={!dateRange?.from || !dateRange?.to}
                      >
                        Confirm Selection
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              {dateRange?.from && dateRange?.to && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(`${format(dateRange.from, 'yyyy-MM-dd')}T${startTime}`), 'PPp')} - {format(new Date(`${format(dateRange.to, 'yyyy-MM-dd')}T${endTime}`), 'PPp')}
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Select date range and times for your journey
            </p>

            {/* Journey Category Preview */}
            {journeyCategory && (
              <Alert>
                <AlertDescription>
                  {journeyCategory === 'upcoming' && (
                    <span className="text-green-600 dark:text-green-400">
                      This journey will be categorized as <strong>Upcoming</strong>
                    </span>
                  )}
                  {journeyCategory === 'current' && (
                    <span className="text-orange-600 dark:text-orange-400">
                      This journey will be categorized as <strong>Current</strong>
                    </span>
                  )}
                  {journeyCategory === 'previous' && (
                    <span className="text-blue-600 dark:text-blue-400">
                      This journey will be categorized as <strong>Previous</strong>
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsJourneyDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addJourney.isPending || updateJourney.isPending || !dateRange?.from || !dateRange?.to}
              >
                {addJourney.isPending || updateJourney.isPending
                  ? 'Saving...'
                  : editingJourney
                  ? 'Update Journey'
                  : 'Add Journey'
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Journey Schedule Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={handleScheduleDialogOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto z-[3200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Journey Schedule - {selectedJourneyForSchedule?.city}
            </DialogTitle>
          </DialogHeader>
          
          {selectedJourneyForSchedule && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="font-semibold">{selectedJourneyForSchedule.city}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedJourneyForSchedule.startDate)} - {formatDate(selectedJourneyForSchedule.endDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getDaysDifference(selectedJourneyForSchedule.startDate, selectedJourneyForSchedule.endDate)} days
                  </p>
                </div>
                <Badge variant="outline">
                  {scheduleItems.length} scheduled items
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add/Edit Schedule Item Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {editingScheduleItem ? 'Edit Schedule Item' : 'Add Schedule Item'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleScheduleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="scheduleDate">Date</Label>
                        <Input
                          id="scheduleDate"
                          type="date"
                          min={scheduleDateRange.min}
                          max={scheduleDateRange.max}
                          value={scheduleForm.date}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Must be within journey dates: {formatDate(selectedJourneyForSchedule.startDate)} - {formatDate(selectedJourneyForSchedule.endDate)}
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="scheduleTime">Time</Label>
                        <Input
                          id="scheduleTime"
                          type="time"
                          value={scheduleForm.time}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="scheduleLocation">Location *</Label>
                        <Input
                          id="scheduleLocation"
                          type="text"
                          placeholder="e.g., Central Park, Tokyo Station, Hotel Lobby"
                          value={scheduleForm.location}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Location is required and will be displayed on the map with an airplane icon
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="scheduleActivity">Activity</Label>
                        <Input
                          id="scheduleActivity"
                          type="text"
                          placeholder="e.g., Visit museum, Lunch at restaurant, Flight departure"
                          value={scheduleForm.activity}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, activity: e.target.value }))}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        {editingScheduleItem && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetScheduleForm}
                          >
                            Cancel Edit
                          </Button>
                        )}
                        <Button type="submit" disabled={addScheduleItem.isPending || updateScheduleItem.isPending}>
                          {addScheduleItem.isPending || updateScheduleItem.isPending
                            ? 'Saving...'
                            : editingScheduleItem
                            ? 'Update Item'
                            : 'Add Item'
                          }
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Schedule Items List with Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Schedule Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scheduleItems.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No schedule items yet</p>
                        <p className="text-sm">Add activities and plans for your journey!</p>
                      </div>
                    ) : (
                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        {Object.entries(groupedScheduleItems).map(([dateKey, items]) => (
                          <div key={dateKey} className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b">
                              <Badge variant="secondary" className="font-medium">
                                {dateKey}
                              </Badge>
                            </div>
                            
                            {/* Timeline for this date */}
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
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-sm">
                                          {new Date(`2000-01-01T${item.time}`).toLocaleTimeString('en-US', { 
                                            hour: 'numeric', 
                                            minute: '2-digit',
                                            hour12: true 
                                          })}
                                        </span>
                                      </div>
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
                                    
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditScheduleItem(item)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteScheduleItem(item.date, item.time)}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                      {/* Six-dot handle moved to the right */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleSixDotClick(item)}
                                        className="text-muted-foreground hover:text-foreground"
                                      >
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Item Popup */}
      <Dialog open={isEditPopupOpen} onOpenChange={setIsEditPopupOpen}>
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
                min={scheduleDateRange.min}
                max={scheduleDateRange.max}
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
                onClick={() => setIsEditPopupOpen(false)}
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
