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

// Travel spot type options for dropdown
const TRAVEL_SPOT_TYPES = [
  'City',
  'Hotel',
  'Restaurant',
  'Shopping',
  'Heritage',
  'Relax',
  'Beach',
  'Transport',
  'Airport',
  'Others'
];

export default function TravelSpotManager() {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [citySearchInput, setCitySearchInput] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<TravelSpot | null>(null);
  const [formData, setFormData] = useState<TravelSpotFormData>({
    city: '',
    name: '',
    description: '',
    spotType: '',
    rating: 0
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [socialMediaUrl, setSocialMediaUrl] = useState<string>('');
  const [isAddingSocialMedia, setIsAddingSocialMedia] = useState<boolean>(false);
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; platform?: string; error?: string } | null>(null);
  const [previewMediaFiles, setPreviewMediaFiles] = useState<MediaFile[]>([]);
  const [previewSocialMediaLinks, setPreviewSocialMediaLinks] = useState<SocialMediaLink[]>([]);

  // File upload hook
  const { uploadFile } = useFileUpload();

  // Queries and mutations
  const { data: allTravelSpots = [] } = useGetAllTravelSpots();
  const { data: travelSpots = [], refetch: refetchTravelSpots, isLoading } = useGetTravelSpots(selectedCity);
  const addTravelSpot = useAddTravelSpot();
  const updateTravelSpot = useUpdateTravelSpot();
  const deleteTravelSpot = useDeleteTravelSpot();
  const addMediaToTravelSpot = useAddMediaToTravelSpot();
  const addSocialMediaLinkToTravelSpot = useAddSocialMediaLinkToTravelSpot();

  // Get unique cities from existing travel spots
  const existingCities = Array.from(new Set(allTravelSpots.map(spot => spot.city))).sort();

  // Initialize the travel spot type dropdown after DOM is ready
  useEffect(() => {
    if (isDialogOpen) {
      // Wait for the dialog to be fully rendered
      setTimeout(() => {
        const selectElement = document.getElementById('spotType') as HTMLSelectElement;
        if (selectElement) {
          // Clear existing options
          selectElement.innerHTML = '';
          
          // Add placeholder option
          const placeholderOption = document.createElement('option');
          placeholderOption.value = '';
          placeholderOption.textContent = 'Select travel spot type';
          placeholderOption.disabled = true;
          placeholderOption.selected = formData.spotType === '';
          selectElement.appendChild(placeholderOption);
          
          // Add options for each travel spot type
          TRAVEL_SPOT_TYPES.forEach((type) => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            if (formData.spotType === type) {
              option.selected = true;
            }
            selectElement.appendChild(option);
          });
          
          // Ensure the select is never disabled
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
    if (citySearchInput.trim()) {
      setSelectedCity(citySearchInput.trim());
    }
  };

  // Real-time URL validation for social media
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
      const isImage = file.type.startsWith('image/') && 
        ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type);
      const isVideo = file.type.startsWith('video/') && 
        ['video/mp4', 'video/mov', 'video/quicktime'].includes(file.type);
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

        // Create media file object
        const mediaFile = {
          path: uploadResult.path,
          mediaType,
          format: fileExtension,
          uploadedAt: BigInt(Date.now() * 1000000) // Convert to nanoseconds
        };

        // Add media to travel spot in backend
        await addMediaToTravelSpot.mutateAsync({
          city,
          spotName,
          mediaFile
        });

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

  const handleAddSocialMediaLink = async () => {
    if (!socialMediaUrl.trim()) {
      toast.error('Please enter a social media URL');
      return null;
    }

    // Validate URL
    const validation = validateSocialMediaUrl(socialMediaUrl.trim());
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid social media URL');
      return null;
    }

    setIsAddingSocialMedia(true);

    try {
      await addSocialMediaLinkToTravelSpot.mutateAsync({
        city: formData.city.trim(),
        spotName: formData.name.trim(),
        url: socialMediaUrl.trim()
      });

      const socialMediaLink: SocialMediaLink = {
        url: socialMediaUrl.trim(),
        platform: validation.platform || 'unknown',
        addedAt: BigInt(Date.now() * 1000000)
      };

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
          description: formData.description.trim() || undefined,
          spotType: formData.spotType.trim(),
          rating: formData.rating
        });
        
        if (success) {
          toast.success('Travel spot updated successfully!');
          
          // Upload media files if any are selected
          const uploadedMedia = selectedFiles.length > 0 ? await uploadTravelSpotMedia(editingSpot.name, editingSpot.city) : [];

          // Add social media link if provided
          const addedSocialMedia = socialMediaUrl.trim() ? await handleAddSocialMediaLink() : null;

          // Update preview with newly added content
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
          description: formData.description.trim() || undefined,
          spotType: formData.spotType.trim(),
          rating: formData.rating
        });
        
        toast.success('Travel spot added successfully with real coordinates!');
        
        // Upload media files if any are selected
        const uploadedMedia = selectedFiles.length > 0 ? await uploadTravelSpotMedia(formData.name.trim(), formData.city.trim()) : [];

        // Add social media link if provided
        const addedSocialMedia = socialMediaUrl.trim() ? await handleAddSocialMediaLink() : null;

        // Update preview with newly added content
        if (uploadedMedia.length > 0 || addedSocialMedia) {
          setPreviewMediaFiles(uploadedMedia);
          setPreviewSocialMediaLinks(addedSocialMedia ? [addedSocialMedia] : []);
        }
      }

      // Reset form and close dialog
      setFormData({ city: '', name: '', description: '', spotType: '', rating: 0 });
      setSelectedFiles([]);
      setSocialMediaUrl('');
      setUrlValidation(null);
      setEditingSpot(null);
      setIsDialogOpen(false);
      
      // Refetch data
      refetchTravelSpots();
    } catch (error: any) {
      console.error('Error saving travel spot:', error);
      if (error.message && error.message.includes('Could not find coordinates')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to save travel spot. Please try again.');
      }
    }
  };

  const handleEdit = (spot: TravelSpot) => {
    setEditingSpot(spot);
    setFormData({
      city: spot.city,
      name: spot.name,
      description: spot.description || '',
      spotType: spot.spotType.toString(), // Convert enum to string for display
      rating: spot.rating
    });
    setSelectedFiles([]);
    setSocialMediaUrl('');
    setUrlValidation(null);
    setPreviewMediaFiles([]);
    setPreviewSocialMediaLinks([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (city: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

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
    setTimeout(() => {
      setIsDialogOpen(true);
    }, 0);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        resetForm();
      }, 100);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="h-4 w-4 text-purple-500" />;
    }
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
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-500" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-500" />;
      default:
        return <Link className="h-4 w-4 text-blue-500" />;
    }
  };

  // Filter out spots with invalid coordinates and show warning
  const validTravelSpots = travelSpots.filter(spot => !(spot.coordinates[0] === 0 && spot.coordinates[1] === 0));
  const invalidTravelSpots = travelSpots.filter(spot => spot.coordinates[0] === 0 && spot.coordinates[1] === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Travel Spot Management</h3>
          <p className="text-sm text-muted-foreground">
            Add and manage places you've visited within cities with real-world coordinates, media, and social media videos
          </p>
        </div>
        
        <Button 
          onClick={handleAddSpotClick} 
          className="flex items-center gap-2"
          type="button"
          disabled={!selectedCity}
        >
          <Plus className="h-4 w-4" />
          Add Spot
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Travel spots are automatically geocoded to their real-world coordinates when added. 
          You can also upload photos, videos, and add YouTube/Instagram video links for each travel spot to create a comprehensive media gallery.
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
          {/* Existing Cities */}
          {existingCities.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Existing Cities</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {existingCities.map((city) => (
                  <Button
                    key={city}
                    variant={selectedCity === city ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCitySelect(city)}
                  >
                    {city}
                    <Badge variant="secondary" className="ml-2">
                      {allTravelSpots.filter(spot => spot.city === city).length}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* City Search/Input */}
          <div>
            <Label htmlFor="citySearch">Or Enter City Name</Label>
            <form onSubmit={handleCitySearchSubmit} className="flex gap-2 mt-1">
              <Input
                id="citySearch"
                type="text"
                placeholder="Enter city name..."
                value={citySearchInput}
                onChange={(e) => setCitySearchInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Travel Spots List */}
      {selectedCity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Travel Spots in {selectedCity}
              </div>
              <Badge variant="secondary">
                {validTravelSpots.length} spots
                {invalidTravelSpots.length > 0 && ` (${invalidTravelSpots.length} need coordinates)`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Warning for spots with invalid coordinates */}
            {invalidTravelSpots.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {invalidTravelSpots.length} travel spot{invalidTravelSpots.length > 1 ? 's' : ''} 
                  {invalidTravelSpots.length > 1 ? ' have' : ' has'} invalid coordinates and won't appear on the map. 
                  These were likely created before the geocoding feature was added.
                </AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading travel spots...</p>
              </div>
            ) : travelSpots.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No travel spots yet</p>
                <p className="text-sm">Add places you've visited in {selectedCity}!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {travelSpots.map((spot, index) => {
                  const hasValidCoordinates = !(spot.coordinates[0] === 0 && spot.coordinates[1] === 0);
                  const mediaCount = spot.mediaFiles ? spot.mediaFiles.length : 0;
                  const socialMediaCount = spot.socialMediaLinks ? spot.socialMediaLinks.length : 0;
                  
                  return (
                    <TravelSpotCard
                      key={`${spot.name}-${index}`}
                      spot={spot}
                      hasValidCoordinates={hasValidCoordinates}
                      mediaCount={mediaCount}
                      socialMediaCount={socialMediaCount}
                      onEdit={() => handleEdit(spot)}
                      onDelete={() => handleDelete(spot.city, spot.name)}
                      formatDate={formatDate}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Travel Spot Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl z-[3200] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSpot ? 'Edit Travel Spot' : 'Add New Travel Spot'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="spotCity">City</Label>
              <Input
                id="spotCity"
                type="text"
                placeholder="Enter city name"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                disabled={!!editingSpot} // Disable city editing for existing spots
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="spotType">Travel Spot Type *</Label>
              <select
                id="spotType"
                value={formData.spotType}
                onChange={(e) => setFormData(prev => ({ ...prev, spotType: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                {/* Options will be populated by JavaScript */}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Select the type of travel spot from the dropdown
              </p>
            </div>
            
            <div>
              <Label htmlFor="spotName">Travel Spot Name *</Label>
              <Input
                id="spotName"
                type="text"
                placeholder="e.g., Central Park, Eiffel Tower, Local Market"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={!!editingSpot} // Disable name editing for existing spots
                autoComplete="off"
              />
              {!editingSpot && (
                <p className="text-xs text-muted-foreground mt-1">
                  Be specific for better location accuracy (e.g., "Times Square" instead of just "Square")
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="spotRating">Rating (Optional)</Label>
              <div className="mt-2">
                <HeartRating 
                  rating={formData.rating} 
                  onRatingChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
                  size="md"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Rate this travel spot from 0.0 to 10.0
              </p>
            </div>
            
            <div>
              <Label htmlFor="spotDescription">Description (Optional)</Label>
              <Textarea
                id="spotDescription"
                placeholder="Describe what makes this place special..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Media Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Travel Spot Media (Optional)</Label>
                <Badge variant="outline" className="text-xs">
                  Photos & Videos
                </Badge>
              </div>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload photos and videos for this travel spot
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/mov,video/quicktime"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="media-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('media-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select Files
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported: JPEG, PNG, WebP, AVIF, MP4, MOV
                  </p>
                </div>
              </div>

              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Selected Files ({selectedFiles.length})</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getFileIcon(file)}
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Social Media Videos Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Social Media Videos (Optional)</Label>
                <Badge variant="outline" className="text-xs">
                  YouTube & Instagram
                </Badge>
              </div>
              
              {/* Information Alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Supported platforms and formats:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-red-500" />
                        <span><strong>YouTube:</strong> Video URLs (youtube.com/watch, youtu.be)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-500" />
                        <span><strong>Instagram:</strong> Posts, Reels, IGTV URLs</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Added videos will appear in the "Social Media" tab when viewing the travel spot on the map.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <div className="relative">
                    <Input
                      type="url"
                      placeholder="Paste YouTube or Instagram video URL here..."
                      value={socialMediaUrl}
                      onChange={(e) => handleSocialMediaUrlChange(e.target.value)}
                      className={`w-full pr-10 ${
                        urlValidation?.isValid === false ? 'border-red-300 focus:border-red-500' : 
                        urlValidation?.isValid === true ? 'border-green-300 focus:border-green-500' : ''
                      }`}
                    />
                    {urlValidation && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {urlValidation.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Real-time validation feedback */}
                  {urlValidation && (
                    <div className={`mt-2 text-sm flex items-center gap-2 ${
                      urlValidation.isValid ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {urlValidation.isValid ? (
                        <>
                          {urlValidation.platform === 'youtube' ? (
                            <Youtube className="h-4 w-4" />
                          ) : (
                            <Instagram className="h-4 w-4" />
                          )}
                          <span>
                            Valid {urlValidation.platform === 'youtube' ? 'YouTube' : 'Instagram'} video URL
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                          <span>{urlValidation.error}</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="mb-1"><strong>Example URLs:</strong></p>
                    <div className="space-y-1 pl-2">
                      <p>• YouTube: https://www.youtube.com/watch?v=VIDEO_ID</p>
                      <p>• Instagram: https://www.instagram.com/p/POST_ID/</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            {(previewMediaFiles.length > 0 || previewSocialMediaLinks.length > 0) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Preview - Recently Added</span>
                    <Badge variant="outline" className="text-xs">
                      {previewMediaFiles.length + previewSocialMediaLinks.length} items
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Media Files Preview */}
                    {previewMediaFiles.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Image className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-muted-foreground">Photos & Videos ({previewMediaFiles.length})</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {previewMediaFiles.slice(0, 4).map((mediaFile, index) => (
                            <MediaFilePreview key={index} mediaFile={mediaFile} />
                          ))}
                          {previewMediaFiles.length > 4 && (
                            <div className="aspect-square bg-muted/50 rounded border flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">+{previewMediaFiles.length - 4}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Social Media Links Preview */}
                    {previewSocialMediaLinks.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Link className="h-3 w-3 text-purple-500" />
                          <span className="text-xs text-muted-foreground">Social Media ({previewSocialMediaLinks.length})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {previewSocialMediaLinks.slice(0, 2).map((link, index) => (
                            <SocialMediaLinkPreview key={index} socialMediaLink={link} />
                          ))}
                          {previewSocialMediaLinks.length > 2 && (
                            <div className="p-2 bg-muted/50 rounded border flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">+{previewSocialMediaLinks.length - 2} more</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {!editingSpot && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  The location will be automatically geocoded to find its real-world coordinates. 
                  Media files and social media videos will be uploaded and associated with this travel spot.
                </AlertDescription>
              </Alert>
            )}

            {editingSpot && (selectedFiles.length > 0 || socialMediaUrl.trim()) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {selectedFiles.length > 0 && socialMediaUrl.trim() 
                    ? 'Selected media files will be uploaded and the social media video will be added to this travel spot\'s gallery.'
                    : selectedFiles.length > 0 
                    ? 'Selected media files will be uploaded and added to this travel spot\'s gallery.'
                    : 'The social media video will be added to this travel spot\'s gallery.'
                  }
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addTravelSpot.isPending || updateTravelSpot.isPending || isUploading || addMediaToTravelSpot.isPending || isAddingSocialMedia || addSocialMediaLinkToTravelSpot.isPending}
              >
                {isUploading || addMediaToTravelSpot.isPending || isAddingSocialMedia || addSocialMediaLinkToTravelSpot.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isUploading || addMediaToTravelSpot.isPending ? 'Uploading media...' : 'Adding social media...'}
                  </>
                ) : addTravelSpot.isPending || updateTravelSpot.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {addTravelSpot.isPending ? 'Finding location...' : 'Saving...'}
                  </>
                ) : editingSpot ? (
                  'Update Spot'
                ) : (
                  'Add Spot'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TravelSpotCardProps {
  spot: TravelSpot;
  hasValidCoordinates: boolean;
  mediaCount: number;
  socialMediaCount: number;
  onEdit: () => void;
  onDelete: () => void;
  formatDate: (timestamp: bigint) => string;
}

function TravelSpotCard({ 
  spot, 
  hasValidCoordinates, 
  mediaCount, 
  socialMediaCount, 
  onEdit, 
  onDelete, 
  formatDate 
}: TravelSpotCardProps) {
  const { data: mediaFiles = [] } = useGetTravelSpotMediaFiles(spot.city, spot.name);
  const { data: socialMediaLinks = [] } = useGetTravelSpotSocialMediaLinks(spot.city, spot.name);

  return (
    <div
      className={`flex flex-col gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
        !hasValidCoordinates ? 'border-orange-200 bg-orange-50/50' : ''
      }`}
    >
      {/* Main spot info */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg mt-1 ${
            hasValidCoordinates ? 'bg-primary/10' : 'bg-orange-100'
          }`}>
            {hasValidCoordinates ? (
              <MapPin className="h-4 w-4 text-primary" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-base">{spot.name}</h4>
              <Badge variant="outline" className="text-xs">
                {spot.spotType.toString()}
              </Badge>
              {!hasValidCoordinates && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                  No coordinates
                </Badge>
              )}
            </div>
            {/* Rating display */}
            {spot.rating > 0 && (
              <div className="flex items-center gap-2 mt-1 mb-2">
                <HeartRating rating={spot.rating} readonly size="sm" />
              </div>
            )}
            {spot.description && (
              <div className="flex items-start gap-2 mt-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{spot.description}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Added {formatDate(spot.createdAt)}
              {hasValidCoordinates && (
                <span className="ml-2 text-green-600">
                  • Coordinates: {spot.coordinates[0].toFixed(4)}, {spot.coordinates[1].toFixed(4)}
                </span>
              )}
            </p>
            {/* Media and social media count display */}
            <div className="flex items-center gap-4 mt-1">
              {mediaCount > 0 ? (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Image className="h-3 w-3" />
                  <span>{mediaCount} media file{mediaCount > 1 ? 's' : ''}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No media files yet
                </div>
              )}
              {socialMediaCount > 0 ? (
                <div className="flex items-center gap-1 text-xs text-purple-600">
                  <Link className="h-3 w-3" />
                  <span>{socialMediaCount} social video{socialMediaCount > 1 ? 's' : ''}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No social media videos yet
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            type="button"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
            type="button"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Media Preview Section */}
      {(mediaFiles.length > 0 || socialMediaLinks.length > 0) && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Media Preview</span>
            <Badge variant="outline" className="text-xs">
              {mediaFiles.length + socialMediaLinks.length} items
            </Badge>
          </div>
          
          <div className="space-y-3">
            {/* Media Files Preview */}
            {mediaFiles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Image className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Photos & Videos ({mediaFiles.length})</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {mediaFiles.slice(0, 4).map((mediaFile, index) => (
                    <MediaFilePreview key={index} mediaFile={mediaFile} />
                  ))}
                  {mediaFiles.length > 4 && (
                    <div className="aspect-square bg-muted/50 rounded border flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">+{mediaFiles.length - 4}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Social Media Links Preview */}
            {socialMediaLinks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link className="h-3 w-3 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Social Media ({socialMediaLinks.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {socialMediaLinks.slice(0, 2).map((link, index) => (
                    <SocialMediaLinkPreview key={index} socialMediaLink={link} />
                  ))}
                  {socialMediaLinks.length > 2 && (
                    <div className="p-2 bg-muted/50 rounded border flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">+{socialMediaLinks.length - 2} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface MediaFilePreviewProps {
  mediaFile: MediaFile;
}

function MediaFilePreview({ mediaFile }: MediaFilePreviewProps) {
  const { data: fileUrl, isLoading, error } = useFileUrl(mediaFile.path);

  if (isLoading) {
    return (
      <div className="aspect-square bg-muted/50 rounded border flex items-center justify-center">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !fileUrl) {
    return (
      <div className="aspect-square bg-red-50 rounded border border-red-200 flex items-center justify-center">
        <AlertTriangle className="h-3 w-3 text-red-500" />
      </div>
    );
  }

  return (
    <div className="aspect-square relative group">
      {mediaFile.mediaType === MediaType.video ? (
        <video
          src={fileUrl}
          className="w-full h-full object-cover rounded border"
          preload="metadata"
        />
      ) : (
        <img
          src={fileUrl}
          alt="Travel spot media"
          className="w-full h-full object-cover rounded border"
          loading="lazy"
        />
      )}
      
      {/* Media type indicator */}
      <div className="absolute top-1 left-1">
        <Badge variant="secondary" className="text-xs px-1 py-0">
          {mediaFile.mediaType === MediaType.video ? (
            <Video className="h-2 w-2" />
          ) : (
            <Image className="h-2 w-2" />
          )}
        </Badge>
      </div>
    </div>
  );
}

interface SocialMediaLinkPreviewProps {
  socialMediaLink: SocialMediaLink;
}

function SocialMediaLinkPreview({ socialMediaLink }: SocialMediaLinkPreviewProps) {
  const getSocialMediaIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-500" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-500" />;
      default:
        return <Link className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return 'YouTube';
      case 'instagram':
        return 'Instagram';
      default:
        return 'Social Media';
    }
  };

  return (
    <div className="p-2 bg-muted/50 rounded border hover:bg-muted transition-colors">
      <div className="flex items-center gap-2 mb-1">
        {getSocialMediaIcon(socialMediaLink.platform)}
        <span className="text-xs font-medium truncate">
          {getPlatformName(socialMediaLink.platform)}
        </span>
      </div>
      <a
        href={socialMediaLink.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
      >
        View Video
        <ExternalLink className="h-2 w-2" />
      </a>
    </div>
  );
}
