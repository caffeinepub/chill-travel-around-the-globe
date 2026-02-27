import React, { useState } from 'react';
import { Upload, Trash2, Image, X } from 'lucide-react';
import { useGetAllLocationInfo, useAddLocationInfo, useUpdateLocationInfo, useDeleteLocationInfo } from '../hooks/useQueries';
import { LocationInfo } from '../backend';
import { useFileUpload, useFileDelete } from '../blob-storage/FileStorage';
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

interface LocationInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LocationInfoDialog({ isOpen, onClose }: LocationInfoDialogProps) {
  const { data: locationInfoList = [], isLoading } = useGetAllLocationInfo();
  const addLocationInfo = useAddLocationInfo();
  const updateLocationInfo = useUpdateLocationInfo();
  const deleteLocationInfo = useDeleteLocationInfo();
  const { uploadFile, isUploading } = useFileUpload();
  const { deleteFile } = useFileDelete();

  const [editingLocation, setEditingLocation] = useState<LocationInfo | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationLat, setNewLocationLat] = useState('');
  const [newLocationLng, setNewLocationLng] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async () => {
    if (!newLocationName || !newLocationLat || !newLocationLng) return;
    const lat = parseFloat(newLocationLat);
    const lng = parseFloat(newLocationLng);
    if (isNaN(lat) || isNaN(lng)) return;

    let photoPath: string | null = null;
    if (photoFile) {
      const path = `locations/${newLocationName.replace(/\s+/g, '-').toLowerCase()}.jpg`;
      const result = await uploadFile(path, photoFile);
      photoPath = result.path;
    }

    await addLocationInfo.mutateAsync({
      name: newLocationName,
      coordinates: [lat, lng],
      photoPath,
    });

    setNewLocationName('');
    setNewLocationLat('');
    setNewLocationLng('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowAddForm(false);
  };

  const handleUpdate = async () => {
    if (!editingLocation) return;

    let photoPath: string | null = editingLocation.photoPath ?? null;
    if (photoFile) {
      const path = `locations/${editingLocation.name.replace(/\s+/g, '-').toLowerCase()}.jpg`;
      const result = await uploadFile(path, photoFile);
      photoPath = result.path;
    }

    await updateLocationInfo.mutateAsync({
      name: editingLocation.name,
      photoPath,
    });

    setEditingLocation(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleDelete = async (location: LocationInfo) => {
    if (confirm(`Delete location "${location.name}"?`)) {
      if (location.photoPath) {
        await deleteFile(location.photoPath);
      }
      await deleteLocationInfo.mutateAsync(location.name);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Location Photos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showAddForm && !editingLocation && (
            <Button onClick={() => setShowAddForm(true)} variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Add Location Photo
            </Button>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <h3 className="font-semibold text-sm">Add New Location</h3>
              <div>
                <Label htmlFor="locName" className="text-xs">Location Name</Label>
                <Input id="locName" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} placeholder="e.g. Eiffel Tower" className="mt-1 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="locLat" className="text-xs">Latitude</Label>
                  <Input id="locLat" value={newLocationLat} onChange={(e) => setNewLocationLat(e.target.value)} placeholder="48.8584" className="mt-1 text-sm" />
                </div>
                <div>
                  <Label htmlFor="locLng" className="text-xs">Longitude</Label>
                  <Input id="locLng" value={newLocationLng} onChange={(e) => setNewLocationLng(e.target.value)} placeholder="2.2945" className="mt-1 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Photo (optional)</Label>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="mt-1 text-xs w-full" />
                {photoPreview && <img src={photoPreview} alt="Preview" className="mt-2 h-24 w-full object-cover rounded" />}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={!newLocationName || !newLocationLat || !newLocationLng || addLocationInfo.isPending || isUploading} size="sm" className="flex-1">
                  {addLocationInfo.isPending || isUploading ? 'Adding...' : 'Add Location'}
                </Button>
                <Button onClick={() => { setShowAddForm(false); setPhotoFile(null); setPhotoPreview(null); }} variant="outline" size="sm">Cancel</Button>
              </div>
            </div>
          )}

          {/* Edit Form */}
          {editingLocation && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <h3 className="font-semibold text-sm">Edit: {editingLocation.name}</h3>
              <div>
                <Label className="text-xs">Replace Photo (optional)</Label>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="mt-1 text-xs w-full" />
                {photoPreview && <img src={photoPreview} alt="Preview" className="mt-2 h-24 w-full object-cover rounded" />}
                {!photoPreview && editingLocation.photoPath && (
                  <p className="text-xs text-muted-foreground mt-1">Current photo: {editingLocation.photoPath}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdate} disabled={updateLocationInfo.isPending || isUploading} size="sm" className="flex-1">
                  {updateLocationInfo.isPending || isUploading ? 'Updating...' : 'Update Location'}
                </Button>
                <Button onClick={() => { setEditingLocation(null); setPhotoFile(null); setPhotoPreview(null); }} variant="outline" size="sm">Cancel</Button>
              </div>
            </div>
          )}

          {/* Location List */}
          {isLoading ? (
            <div className="flex items-center justify-center h-16">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            </div>
          ) : locationInfoList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No locations added yet.</p>
          ) : (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Locations ({locationInfoList.length})</h3>
              {locationInfoList.map((location) => (
                <div key={location.name} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{location.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {location.coordinates[0].toFixed(4)}, {location.coordinates[1].toFixed(4)}
                    </p>
                    {location.photoPath && (
                      <p className="text-xs text-primary truncate">{location.photoPath}</p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingLocation(location); setPhotoFile(null); setPhotoPreview(null); }}>
                      <Image className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(location)}>
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
