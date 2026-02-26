import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Search, Loader2, Upload, Image, Video, X, Link, Youtube, Instagram, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  useGetTravelSpots,
  useGetAllTravelSpots,
  useAddTravelSpot,
  useUpdateTravelSpot,
  useDeleteTravelSpot,
  useAddMediaToTravelSpot,
  useAddSocialMediaLinkToTravelSpot,
  useGetTravelSpotMediaFiles,
  useGetTravelSpotSocialMediaLinks,
  validateSocialMediaUrl,
} from '@/hooks/useQueries';
import { useFileUpload } from '@/blob-storage/FileStorage';
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
  'City', 'Hotel', 'Restaurant', 'Shopping', 'Heritage',
  'Relax', 'Beach', 'Transport', 'Airport', 'Others',
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
    rating: 0,
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

          TRAVEL_SPOT_TYPES.forEach(type => {
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
      const isImage =
        file.type.startsWith('image/') &&
        ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type);
      const isVideo =
        file.type.startsWith('video/') &&
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

        const uploadResult = await uploadFile(filePath, file, progress => {
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
    } finally {
      setIsUploading(false);
    }

    return uploadedMediaFiles;
  };

  const handleAddSocialMediaLink = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const newLink: SocialMediaLink = {
        url: socialMediaUrl.trim(),
        platform: validation.platform,
        addedAt: BigInt(Date.now() * 1000000),
      };
      setPreviewSocialMediaLinks(prev => [...prev, newLink]);
      setSocialMediaUrl('');
      setUrlValidation(null);
      toast.success('Social media link added to preview');
      return;
    }

    setIsAddingSocialMedia(true);
    try {
      const socialMediaLink: SocialMediaLink = {
        url: socialMediaUrl.trim(),
        platform: validation.platform,
        addedAt: BigInt(Date.now() * 1000000),
      };
      await addSocialMediaLinkToTravelSpot.mutateAsync({
        city: editingSpot.city,
        spotName: editingSpot.name,
        socialMediaLink,
      });
      toast.success('Social media link added successfully');
      setSocialMediaUrl('');
      setUrlValidation(null);
      refetchTravelSpots();
    } catch (error) {
      toast.error('Failed to add social media link');
    } finally {
      setIsAddingSocialMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.city.trim() || !formData.name.trim() || !formData.spotType) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingSpot) {
        await updateTravelSpot.mutateAsync({
          city: formData.city.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          coordinates: editingSpot.coordinates,
          spotType: formData.spotType,
          rating: formData.rating,
        });
        toast.success('Travel spot updated successfully!');
      } else {
        let coordinates: [number, number] = [0, 0];
        try {
          const query = encodeURIComponent(`${formData.name.trim()}, ${formData.city.trim()}`);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
            { headers: { 'User-Agent': 'LocationMapExplorer/1.0' } }
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              coordinates = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            }
          }
        } catch {
          // use default coordinates
        }

        await addTravelSpot.mutateAsync({
          city: formData.city.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          coordinates,
          spotType: formData.spotType,
          rating: formData.rating,
        });

        if (selectedFiles.length > 0) {
          await uploadTravelSpotMedia(formData.name.trim(), formData.city.trim());
        }

        for (const link of previewSocialMediaLinks) {
          await addSocialMediaLinkToTravelSpot.mutateAsync({
            city: formData.city.trim(),
            spotName: formData.name.trim(),
            socialMediaLink: link,
          });
        }

        toast.success('Travel spot added successfully!');
      }

      setIsDialogOpen(false);
      setEditingSpot(null);
      setFormData({ city: '', name: '', description: '', spotType: '', rating: 0 });
      setSelectedFiles([]);
      setPreviewMediaFiles([]);
      setPreviewSocialMediaLinks([]);
      refetchTravelSpots();
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
      rating: spot.rating,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (spot: TravelSpot) => {
    if (!confirm(`Are you sure you want to delete "${spot.name}"?`)) return;

    try {
      await deleteTravelSpot.mutateAsync({ city: spot.city, name: spot.name });
      toast.success('Travel spot deleted successfully!');
      refetchTravelSpots();
    } catch (error) {
      toast.error('Failed to delete travel spot');
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSpot(null);
    setFormData({ city: '', name: '', description: '', spotType: '', rating: 0 });
    setSelectedFiles([]);
    setPreviewMediaFiles([]);
    setPreviewSocialMediaLinks([]);
    setSocialMediaUrl('');
    setUrlValidation(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Travel Spots</h3>
          <p className="text-sm text-muted-foreground">
            Manage travel spots, hotels, restaurants, and other points of interest
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={open => { if (!open) handleDialogClose(); else setIsDialogOpen(true); }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingSpot(null);
                setFormData({ city: selectedCity, name: '', description: '', spotType: '', rating: 0 });
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Travel Spot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSpot ? 'Edit Travel Spot' : 'Add Travel Spot'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="e.g., Tokyo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Shibuya Crossing"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="spotType">Type *</Label>
                <select
                  id="spotType"
                  className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.spotType}
                  onChange={e => setFormData(prev => ({ ...prev, spotType: e.target.value }))}
                  required
                >
                  <option value="" disabled>Select travel spot type</option>
                  {TRAVEL_SPOT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Rating</Label>
                <HeartRating
                  rating={formData.rating}
                  onRatingChange={rating => setFormData(prev => ({ ...prev, rating }))}
                />
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <Label>Media Files</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="spotFileUpload"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,video/mp4,video/quicktime,video/mov"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="spotFileUpload" className="cursor-pointer">
                    <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Click to select media files</p>
                  </label>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {file.type.startsWith('video/') ? (
                          <Video className="h-3 w-3 text-blue-500" />
                        ) : (
                          <Image className="h-3 w-3 text-green-500" />
                        )}
                        <span className="flex-1 truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Social Media Links */}
              <div className="space-y-2">
                <Label>Social Media Links</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="YouTube or Instagram URL..."
                    value={socialMediaUrl}
                    onChange={e => handleSocialMediaUrlChange(e.target.value)}
                    className={
                      urlValidation
                        ? urlValidation.isValid
                          ? 'border-green-500'
                          : 'border-red-500'
                        : ''
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSocialMediaLink}
                    disabled={!urlValidation?.isValid || isAddingSocialMedia}
                  >
                    {isAddingSocialMedia ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {urlValidation && !urlValidation.isValid && (
                  <p className="text-xs text-red-500">{urlValidation.error}</p>
                )}
                {previewSocialMediaLinks.length > 0 && (
                  <div className="space-y-1">
                    {previewSocialMediaLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {link.platform === 'youtube' ? (
                          <Youtube className="h-3 w-3 text-red-500" />
                        ) : (
                          <Instagram className="h-3 w-3 text-pink-500" />
                        )}
                        <span className="flex-1 truncate">{link.url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() =>
                            setPreviewSocialMediaLinks(prev => prev.filter((_, i) => i !== index))
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleDialogClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={addTravelSpot.isPending || updateTravelSpot.isPending || isUploading}
                >
                  {addTravelSpot.isPending || updateTravelSpot.isPending || isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingSpot ? 'Updating...' : 'Adding...'}
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

      {/* City Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filter by City
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingCities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCity === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSelectedCity(''); setCitySearchInput(''); }}
              >
                All Cities
              </Button>
              {existingCities.map(city => (
                <Button
                  key={city}
                  variant={selectedCity === city ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCitySelect(city)}
                >
                  {city}
                </Button>
              ))}
            </div>
          )}
          <form onSubmit={handleCitySearchSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search by city..."
              value={citySearchInput}
              onChange={e => setCitySearchInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Travel Spots List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : travelSpots.length === 0 && selectedCity ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No travel spots found for {selectedCity}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {travelSpots.map((spot, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{spot.name}</h4>
                      <Badge variant="outline" className="text-xs">{spot.spotType}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{spot.city}</p>
                    {spot.description && (
                      <p className="text-sm mt-1 line-clamp-2">{spot.description}</p>
                    )}
                    <div className="mt-2">
                      <HeartRating rating={spot.rating} readonly />
                    </div>
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
  );
}
