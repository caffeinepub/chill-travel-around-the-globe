import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, FileText, Info, Search, Loader2, AlertTriangle, Upload, Image, Video, X, Link, Youtube, Instagram, ExternalLink, CheckCircle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useGetTravelSpots, useGetAllTravelSpots, useAddTravelSpot, useUpdateTravelSpot, useDeleteTravelSpot, useAddMediaToTravelSpot, useAddSocialMediaLinkToTravelSpot, useGetTravelSpotMediaFiles, useGetTravelSpotSocialMediaLinks, validateSocialMediaUrl } from '@/hooks/useQueries';
import { useFileUpload, useFileUrl } from '@/blob-storage/FileStorage';
import { TravelSpot, MediaType, MediaFile, SocialMediaLink } from '@/backend';
import HeartRating from '@/components/HeartRating';

interface TravelSpotFormData {
  city: string;
  name: string;
  description: string;
  spotType: string;
  rating: number;
}

const TRAVEL_SPOT_TYPES = [
  'City', 'Hotel', 'Restaurant', 'Shopping', 'Heritage', 'Relax', 'Beach', 'Transport', 'Airport', 'Others'
];

export default function TravelSpotManager() {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [citySearchInput, setCitySearchInput] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<TravelSpot | null>(null);
  const [formData, setFormData] = useState<TravelSpotFormData>({
    city: '', name: '', description: '', spotType: '', rating: 0
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [socialMediaUrl, setSocialMediaUrl] = useState<string>('');
  const [isAddingSocialMedia, setIsAddingSocialMedia] = useState<boolean>(false);
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; platform?: string; error?: string } | null>(null);
  const [previewMediaFiles, setPreviewMediaFiles] = useState<MediaFile[]>([]);
  const [previewSocialMediaLinks, setPreviewSocialMediaLinks] = useState<SocialMediaLink[]>([]);

  const { uploadFile } = useFileUpload();

  const { data: allTravelSpots = [] } = useGetAllTravelSpots();
  const { data: travelSpots = [], refetch: refetchTravelSpots, isLoading } = useGetTravelSpots(selectedCity);
  const addTravelSpot = useAddTravelSpot();
  const updateTravelSpot = useUpdateTravelSpot();
  const deleteTravelSpot = useDeleteTravelSpot();
  const addMediaToTravelSpot = useAddMediaToTravelSpot();
  const addSocialMediaLinkToTravelSpot = useAddSocialMediaLinkToTravelSpot();

  const existingCities = Array.from(new Set(allTravelSpots.map(spot => spot.city))).sort();

  useEffect(() => {
    if (isDialogOpen) {
      setTimeout(() => {
        const selectElement = document.getElementById('spotType') as HTMLSelectElement;
        if (selectElement) {
          selectElement.innerHTML = '';
          const placeholderOption = document.createElement('option');
          placeholderOption.value = '';
          placeholderOption.textContent = 'Select travel spot type';
          placeholderOption.disabled = true;
          placeholderOption.selected = formData.spotType === '';
          selectElement.appendChild(placeholderOption);
          TRAVEL_SPOT_TYPES.forEach((type) => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            if (formData.spotType === type) option.selected = true;
            selectElement.appendChild(option);
          });
          selectElement.disabled = false;
        }
      }, 50);
    }
  }, [isDialogOpen, formData.spotType]);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setCitySearchInput(city);
  };

  const handleCitySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (citySearchInput.trim()) setSelectedCity(citySearchInput.trim());
  };

  const handleSocialMediaUrlChange = (value: string) => {
    setSocialMediaUrl(value);
    if (value.trim()) {
      const validation = validateSocialMediaUrl(value.trim());
      setUrlValidation(validation);
    } else {
      setUrlValidation(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/') && ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type);
      const isVideo = file.type.startsWith('video/') && ['video/mp4', 'video/mov', 'video/quicktime'].includes(file.type);
      return isImage || isVideo;
    });
    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Only JPEG, PNG, WebP, AVIF, MP4, and MOV files are supported.');
    }
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadTravelSpotMedia = async (spotName: string, city: string) => {
    if (selectedFiles.length === 0) return [];
    setIsUploading(true);
    const uploadedMediaFiles: MediaFile[] = [];
    try {
      for (const file of selectedFiles) {
        const mediaType = file.type.startsWith('image/') ? MediaType.image : MediaType.video;
        const fileExtension = file.name.split('.').pop() || 'unknown';
        const fileName = `${spotName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExtension}`;
        const filePath = `travel-spots/${city}/${spotName}/${fileName}`;
        const uploadResult = await uploadFile(filePath, file, (progress) => {
          console.log(`Upload progress for ${file.name}: ${progress}%`);
        });
        const mediaFile: MediaFile = {
          path: uploadResult.path,
          mediaType,
          format: fileExtension,
          uploadedAt: BigInt(Date.now() * 1000000),
        };
        await addMediaToTravelSpot.mutateAsync({ city, spotName, mediaFile });
        uploadedMediaFiles.push(mediaFile);
      }
      toast.success(`${selectedFiles.length} media file(s) uploaded successfully!`);
      setSelectedFiles([]);
      return uploadedMediaFiles;
    } catch (error) {
      console.error('Error uploading travel spot media:', error);
      toast.error('Failed to upload some media files. Please try again.');
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSocialMediaLink = async (): Promise<SocialMediaLink | null> => {
    if (!socialMediaUrl.trim()) {
      toast.error('Please enter a social media URL');
      return null;
    }
    const validation = validateSocialMediaUrl(socialMediaUrl.trim());
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid social media URL');
      return null;
    }
    setIsAddingSocialMedia(true);
    try {
      const socialMediaLink: SocialMediaLink = {
        url: socialMediaUrl.trim(),
        platform: validation.platform || 'unknown',
        addedAt: BigInt(Date.now() * 1000000),
      };
      await addSocialMediaLinkToTravelSpot.mutateAsync({
        city: formData.city.trim(),
        spotName: formData.name.trim(),
        socialMediaLink,
      });
      toast.success(`${validation.platform === 'youtube' ? 'YouTube' : 'Instagram'} video link added successfully`);
      setSocialMediaUrl('');
      setUrlValidation(null);
      return socialMediaLink;
    } catch (error) {
      console.error('Error adding social media link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add social media link');
      return null;
    } finally {
      setIsAddingSocialMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.city.trim() || !formData.name.trim() || !formData.spotType.trim()) {
      toast.error('Please enter city, travel spot name, and type');
      return;
    }
    try {
      if (editingSpot) {
        const success = await updateTravelSpot.mutateAsync({
          city: editingSpot.city,
          name: editingSpot.name,
          description: formData.description.trim() || null,
          coordinates: editingSpot.coordinates,
          spotType: formData.spotType.trim(),
          rating: formData.rating,
        });
        if (success) {
          toast.success('Travel spot updated successfully!');
          const uploadedMedia = selectedFiles.length > 0 ? await uploadTravelSpotMedia(editingSpot.name, editingSpot.city) : [];
          const addedSocialMedia = socialMediaUrl.trim() ? await handleAddSocialMediaLink() : null;
          if (uploadedMedia.length > 0 || addedSocialMedia) {
            setPreviewMediaFiles(uploadedMedia);
            setPreviewSocialMediaLinks(addedSocialMedia ? [addedSocialMedia] : []);
          }
        } else {
          toast.error('Failed to update travel spot');
          return;
        }
      } else {
        await addTravelSpot.mutateAsync({
          city: formData.city.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          coordinates: [0, 0],
          spotType: formData.spotType.trim(),
          rating: formData.rating,
        });
        toast.success('Travel spot added successfully!');
        const uploadedMedia = selectedFiles.length > 0 ? await uploadTravelSpotMedia(formData.name.trim(), formData.city.trim()) : [];
        const addedSocialMedia = socialMediaUrl.trim() ? await handleAddSocialMediaLink() : null;
        if (uploadedMedia.length > 0 || addedSocialMedia) {
          setPreviewMediaFiles(uploadedMedia);
          setPreviewSocialMediaLinks(addedSocialMedia ? [addedSocialMedia] : []);
        }
      }
      setFormData({ city: '', name: '', description: '', spotType: '', rating: 0 });
      setSelectedFiles([]);
      setSocialMediaUrl('');
      setUrlValidation(null);
      setEditingSpot(null);
      setIsDialogOpen(false);
      refetchTravelSpots();
    } catch (error: any) {
      console.error('Error saving travel spot:', error);
      toast.error('Failed to save travel spot. Please try again.');
    }
  };

  const handleEdit = (spot: TravelSpot) => {
    setEditingSpot(spot);
    setFormData({
      city: spot.city,
      name: spot.name,
      description: spot.description || '',
      spotType: spot.spotType.toString(),
      rating: spot.rating,
    });
    setSelectedFiles([]);
    setSocialMediaUrl('');
    setUrlValidation(null);
    setPreviewMediaFiles([]);
    setPreviewSocialMediaLinks([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (city: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const success = await deleteTravelSpot.mutateAsync({ city, name });
      if (success) {
        toast.success('Travel spot deleted successfully!');
        refetchTravelSpots();
      } else {
        toast.error('Failed to delete travel spot');
      }
    } catch (error) {
      console.error('Error deleting travel spot:', error);
      toast.error('Failed to delete travel spot');
    }
  };

  const resetForm = () => {
    setFormData({ city: '', name: '', description: '', spotType: '', rating: 0 });
    setSelectedFiles([]);
    setSocialMediaUrl('');
    setUrlValidation(null);
    setEditingSpot(null);
    setPreviewMediaFiles([]);
    setPreviewSocialMediaLinks([]);
  };

  const handleAddSpotClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetForm();
    setFormData(prev => ({ ...prev, city: selectedCity }));
    setTimeout(() => setIsDialogOpen(true), 0);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setTimeout(() => resetForm(), 100);
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSocialMediaIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube': return <Youtube className="h-4 w-4 text-red-500" />;
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-500" />;
      default: return <Link className="h-4 w-4 text-blue-500" />;
    }
  };

  const validTravelSpots = travelSpots.filter(spot => !(spot.coordinates[0] === 0 && spot.coordinates[1] === 0));
  const invalidTravelSpots = travelSpots.filter(spot => spot.coordinates[0] === 0 && spot.coordinates[1] === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Travel Spot Management</h3>
          <p className="text-sm text-muted-foreground">Add and manage places you've visited within cities with media and social media videos</p>
        </div>
        <Button onClick={handleAddSpotClick} className="flex items-center gap-2" type="button" disabled={!selectedCity}>
          <Plus className="h-4 w-4" />
          Add Spot
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Travel spots can include photos, videos, and YouTube/Instagram video links for a comprehensive media gallery.
        </AlertDescription>
      </Alert>

      {/* City Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Select City
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingCities.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Existing Cities</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {existingCities.map((city) => (
                  <Button key={city} variant={selectedCity === city ? 'default' : 'outline'} size="sm" onClick={() => handleCitySelect(city)}>
                    {city}
                    <Badge variant="secondary" className="ml-2">{allTravelSpots.filter(spot => spot.city === city).length}</Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="citySearch">Or Enter City Name</Label>
            <form onSubmit={handleCitySearchSubmit} className="flex gap-2 mt-1">
              <Input id="citySearch" type="text" placeholder="Enter city name..." value={citySearchInput} onChange={(e) => setCitySearchInput(e.target.value)} className="flex-1" />
              <Button type="submit" variant="outline"><Search className="h-4 w-4" /></Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Travel Spots List */}
      {selectedCity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Travel Spots in {selectedCity}
              <Badge variant="secondary">{travelSpots.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : travelSpots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No travel spots yet for {selectedCity}. Add your first spot!</p>
            ) : (
              <div className="space-y-3">
                {invalidTravelSpots.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {invalidTravelSpots.length} spot(s) have invalid coordinates (0,0). They may not display correctly on the map.
                    </AlertDescription>
                  </Alert>
                )}
                {travelSpots.map((spot) => (
                  <div key={spot.name} className="flex items-start justify-between p-3 bg-card border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{spot.name}</p>
                        <Badge variant="outline" className="text-xs">{spot.spotType}</Badge>
                        {spot.coordinates[0] === 0 && spot.coordinates[1] === 0 && (
                          <Badge variant="destructive" className="text-xs">No Coords</Badge>
                        )}
                      </div>
                      {spot.description && <p className="text-xs text-muted-foreground truncate">{spot.description}</p>}
                      <p className="text-xs text-muted-foreground">Rating: {spot.rating}/10</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(spot)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(spot.city, spot.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSpot ? 'Edit Travel Spot' : 'Add Travel Spot'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="spotCity" className="text-xs">City *</Label>
                <Input id="spotCity" value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} placeholder="e.g. Tokyo" className="mt-1 text-sm" disabled={!!editingSpot} required />
              </div>
              <div>
                <Label htmlFor="spotName" className="text-xs">Spot Name *</Label>
                <Input id="spotName" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Senso-ji Temple" className="mt-1 text-sm" disabled={!!editingSpot} required />
              </div>
            </div>

            <div>
              <Label htmlFor="spotType" className="text-xs">Spot Type *</Label>
              <select
                id="spotType"
                className="mt-1 w-full text-sm border border-input bg-background rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.spotType}
                onChange={(e) => setFormData(prev => ({ ...prev, spotType: e.target.value }))}
                required
              >
                <option value="" disabled>Select travel spot type</option>
                {TRAVEL_SPOT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="spotDescription" className="text-xs">Description</Label>
              <Textarea id="spotDescription" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe this travel spot..." className="mt-1 text-sm" rows={3} />
            </div>

            <div>
              <Label className="text-xs">Rating</Label>
              <div className="mt-1">
                <HeartRating rating={formData.rating} onRatingChange={(rating) => setFormData(prev => ({ ...prev, rating }))} />
              </div>
            </div>

            <Separator />

            {/* Media Upload */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Media Files (optional)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <Label htmlFor="spot-file-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span><Plus className="h-4 w-4 mr-2" />Select Files</span>
                  </Button>
                </Label>
                <input id="spot-file-upload" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime" onChange={handleFileSelect} className="hidden" />
                <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, AVIF, MP4, MOV</p>
              </div>
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      {getFileIcon(file)}
                      <span className="text-xs flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeFile(index)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Social Media Link */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Social Media Video Link (optional)</Label>
              <div className="space-y-2">
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or https://www.instagram.com/reel/..."
                  value={socialMediaUrl}
                  onChange={(e) => handleSocialMediaUrlChange(e.target.value)}
                  className={urlValidation ? (urlValidation.isValid ? 'border-green-500' : 'border-red-500') : ''}
                />
                {urlValidation && (
                  <div className={`flex items-center gap-2 text-xs ${urlValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {urlValidation.isValid ? (
                      <><CheckCircle className="h-3 w-3" /> Valid {urlValidation.platform === 'youtube' ? 'YouTube' : 'Instagram'} URL</>
                    ) : (
                      <><X className="h-3 w-3" /> {urlValidation.error}</>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={addTravelSpot.isPending || updateTravelSpot.isPending || isUploading} className="flex-1" size="sm">
                {addTravelSpot.isPending || updateTravelSpot.isPending || isUploading ? 'Saving...' : editingSpot ? 'Update Spot' : 'Add Spot'}
              </Button>
              <Button type="button" onClick={() => handleDialogOpenChange(false)} variant="outline" size="sm">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
