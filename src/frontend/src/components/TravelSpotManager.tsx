import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, FileText, Info, Search, Loader2, AlertTriangle, Upload, Image, Video, X, Link, Youtube, Instagram, ExternalLink, CheckCircle, Camera, AlertCircle } from 'lucide-react';
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

// Geocode a travel spot within a city context
async function geocodeTravelSpot(spotName: string, cityName: string): Promise<[number, number] | null> {
  try {
    // Try searching for the specific spot within the city
    const fullQuery = `${spotName}, ${cityName}`;
    const encodedQuery = encodeURIComponent(fullQuery);
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
      const lng = parseFloat(result.lon);

      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }

    return null;
  } catch (error) {
    console.error('Travel spot geocoding error:', error);
    return null;
  }
}

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
      const socialMediaLink: SocialMediaLink = {
        url: socialMediaUrl.trim(),
        platform: validation.platform || 'unknown',
        addedAt: BigInt(Date.now() * 1000000)
      };

      await addSocialMediaLinkToTravelSpot.mutateAsync({
        city: formData.city.trim(),
        spotName: formData.name.trim(),
        socialMediaLink
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
        // Geocode the travel spot to get coordinates
        const coordinates = await geocodeTravelSpot(formData.name.trim(), formData.city.trim());
        
        if (!coordinates) {
          toast.error('Could not find coordinates for this travel spot. Please check the name and city.');
          return;
        }

        await addTravelSpot.mutateAsync({
          city: formData.city.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          coordinates,
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
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Travel Spots in {selectedCity}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : validTravelSpots.length === 0 && invalidTravelSpots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No travel spots yet for {selectedCity}</p>
                <p className="text-sm">Click "Add Spot" to create your first travel spot</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Warning for invalid coordinates */}
                {invalidTravelSpots.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {invalidTravelSpots.length} travel spot(s) have invalid coordinates (0, 0) and won't appear on the map.
                      Please edit them to update their location.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Valid Travel Spots */}
                <div className="space-y-3">
                  {validTravelSpots.map((spot) => (
                    <TravelSpotCard
                      key={`${spot.city}-${spot.name}`}
                      spot={spot}
                      onEdit={() => handleEdit(spot)}
                      onDelete={() => handleDelete(spot.city, spot.name)}
                      formatDate={formatDate}
                    />
                  ))}
                </div>

                {/* Invalid Travel Spots */}
                {invalidTravelSpots.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-medium text-orange-600">
                      Spots with Invalid Coordinates
                    </Label>
                    {invalidTravelSpots.map((spot) => (
                      <TravelSpotCard
                        key={`${spot.city}-${spot.name}`}
                        spot={spot}
                        onEdit={() => handleEdit(spot)}
                        onDelete={() => handleDelete(spot.city, spot.name)}
                        formatDate={formatDate}
                        isInvalid
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Travel Spot Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[3100]">
          <DialogHeader>
            <DialogTitle>
              {editingSpot ? 'Edit Travel Spot' : 'Add Travel Spot'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., Paris, Tokyo, New York"
                  required
                  disabled={!!editingSpot}
                />
              </div>

              <div>
                <Label htmlFor="name">Travel Spot Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Eiffel Tower, Shibuya Crossing"
                  required
                  disabled={!!editingSpot}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of the travel spot"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="spotType">Travel Spot Type *</Label>
                <select
                  id="spotType"
                  value={formData.spotType}
                  onChange={(e) => setFormData({ ...formData, spotType: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  {/* Options will be populated by useEffect */}
                </select>
              </div>

              <div>
                <Label>Rating</Label>
                <HeartRating
                  rating={formData.rating}
                  onRatingChange={(rating) => setFormData({ ...formData, rating })}
                  size="lg"
                />
              </div>
            </div>

            <Separator />

            {/* Media Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label>Upload Media (Optional)</Label>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <div className="text-center">
                    <Label
                      htmlFor="spot-file-upload"
                      className="cursor-pointer text-primary hover:underline text-sm"
                    >
                      Choose files
                    </Label>
                    <Input
                      id="spot-file-upload"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG, WebP, AVIF, MP4, MOV
                  </p>
                </div>
              </div>

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Selected Files ({selectedFiles.length})</Label>
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 border rounded-lg"
                    >
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview Uploaded Media */}
              {previewMediaFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Uploaded Media ({previewMediaFiles.length})
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {previewMediaFiles.map((media, index) => (
                      <MediaPreviewCard key={index} media={media} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Social Media Links Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label>Add Social Media Video Link (Optional)</Label>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Add YouTube or Instagram video links. Videos will be embedded in the travel spot gallery.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Input
                  type="url"
                  placeholder="Paste YouTube or Instagram video URL..."
                  value={socialMediaUrl}
                  onChange={(e) => handleSocialMediaUrlChange(e.target.value)}
                  disabled={isAddingSocialMedia}
                />
                {urlValidation && (
                  <div className="mt-2">
                    {urlValidation.isValid ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>
                          Valid {urlValidation.platform === 'youtube' ? 'YouTube' : 'Instagram'} video URL
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{urlValidation.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Social Media Links */}
              {previewSocialMediaLinks.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Added Social Media Links ({previewSocialMediaLinks.length})
                  </Label>
                  {previewSocialMediaLinks.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 border rounded-lg"
                    >
                      {getSocialMediaIcon(link.platform)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.url}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addTravelSpot.isPending || updateTravelSpot.isPending || isUploading}
              >
                {(addTravelSpot.isPending || updateTravelSpot.isPending || isUploading) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isUploading ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  editingSpot ? 'Update Spot' : 'Add Spot'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Travel Spot Card Component
interface TravelSpotCardProps {
  spot: TravelSpot;
  onEdit: () => void;
  onDelete: () => void;
  formatDate: (timestamp: bigint) => string;
  isInvalid?: boolean;
}

function TravelSpotCard({ spot, onEdit, onDelete, formatDate, isInvalid }: TravelSpotCardProps) {
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const { data: mediaFiles = [] } = useGetTravelSpotMediaFiles(spot.city, spot.name);
  const { data: socialMediaLinks = [] } = useGetTravelSpotSocialMediaLinks(spot.city, spot.name);

  const totalMediaCount = mediaFiles.length + socialMediaLinks.length;

  return (
    <>
      <Card className={isInvalid ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : ''}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{spot.name}</h4>
                <Badge variant="outline" className="text-xs">
                  {spot.spotType}
                </Badge>
                {isInvalid && (
                  <Badge variant="destructive" className="text-xs">
                    Invalid Coords
                  </Badge>
                )}
              </div>
              {spot.description && (
                <p className="text-sm text-muted-foreground mb-2">{spot.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {spot.coordinates[0].toFixed(4)}, {spot.coordinates[1].toFixed(4)}
                </span>
                <HeartRating rating={spot.rating} readonly size="sm" />
                {totalMediaCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMediaGallery(true)}
                    className="h-6 px-2"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    {totalMediaCount} media
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Gallery Dialog */}
      {showMediaGallery && (
        <Dialog open={showMediaGallery} onOpenChange={setShowMediaGallery}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[3200]">
            <DialogHeader>
              <DialogTitle>{spot.name} - Media Gallery</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Media Files */}
              {mediaFiles.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Photos & Videos ({mediaFiles.length})
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {mediaFiles.map((media, index) => (
                      <MediaPreviewCard key={index} media={media} />
                    ))}
                  </div>
                </div>
              )}

              {/* Social Media Links */}
              {socialMediaLinks.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Social Media Videos ({socialMediaLinks.length})
                  </Label>
                  <div className="space-y-2">
                    {socialMediaLinks.map((link, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        {link.platform === 'youtube' ? (
                          <Youtube className="h-4 w-4 text-red-500" />
                        ) : (
                          <Instagram className="h-4 w-4 text-pink-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{link.url}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(link.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Media Preview Card Component
interface MediaPreviewCardProps {
  media: MediaFile;
}

function MediaPreviewCard({ media }: MediaPreviewCardProps) {
  const { data: fileUrl } = useFileUrl(media.path);

  return (
    <div className="relative border rounded-lg overflow-hidden">
      <div className="aspect-square bg-muted flex items-center justify-center">
        {fileUrl ? (
          media.mediaType === MediaType.image ? (
            <img
              src={fileUrl}
              alt="Media"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={fileUrl}
              className="w-full h-full object-cover"
              controls
            />
          )
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="p-2">
        <Badge variant="secondary" className="text-xs">
          {media.mediaType === MediaType.image ? <Image className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
          {media.format.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}
