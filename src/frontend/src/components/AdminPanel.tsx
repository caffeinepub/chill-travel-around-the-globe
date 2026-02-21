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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // Edit journey state - separate from add journey
  const [editDateRange, setEditDateRange] = useState<DateRange | undefined>();
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('17:00');
  const [isEditCalendarOpen, setIsEditCalendarOpen] = useState(false);

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

  const handleUpdateJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingJourney || !editDateRange?.from || !editDateRange?.to) {
      toast.error('Please fill in all fields');
      return;
    }

    // Create date objects from the edit date range and time inputs
    const newStartDateTime = new Date(editDateRange.from);
    const [editStartHour, editStartMinute] = editStartTime.split(':');
    newStartDateTime.setHours(parseInt(editStartHour), parseInt(editStartMinute), 0, 0);

    const newEndDateTime = new Date(editDateRange.to);
    const [editEndHour, editEndMinute] = editEndTime.split(':');
    newEndDateTime.setHours(parseInt(editEndHour), parseInt(editEndMinute), 0, 0);

    if (newEndDateTime <= newStartDateTime) {
      toast.error('End date/time must be after start date/time');
      return;
    }

    // Validate schedule items fall within new journey period
    const conflictingItems: ScheduleItem[] = [];
    for (const item of scheduleItems) {
      const itemDateTime = new Date(Number(item.date) / 1000000);
      if (itemDateTime < newStartDateTime || itemDateTime > newEndDateTime) {
        conflictingItems.push(item);
      }
    }

    if (conflictingItems.length > 0) {
      const itemsList = conflictingItems
        .map(item => {
          const itemDate = new Date(Number(item.date) / 1000000);
          return `• ${item.location} - ${item.activity} (${itemDate.toLocaleDateString()} ${item.time})`;
        })
        .join('\n');
      
      toast.error(
        `Cannot update journey: ${conflictingItems.length} schedule item(s) fall outside the new date range:\n${itemsList}`,
        { duration: 8000 }
      );
      return;
    }

    try {
      const startTimeNs = BigInt(newStartDateTime.getTime() * 1000000);
      const endTimeNs = BigInt(newEndDateTime.getTime() * 1000000);

      const success = await updateJourney.mutateAsync({
        city: editingJourney.city,
        startDate: startTimeNs,
        endDate: endTimeNs
      });
      
      if (success) {
        toast.success('Journey updated successfully!');
        
        // Reset edit form and close dialog
        setEditDateRange(undefined);
        setEditStartTime('09:00');
        setEditEndTime('17:00');
        setEditingJourney(null);
        setIsJourneyDialogOpen(false);
        
        // Refetch data
        refetchJourneys();
      } else {
        toast.error('Failed to update journey');
      }
    } catch (error) {
      console.error('Error updating journey:', error);
      toast.error('Failed to update journey');
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
    const startDate = new Date(Number(journey.startDate) / 1000000);
    const endDate = new Date(Number(journey.endDate) / 1000000);
    
    // Set edit date range for calendar
    setEditDateRange({
      from: startDate,
      to: endDate
    });
    
    // Extract time from dates
    setEditStartTime(format(startDate, 'HH:mm'));
    setEditEndTime(format(endDate, 'HH:mm'));
    
    setJourneyForm({
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
    setJourneyForm({ city: '', startDate: '', endDate: '' });
    setDateRange(undefined);
    setStartTime('09:00');
    setEndTime('17:00');
    setEditDateRange(undefined);
    setEditStartTime('09:00');
    setEditEndTime('17:00');
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

  const journeyDateRange = getJourneyDateRange();

  // Generate hour options (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return hour;
  });

  // Generate minute options (00-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => {
    const minute = i.toString().padStart(2, '0');
    return minute;
  });

  return (
    <>
      {/* Floating Control Deck Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Control Deck Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-h-[80vh] overflow-y-auto bg-background border rounded-lg shadow-xl">
          <div className="p-4 border-b bg-muted/50">
            <h2 className="text-xl font-bold">Control Deck</h2>
          </div>

          <div className="p-4 space-y-2">
            {/* Trip Management */}
            <Collapsible open={openPanels.includes('trips')} onOpenChange={() => togglePanel('trips')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Trip Management
                  </span>
                  {openPanels.includes('trips') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2 py-2 space-y-2">
                <Dialog open={isJourneyDialogOpen} onOpenChange={handleJourneyDialogOpenChange}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={handleAddJourneyClick}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Journey
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingJourney ? 'Edit Journey' : 'Add New Journey'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={editingJourney ? handleUpdateJourney : handleJourneySubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={journeyForm.city}
                          onChange={(e) => setJourneyForm({ ...journeyForm, city: e.target.value })}
                          placeholder="Enter city name"
                          required
                          disabled={!!editingJourney}
                        />
                      </div>

                      {/* Date Range Picker with Calendar Popover */}
                      <div>
                        <Label>Travel Period</Label>
                        <Popover open={editingJourney ? isEditCalendarOpen : isCalendarOpen} onOpenChange={editingJourney ? setIsEditCalendarOpen : setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editingJourney ? (
                                editDateRange?.from ? (
                                  editDateRange.to ? (
                                    <>
                                      {format(editDateRange.from, 'PPP')} - {format(editDateRange.to, 'PPP')}
                                    </>
                                  ) : (
                                    format(editDateRange.from, 'PPP')
                                  )
                                ) : (
                                  <span>Pick a date range</span>
                                )
                              ) : (
                                dateRange?.from ? (
                                  dateRange.to ? (
                                    <>
                                      {format(dateRange.from, 'PPP')} - {format(dateRange.to, 'PPP')}
                                    </>
                                  ) : (
                                    format(dateRange.from, 'PPP')
                                  )
                                ) : (
                                  <span>Pick a date range</span>
                                )
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="range"
                              selected={editingJourney ? editDateRange : dateRange}
                              onSelect={editingJourney ? setEditDateRange : setDateRange}
                              numberOfMonths={2}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Start Time */}
                      <div>
                        <Label>Start Time</Label>
                        <div className="flex gap-2">
                          <Select 
                            value={editingJourney ? editStartTime.split(':')[0] : startTime.split(':')[0]} 
                            onValueChange={(hour) => {
                              const minute = editingJourney ? editStartTime.split(':')[1] : startTime.split(':')[1];
                              const newTime = `${hour}:${minute}`;
                              if (editingJourney) {
                                setEditStartTime(newTime);
                              } else {
                                setStartTime(newTime);
                              }
                            }}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent>
                              {hourOptions.map((hour) => (
                                <SelectItem key={hour} value={hour}>
                                  {hour}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={editingJourney ? editStartTime.split(':')[1] : startTime.split(':')[1]} 
                            onValueChange={(minute) => {
                              const hour = editingJourney ? editStartTime.split(':')[0] : startTime.split(':')[0];
                              const newTime = `${hour}:${minute}`;
                              if (editingJourney) {
                                setEditStartTime(newTime);
                              } else {
                                setStartTime(newTime);
                              }
                            }}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Minute" />
                            </SelectTrigger>
                            <SelectContent>
                              {minuteOptions.map((minute) => (
                                <SelectItem key={minute} value={minute}>
                                  {minute}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* End Time */}
                      <div>
                        <Label>End Time</Label>
                        <div className="flex gap-2">
                          <Select 
                            value={editingJourney ? editEndTime.split(':')[0] : endTime.split(':')[0]} 
                            onValueChange={(hour) => {
                              const minute = editingJourney ? editEndTime.split(':')[1] : endTime.split(':')[1];
                              const newTime = `${hour}:${minute}`;
                              if (editingJourney) {
                                setEditEndTime(newTime);
                              } else {
                                setEndTime(newTime);
                              }
                            }}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent>
                              {hourOptions.map((hour) => (
                                <SelectItem key={hour} value={hour}>
                                  {hour}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={editingJourney ? editEndTime.split(':')[1] : endTime.split(':')[1]} 
                            onValueChange={(minute) => {
                              const hour = editingJourney ? editEndTime.split(':')[0] : endTime.split(':')[0];
                              const newTime = `${hour}:${minute}`;
                              if (editingJourney) {
                                setEditEndTime(newTime);
                              } else {
                                setEndTime(newTime);
                              }
                            }}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Minute" />
                            </SelectTrigger>
                            <SelectContent>
                              {minuteOptions.map((minute) => (
                                <SelectItem key={minute} value={minute}>
                                  {minute}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button type="submit" className="w-full">
                        {editingJourney ? 'Update Journey' : 'Add Journey'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Travel Journeys List */}
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Travel Journeys</h3>
                  
                  {/* Upcoming Journeys */}
                  {upcomingJourneys.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-blue-600">Upcoming</p>
                      {upcomingJourneys.map((journey) => (
                        <Card key={journey.city} className="p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{journey.city}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {getDaysDifference(journey.startDate, journey.endDate)} days
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewSchedule(journey)}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditJourney(journey)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteJourney(journey.city)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Current Journeys */}
                  {currentJourneys.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-600">Current</p>
                      {currentJourneys.map((journey) => (
                        <Card key={journey.city} className="p-2 border-green-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{journey.city}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {getDaysDifference(journey.startDate, journey.endDate)} days
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewSchedule(journey)}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditJourney(journey)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteJourney(journey.city)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Previous Journeys */}
                  {previousJourneys.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600">Previous</p>
                      {previousJourneys.map((journey) => (
                        <Card key={journey.city} className="p-2 opacity-75">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{journey.city}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {getDaysDifference(journey.startDate, journey.endDate)} days
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewSchedule(journey)}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditJourney(journey)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteJourney(journey.city)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {allJourneys.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No journeys yet. Add your first journey!
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Travel Spots */}
            <Collapsible open={openPanels.includes('spots')} onOpenChange={() => togglePanel('spots')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <MapPinned className="h-4 w-4" />
                    Travel Spots
                  </span>
                  {openPanels.includes('spots') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2 py-2">
                <TravelSpotManager />
              </CollapsibleContent>
            </Collapsible>

            {/* Music Albums */}
            <Collapsible open={openPanels.includes('music')} onOpenChange={() => togglePanel('music')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Music Albums
                  </span>
                  {openPanels.includes('music') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2 py-2">
                <MusicAlbumManager />
              </CollapsibleContent>
            </Collapsible>

            {/* Geoname Cities */}
            <Collapsible open={openPanels.includes('geoname')} onOpenChange={() => togglePanel('geoname')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Geoname Cities
                  </span>
                  {openPanels.includes('geoname') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2 py-2">
                <GeonameGeographicalManager />
              </CollapsibleContent>
            </Collapsible>

            {/* Timezone Management */}
            <Collapsible open={openPanels.includes('timezone')} onOpenChange={() => togglePanel('timezone')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timezone Data
                  </span>
                  {openPanels.includes('timezone') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2 py-2">
                <TimezoneManagement />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={handleScheduleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Schedule for {selectedJourneyForSchedule?.city}
            </DialogTitle>
          </DialogHeader>

          {selectedJourneyForSchedule && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Journey Period: {formatDate(selectedJourneyForSchedule.startDate)} - {formatDate(selectedJourneyForSchedule.endDate)}
                </AlertDescription>
              </Alert>

              {/* Add Schedule Item Form */}
              <form onSubmit={handleScheduleSubmit} className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold">
                  {editingScheduleItem ? 'Edit Schedule Item' : 'Add Schedule Item'}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="schedule-date">Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                      min={journeyDateRange.min}
                      max={journeyDateRange.max}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="schedule-time">Time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="schedule-location">Location *</Label>
                  <Input
                    id="schedule-location"
                    value={scheduleForm.location}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                    placeholder="Enter location (required)"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="schedule-activity">Activity</Label>
                  <Input
                    id="schedule-activity"
                    value={scheduleForm.activity}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, activity: e.target.value })}
                    placeholder="Enter activity"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingScheduleItem ? 'Update Item' : 'Add Item'}
                  </Button>
                  {editingScheduleItem && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingScheduleItem(null);
                        setScheduleForm({ date: '', time: '', location: '', activity: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>

              {/* Schedule Items List */}
              <div className="space-y-4">
                <h3 className="font-semibold">Schedule Items</h3>
                {Object.keys(groupedScheduleItems).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No schedule items yet. Add your first item!
                  </p>
                ) : (
                  Object.entries(groupedScheduleItems).map(([date, items]) => (
                    <div key={date} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">{date}</h4>
                      {items.map((item) => (
                        <Card key={`${item.date}-${item.time}`} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{item.time}</span>
                              </div>
                              <p className="text-sm mt-1">
                                <span className="font-medium">{item.location}</span>
                                {item.activity && ` - ${item.activity}`}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleSixDotClick(item)}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteScheduleItem(item.date, item.time)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Item Popup */}
      <Dialog open={isEditPopupOpen} onOpenChange={setIsEditPopupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Schedule Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  min={journeyDateRange.min}
                  max={journeyDateRange.max}
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
            </div>

            <div>
              <Label htmlFor="edit-location">Location *</Label>
              <Input
                id="edit-location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="Enter location (required)"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-activity">Activity</Label>
              <Input
                id="edit-activity"
                value={editForm.activity}
                onChange={(e) => setEditForm({ ...editForm, activity: e.target.value })}
                placeholder="Enter activity"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Update Item
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditPopupOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
