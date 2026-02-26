import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Trash2, Edit, Plus, Loader2, Image, X } from 'lucide-react';
import { toast } from 'sonner';
import { useGetAllLocationInfo, useAddLocationInfo, useUpdateLocationInfo, useDeleteLocationInfo } from '@/hooks/useQueries';
import { useFileUpload, useFileUrl, useFileDelete } from '../blob-storage/FileStorage';
import { LocationInfo } from '@/backend';

interface LocationInfoDialogProps {
  locationName?: string;
  coordinates?: [number, number];
}

function LocationPhotoDisplay({ photoPath }: { photoPath: string }) {
  const { data: photoUrl } = useFileUrl(photoPath);
  if (!photoUrl) return <div className="w-full h-32 bg-muted rounded animate-pulse" />;
  return (
    <img
      src={photoUrl}
      alt="Location"
      className="w-full h-32 object-cover rounded"
    />
  );
}

export default function LocationInfoDialog({ locationName, coordinates }: LocationInfoDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationInfo | null>(null);
  const [newLocationName, setNewLocationName] = useState(locationName || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: allLocationInfo = [], refetch } = useGetAllLocationInfo();
  const addLocationInfo = useAddLocationInfo();
  const updateLocationInfo = useUpdateLocationInfo();
  const deleteLocationInfo = useDeleteLocationInfo();
  const { uploadFile, isUploading } = useFileUpload();
  const { deleteFile } = useFileDelete();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, or WebP image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newLocationName.trim()) {
      toast.error('Please enter a location name');
      return;
    }

    try {
      let photoPath: string | null = null;

      if (selectedFile) {
        const sanitizedName = newLocationName.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
        const fileName = `location-photos/${sanitizedName}/${Date.now()}_${selectedFile.name}`;
        const uploadResult = await uploadFile(fileName, selectedFile, (progress) => {
          setUploadProgress(progress);
        });
        photoPath = uploadResult.path;
      }

      await addLocationInfo.mutateAsync({
        name: newLocationName.trim(),
        coordinates: coordinates || [0, 0],
        photoPath: photoPath,
      });

      toast.success('Location info added successfully!');
      setNewLocationName('');
      setSelectedFile(null);
      setUploadProgress(0);
      setIsAdding(false);
      refetch();
    } catch (error) {
      console.error('Error adding location info:', error);
      toast.error('Failed to add location info');
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingLocation) return;

    try {
      let photoPath: string | null = editingLocation.photoPath || null;

      if (selectedFile) {
        const sanitizedName = editingLocation.name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
        const fileName = `location-photos/${sanitizedName}/${Date.now()}_${selectedFile.name}`;
        const uploadResult = await uploadFile(fileName, selectedFile, (progress) => {
          setUploadProgress(progress);
        });
        photoPath = uploadResult.path;
      }

      await updateLocationInfo.mutateAsync({
        name: editingLocation.name,
        photoPath: photoPath,
      });

      toast.success('Location info updated successfully!');
      setEditingLocation(null);
      setSelectedFile(null);
      setUploadProgress(0);
      refetch();
    } catch (error) {
      console.error('Error updating location info:', error);
      toast.error('Failed to update location info');
    }
  };

  const handleDeleteLocation = async (name: string, photoPath?: string) => {
    if (!confirm(`Are you sure you want to delete location info for "${name}"?`)) return;

    try {
      if (photoPath) {
        await deleteFile(photoPath);
      }
      await deleteLocationInfo.mutateAsync(name);
      toast.success('Location info deleted successfully!');
      refetch();
    } catch (error) {
      console.error('Error deleting location info:', error);
      toast.error('Failed to delete location info');
    }
  };

  const filteredLocationInfo = locationName
    ? allLocationInfo.filter(info => info.name.toLowerCase().includes(locationName.toLowerCase()))
    : allLocationInfo;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Camera className="h-4 w-4" />
          Location Photos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Location Photos
            {locationName && <Badge variant="secondary">{locationName}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Location */}
          {!isAdding && !editingLocation && (
            <Button onClick={() => setIsAdding(true)} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Location Photo
            </Button>
          )}

          {isAdding && (
            <form onSubmit={handleAddLocation} className="space-y-3 border rounded-lg p-4">
              <h4 className="font-medium">Add New Location Photo</h4>
              <div className="space-y-1">
                <Label htmlFor="locationName">Location Name</Label>
                <Input
                  id="locationName"
                  value={newLocationName}
                  onChange={e => setNewLocationName(e.target.value)}
                  placeholder="e.g., Eiffel Tower"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="locationPhoto">Photo (optional)</Label>
                <input
                  type="file"
                  id="locationPhoto"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="locationPhoto"
                  className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <Upload className="h-4 w-4" />
                  {selectedFile ? selectedFile.name : 'Choose image...'}
                </label>
              </div>
              {isUploading && (
                <div className="text-sm text-muted-foreground">
                  Uploading... {uploadProgress}%
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={isUploading || addLocationInfo.isPending} className="flex-1">
                  {(isUploading || addLocationInfo.isPending) ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</>
                  ) : (
                    'Add Location'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsAdding(false); setSelectedFile(null); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {editingLocation && (
            <form onSubmit={handleUpdateLocation} className="space-y-3 border rounded-lg p-4">
              <h4 className="font-medium">Edit: {editingLocation.name}</h4>
              {editingLocation.photoPath && (
                <LocationPhotoDisplay photoPath={editingLocation.photoPath} />
              )}
              <div className="space-y-1">
                <Label htmlFor="editLocationPhoto">Replace Photo (optional)</Label>
                <input
                  type="file"
                  id="editLocationPhoto"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="editLocationPhoto"
                  className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <Upload className="h-4 w-4" />
                  {selectedFile ? selectedFile.name : 'Choose new image...'}
                </label>
              </div>
              {isUploading && (
                <div className="text-sm text-muted-foreground">
                  Uploading... {uploadProgress}%
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={isUploading || updateLocationInfo.isPending} className="flex-1">
                  {(isUploading || updateLocationInfo.isPending) ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>
                  ) : (
                    'Update Location'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setEditingLocation(null); setSelectedFile(null); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Location List */}
          <div className="space-y-3">
            {filteredLocationInfo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No location photos yet
              </p>
            ) : (
              filteredLocationInfo.map((info, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{info.name}</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setEditingLocation(info); setIsAdding(false); }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteLocation(info.name, info.photoPath)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {info.photoPath && <LocationPhotoDisplay photoPath={info.photoPath} />}
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {info.coordinates[0].toFixed(4)}, {info.coordinates[1].toFixed(4)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
