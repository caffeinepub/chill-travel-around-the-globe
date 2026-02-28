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
            if (formData.spotType === type) {
              option.selected = true;
            }
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
    if (citySearchInput.trim()) {
      setSelectedCity(citySearchInput.trim());
    }
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

        const mediaFile: MediaFile = {
          path: uploadResult.path,
          mediaType,
          format: fileExtension,
          uploadedAt: BigInt(Date.now() * 1000000)
        };

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
      return;
    }

    const validation = validateSocialMediaUrl(socialMediaUrl.trim());
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid social media URL');
      return;
    }

    if (!editingSpot) {
      // Store for preview when creating new spot
      const newLink: SocialMediaLink = {
        url: socialMediaUrl.trim(),
        platform: validation.platform,
        addedAt: BigInt(Date.now() * 1000000)
      };
      setPreviewSocialMediaLinks(prev => [...prev, newLink]);
      setSocialMediaUrl('');
      setUrlValidation(null);
      toast.success('Social media link added to preview');
      return;
    }

    setIsAddingSocialMedia(true);
    try {
      await addSocialMediaLinkToTravelSpot.mutateAsync({
        city: editingSpot.city,
        spotName: editingSpot.name,
        url: socialMediaUrl.trim()
      });

      toast.success(`${validation.platform === 'youtube' ? 'YouTube' : 'Instagram'} link added successfully`);
      setSocialMediaUrl('');
      setUrlValidation(null);
      refetchTravelSpots();
    } catch (error) {
      console.error('Error adding social media link:', error);
      toast.error('Failed to add social media link');
    } finally {
      setIsAddingSocialMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cityToUse = editingSpot ? editingSpot.city : (formData.city.trim() || selectedCity.trim());

    if (!cityToUse) {
      toast.error('Please select or enter a city');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a spot name');
      return;
    }

    if (!formData.spotType) {
      toast.error('Please select a spot type');
      return;
    }

    try {
      if (editingSpot) {
        const success = await updateTravelSpot.mutateAsync({
          city: editingSpot.city,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          coordinates: editingSpot.coordinates,
          spotType: formData.spotType,
          rating: formData.rating
        });

        if (success) {
          toast.success('Travel spot updated successfully!');

          if (selectedFiles.length > 0) {
            await uploadTravelSpotMedia(formData.name.trim(), editingSpot.city);
          }

          setIsDialogOpen(false);
          setEditingSpot(null);
          resetForm();
          refetchTravelSpots();
        } else {
          toast.error('Failed to update travel spot');
        }
      } else {
        // Geocode the spot location
        let coordinates: [number, number] = [0, 0];
        try {
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.name + ', ' + cityToUse)}&limit=1`,
            { headers: { 'User-Agent': 'LocationMapExplorer/1.0' } }
          );
          const geocodeData = await geocodeResponse.json();
          if (geocodeData && geocodeData.length > 0) {
            coordinates = [parseFloat(geocodeData[0].lat), parseFloat(geocodeData[0].lon)];
          }
        } catch {
          // Use default coordinates if geocoding fails
        }

        await addTravelSpot.mutateAsync({
          city: cityToUse,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          coordinates,
          spotType: formData.spotType,
          rating: formData.rating
        });

        toast.success('Travel spot added successfully!');

        if (selectedFiles.length > 0) {
          await uploadTravelSpotMedia(formData.name.trim(), cityToUse);
        }

        // Add any pending social media links
        for (const link of previewSocialMediaLinks) {
          await addSocialMediaLinkToTravelSpot.mutateAsync({
            city: cityToUse,
            spotName: formData.name.trim(),
            url: link.url
          });
        }

        setIsDialogOpen(false);
        resetForm();
        refetchTravelSpots();
      }
    } catch (error) {
      console.error('Error saving travel spot:', error);
      toast.error('Failed to save travel spot');
    }
  };

  const handleEdit = (spot: TravelSpot) => {
    setEditingSpot(spot);
    setFormData({
      city: spot.city,
      name: spot.name,
      description: spot.description || '',
      spotType: spot.spotType,
      rating: spot.rating
    });
    setPreviewMediaFiles([]);
    setPreviewSocialMediaLinks([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (spot: TravelSpot) => {
    if (!confirm(`Are you sure you want to delete "${spot.name}"?`)) return;

    try {
      const success = await deleteTravelSpot.mutateAsync({
        city: spot.city,
        name: spot.name
      });

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
    setPreviewMediaFiles([]);
    setPreviewSocialMediaLinks([]);
    setEditingSpot(null);
  };

  const getSocialMediaIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube': return <Youtube className="h-4 w-4 text-red-500" />;
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-500" />;
      default: return <Link className="h-4 w-4 text-blue-500" />;
    }
  };

  // Sub-component to display media file with URL
  const MediaFileDisplay = ({ mediaFile }: { mediaFile: MediaFile }) => {
    const { data: fileUrl } = useFileUrl(mediaFile.path);

    if (!fileUrl) return null;

    return (
      <div className="relative group">
        {mediaFile.mediaType === MediaType.image ? (
          <img src={fileUrl} alt="Media" className="w-full h-24 object-cover rounded-md" />
        ) : (
          <video src={fileUrl} className="w-full h-24 object-cover rounded-md" controls={false} />
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
          <Badge variant="secondary" className="text-xs">
            {mediaFile.mediaType === MediaType.image ? 'Image' : 'Video'}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Travel Spots</h3>
          <p className="text-sm text-muted-foreground">
            Manage travel spots for each city
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Spot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSpot ? 'Edit Travel Spot' : 'Add Travel Spot'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* City */}
              {!editingSpot && (
                <div className="space-y-2">
                  <Label htmlFor="spotCity">City *</Label>
                  <Input
                    id="spotCity"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder={selectedCity || 'Enter city name'}
                  />
                  {selectedCity && !formData.city && (
                    <p className="text-xs text-muted-foreground">Will use selected city: {selectedCity}</p>
                  )}
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="spotName">Spot Name *</Label>
                <Input
                  id="spotName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Eiffel Tower"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="spotDescription">Description</Label>
                <Textarea
                  id="spotDescription"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this travel spot..."
                  rows={3}
                />
              </div>

              {/* Spot Type */}
              <div className="space-y-2">
                <Label htmlFor="spotType">Spot Type *</Label>
                <select
                  id="spotType"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={formData.spotType}
                  onChange={(e) => setFormData(prev => ({ ...prev, spotType: e.target.value }))}
                >
                  <option value="" disabled>Select travel spot type</option>
                  {TRAVEL_SPOT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <Label>Rating</Label>
                <HeartRating
                  rating={formData.rating}
                  onRatingChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
                />
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <Label>Media Files</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload images or videos</p>
                  </div>
                  <Label htmlFor="spotMedia" className="cursor-pointer flex justify-center">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="spotMedia"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Selected files preview */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{selectedFiles.length} file(s) selected:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="w-full h-20 bg-muted rounded-md flex items-center justify-center">
                            {file.type.startsWith('image/') ? (
                              <Image className="h-8 w-8 text-muted-foreground" />
                            ) : (
                              <Video className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1">{file.name}</p>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing media for editing */}
                {editingSpot && editingSpot.mediaFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Existing media:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {editingSpot.mediaFiles.map((mediaFile, index) => (
                        <MediaFileDisplay key={index} mediaFile={mediaFile} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Social Media Links */}
              <div className="space-y-2">
                <Label>Social Media Links</Label>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Add YouTube video URLs (youtube.com/watch?v=... or youtu.be/...) or Instagram post/reel URLs.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Input
                    value={socialMediaUrl}
                    onChange={(e) => handleSocialMediaUrlChange(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or https://instagram.com/p/..."
                    className={urlValidation ? (urlValidation.isValid ? 'border-green-500' : 'border-red-500') : ''}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSocialMediaLink}
                    disabled={isAddingSocialMedia || !socialMediaUrl.trim()}
                  >
                    {isAddingSocialMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
                {urlValidation && (
                  <div className={`flex items-center gap-1 text-xs ${urlValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {urlValidation.isValid ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {urlValidation.isValid ? `Valid ${urlValidation.platform} URL` : urlValidation.error}
                  </div>
                )}

                {/* Preview social media links (for new spots) */}
                {previewSocialMediaLinks.length > 0 && (
                  <div className="space-y-1">
                    {previewSocialMediaLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                        {getSocialMediaIcon(link.platform)}
                        <span className="flex-1 truncate">{link.url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPreviewSocialMediaLinks(prev => prev.filter((_, i) => i !== index))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing social media links for editing */}
                {editingSpot && editingSpot.socialMediaLinks.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Existing links:</p>
                    {editingSpot.socialMediaLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                        {getSocialMediaIcon(link.platform)}
                        <span className="flex-1 truncate">{link.url}</span>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addTravelSpot.isPending || updateTravelSpot.isPending || isUploading}>
                  {(addTravelSpot.isPending || updateTravelSpot.isPending || isUploading) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editingSpot ? 'Update Spot' : 'Add Spot'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* City Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Select City
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {existingCities.length > 0 && (
            <div>
              <Label className="text-sm">Existing Cities</Label>
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
                      {allTravelSpots.filter(s => s.city === city).length}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}

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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Travel Spots in {selectedCity}</h4>
            <Badge variant="secondary">{travelSpots.length} spots</Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : travelSpots.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No travel spots found for {selectedCity}. Add your first spot using the button above.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {travelSpots.map((spot, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-medium">{spot.name}</h5>
                          <Badge variant="outline" className="text-xs">{spot.spotType}</Badge>
                          {spot.rating > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              ♥ {spot.rating.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                        {spot.description && (
                          <p className="text-sm text-muted-foreground">{spot.description}</p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{spot.coordinates[0].toFixed(4)}, {spot.coordinates[1].toFixed(4)}</span>
                        </div>
                        {(spot.mediaFiles.length > 0 || spot.socialMediaLinks.length > 0) && (
                          <div className="flex gap-2 mt-1">
                            {spot.mediaFiles.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Image className="h-3 w-3 mr-1" />
                                {spot.mediaFiles.length} media
                              </Badge>
                            )}
                            {spot.socialMediaLinks.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Link className="h-3 w-3 mr-1" />
                                {spot.socialMediaLinks.length} links
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(spot)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(spot)}
                          disabled={deleteTravelSpot.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
