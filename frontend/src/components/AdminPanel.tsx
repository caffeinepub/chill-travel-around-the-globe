import React, { useState } from 'react';
import { Settings, Plus, Trash2, Edit, Calendar, Clock } from 'lucide-react';
import { useGetAllJourneys, useAddJourney, useUpdateJourney, useDeleteJourney } from '../hooks/useQueries';
import { Journey } from '../backend';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface JourneyFormData {
  title: string;
  city: string;
  startDate: Date | null;
  endDate: Date | null;
  startTime: string;
  endTime: string;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { data: journeys = [], isLoading } = useGetAllJourneys();
  const addJourney = useAddJourney();
  const updateJourney = useUpdateJourney();
  const deleteJourney = useDeleteJourney();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [formData, setFormData] = useState<JourneyFormData>({
    title: '',
    city: '',
    startDate: null,
    endDate: null,
    startTime: '00:00',
    endTime: '23:59',
  });

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  const resetForm = () => {
    setFormData({ title: '', city: '', startDate: null, endDate: null, startTime: '00:00', endTime: '23:59' });
    setSelectedRange({ from: undefined, to: undefined });
    setShowAddForm(false);
    setEditingJourney(null);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.city || !formData.startDate || !formData.endDate) return;

    const [startHour, startMin] = formData.startTime.split(':').map(Number);
    const [endHour, endMin] = formData.endTime.split(':').map(Number);

    const startDateTime = new Date(formData.startDate);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endDateTime = new Date(formData.endDate);
    endDateTime.setHours(endHour, endMin, 0, 0);

    const startNs = BigInt(startDateTime.getTime()) * BigInt(1_000_000);
    const endNs = BigInt(endDateTime.getTime()) * BigInt(1_000_000);

    if (editingJourney) {
      await updateJourney.mutateAsync({
        title: editingJourney.title,
        startDate: startNs,
        endDate: endNs,
      });
    } else {
      await addJourney.mutateAsync({
        title: formData.title,
        city: formData.city,
        startDate: startNs,
        endDate: endNs,
      });
    }
    resetForm();
  };

  const handleEdit = (journey: Journey) => {
    const startDate = new Date(Number(journey.startDate) / 1_000_000);
    const endDate = new Date(Number(journey.endDate) / 1_000_000);
    const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
    setEditingJourney(journey);
    setFormData({
      title: journey.title,
      city: journey.city,
      startDate,
      endDate,
      startTime,
      endTime,
    });
    setSelectedRange({ from: startDate, to: endDate });
    setShowAddForm(true);
  };

  const handleDelete = async (title: string) => {
    if (confirm(`Delete journey "${title}"?`)) {
      await deleteJourney.mutateAsync(title);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Panel — Travel Journeys
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Journey Button */}
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add New Journey
            </Button>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <h3 className="font-semibold text-sm">{editingJourney ? 'Edit Journey' : 'New Journey'}</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="title" className="text-xs">Journey Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Tokyo Adventure"
                    className="mt-1 text-sm"
                    disabled={!!editingJourney}
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-xs">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="e.g. Tokyo"
                    className="mt-1 text-sm"
                    disabled={!!editingJourney}
                  />
                </div>
              </div>

              {/* Date Range Picker */}
              <div>
                <Label className="text-xs">Travel Period</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-1 text-sm justify-start font-normal">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formData.startDate && formData.endDate
                        ? `${formData.startDate.toLocaleDateString()} – ${formData.endDate.toLocaleDateString()}`
                        : 'Select date range'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={selectedRange}
                      onSelect={(range) => {
                        if (range) {
                          setSelectedRange({ from: range.from, to: range.to });
                          setFormData(prev => ({
                            ...prev,
                            startDate: range.from ?? null,
                            endDate: range.to ?? null,
                          }));
                          if (range.from && range.to) {
                            setCalendarOpen(false);
                          }
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startTime" className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.title || !formData.city || !formData.startDate || !formData.endDate || addJourney.isPending || updateJourney.isPending}
                  size="sm"
                  className="flex-1"
                >
                  {addJourney.isPending || updateJourney.isPending ? 'Saving...' : editingJourney ? 'Update Journey' : 'Add Journey'}
                </Button>
                <Button onClick={resetForm} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Journey List */}
          {isLoading ? (
            <div className="flex items-center justify-center h-16">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            </div>
          ) : journeys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No journeys yet. Add your first journey!</p>
          ) : (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Travel Journeys</h3>
              {journeys.map((journey) => (
                <div key={journey.title} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{journey.title}</p>
                    <p className="text-xs text-muted-foreground">{journey.city}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(journey.startDate)} – {formatDate(journey.endDate)}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(journey)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(journey.title)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
