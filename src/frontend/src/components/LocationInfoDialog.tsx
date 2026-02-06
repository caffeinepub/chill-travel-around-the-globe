import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, X, Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LocationInfo } from '@/backend';
import { useAddLocationInfo, useUpdateLocationInfo, useDeleteLocationInfo } from '@/hooks/useQueries';
import { useFileUpload, useFileUrl, useFileDelete } from '../blob-storage/FileStorage';

interface LocationInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationName: string;
  coordinates: [number, number];
  existingInfo?: LocationInfo | null;
}

export default function LocationInfoDialog({
  open,
  onOpenChange,
  locationName,
  coordinates,
  existingInfo
}: LocationInfoDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { uploadFile, isUploading } = useFileUpload();
  const { deleteFile } = useFileDelete();
  const { data: existingPhotoUrl } = useFileUrl(existingInfo?.photoPath || '');
  
  const addLocationInfo = useAddLocationInfo();
  const updateLocationInfo = useUpdateLocationInfo();
  const deleteLocationInfo = useDeleteLocationInfo();

  const isEditing = !!existingInfo;
  const isLoading = addLocationInfo.isPending || updateLocationInfo.isPending || deleteLocationInfo.isPending || isUploading;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSave = async () => {
    if (!selectedFile && !existingInfo?.photoPath) {
      toast.error('Please upload a photo');
      return;
    }

    try {
      let photoPath = existingInfo?.photoPath;

      // Upload new photo if selected
      if (selectedFile) {
        const fileName = `locations/${locationName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
        const uploadResult = await uploadFile(fileName, selectedFile);
        photoPath = uploadResult.path;
      }

      if (isEditing) {
        const success = await updateLocationInfo.mutateAsync({
          name: locationName,
          photoPath
        });
        
        if (success) {
          toast.success('Location photo updated successfully!');
          onOpenChange(false);
        } else {
          toast.error('Failed to update location photo');
        }
      } else {
        await addLocationInfo.mutateAsync({
          name: locationName,
          coordinates,
          photoPath
        });
        
        toast.success('Location photo saved successfully!');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving location info:', error);
      toast.error('Failed to save location photo');
    }
  };

  const handleDelete = async () => {
    if (!existingInfo) return;

    try {
      // Delete associated photo if exists
      if (existingInfo.photoPath) {
        await deleteFile(existingInfo.photoPath);
      }

      const success = await deleteLocationInfo.mutateAsync(locationName);
      
      if (success) {
        toast.success('Location photo deleted successfully!');
        onOpenChange(false);
      } else {
        toast.error('Failed to delete location photo');
      }
    } catch (error) {
      console.error('Error deleting location info:', error);
      toast.error('Failed to delete location photo');
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {isEditing ? 'Edit' : 'Add'} Location Photo
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update' : 'Add'} a photo for <strong>{locationName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo Section */}
          <div className="space-y-2">
            <Label>Photo</Label>
            
            {/* Existing Photo */}
            {existingInfo?.photoPath && existingPhotoUrl && !selectedFile && (
              <Card>
                <CardContent className="p-3">
                  <div className="relative">
                    <img
                      src={existingPhotoUrl}
                      alt="Location photo"
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveFile}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* New Photo Preview */}
            {selectedFile && previewUrl && (
              <Card>
                <CardContent className="p-3">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Photo preview"
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveFile}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Upload Button */}
            {!selectedFile && (!existingInfo?.photoPath || !existingPhotoUrl) && (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a photo of this location
                </p>
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={isLoading}>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Photo
                    </span>
                  </Button>
                </Label>
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Max file size: 10MB. Supported formats: JPG, PNG, GIF
                </p>
              </div>
            )}

            {/* Replace Photo Button */}
            {(existingInfo?.photoPath || selectedFile) && (
              <Label htmlFor="photo-replace" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={isLoading}>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Replace Photo
                  </span>
                </Button>
              </Label>
            )}
            <Input
              id="photo-replace"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {isEditing && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {deleteLocationInfo.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEditing ? 'Update' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
