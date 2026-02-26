import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Edit, MapPin, Upload, Link, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  useGetTravelSpots,
  useGetAllTravelSpots,
  useAddTravelSpot,
  useUpdateTravelSpot,
  useDeleteTravelSpot,
  useAddMediaToTravelSpot,
  useAddSocialMediaLinkToTravelSpot,
  validateSocialMediaUrl,
} from '@/hooks/useQueries';
import { useFileUpload, useFileUrl, useFileDelete } from '@/blob-storage/FileStorage';
import { MediaType, TravelSpot } from '@/backend';

interface TravelSpotFormData {
  city: string;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  spotType: string;
  rating: string;
}

interface MediaFileDisplayProps {
  path: string;
}

function MediaFileDisplay({ path }: MediaFileDisplayProps) {
  const { data: url } = useFileUrl(path);
  if (!url) return <div className="w-16 h-16 bg-muted rounded animate-pulse" />;
  const isVideo = path.match(/\.(mp4|webm|ogg|mov)$/i);
  return isVideo ? (
    <video src={url} className="w-16 h-16 object-cover rounded" controls />
  ) : (
    <img src={url} alt={path} className="w-16 h-16 object-cover rounded" />
  );
}

export default function TravelSpotManager() {
  const [selectedCity, setSelectedCity] = useState('');
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [editingSpot, setEditingSpot] = useState<TravelSpot | null>(null);
  const [socialMediaUrl, setSocialMediaUrl] = useState('');
  const [selectedSpotForMedia, setSelectedSpotForMedia] = useState<TravelSpot | null>(null);
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; platform: string; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spotTypeSelectRef = useRef<HTMLSelectElement>(null);

  const [formData, setFormData] = useState<TravelSpotFormData>({
    city: '',
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    spotType: 'City',
    rating: '0',
  });

  const { data: citySpots = [] } = useGetTravelSpots(selectedCity);
  const { data: allSpots = [] } = useGetAllTravelSpots();
  const addSpot = useAddTravelSpot();
  const updateSpot = useUpdateTravelSpot();
  const deleteSpot = useDeleteTravelSpot();
  const addMedia = useAddMediaToTravelSpot();
  const addSocialLink = useAddSocialMediaLinkToTravelSpot();
  const { uploadFile, isUploading } = useFileUpload();

  // Get unique cities from all spots
  const cities = [...new Set(allSpots.map(s => s.city))].sort();

  // Populate the native select with spot types using useEffect
  useEffect(() => {
    const spotTypes = ['City', 'Hotel', 'Restaurant', 'Shopping', 'Heritage', 'Relax', 'Beach', 'Transport', 'Airport', 'Others'];
    if (spotTypeSelectRef.current) {
      spotTypeSelectRef.current.innerHTML = '';
      spotTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        spotTypeSelectRef.current!.appendChild(option);
      });
      spotTypeSelectRef.current.value = formData.spotType;
    }
  }, [isAddingSpot, editingSpot]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.city || !formData.name || !formData.latitude || !formData.longitude) {
      toast.error('Please fill in all required fields');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates');
      return;
    }

    try {
      if (editingSpot) {
        await updateSpot.mutateAsync({
          city: formData.city,
          name: formData.name,
          description: formData.description || null,
          coordinates: [lat, lng],
          spotType: formData.spotType,
          rating: parseFloat(formData.rating) || 0,
        });
        toast.success('Travel spot updated successfully');
        setEditingSpot(null);
      } else {
        await addSpot.mutateAsync({
          city: formData.city,
          name: formData.name,
          description: formData.description || null,
          coordinates: [lat, lng],
          spotType: formData.spotType,
          rating: parseFloat(formData.rating) || 0,
        });
        toast.success('Travel spot added successfully');
        setIsAddingSpot(false);
      }
      setFormData({ city: '', name: '', description: '', latitude: '', longitude: '', spotType: 'City', rating: '0' });
    } catch (error) {
      console.error('Error saving travel spot:', error);
      toast.error('Failed to save travel spot');
    }
  };

  const handleDeleteSpot = async (city: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteSpot.mutateAsync({ city, name });
      toast.success('Travel spot deleted');
    } catch (error) {
      console.error('Error deleting spot:', error);
      toast.error('Failed to delete travel spot');
    }
  };

  const handleEditSpot = (spot: TravelSpot) => {
    setEditingSpot(spot);
    setFormData({
      city: spot.city,
      name: spot.name,
      description: spot.description || '',
      latitude: spot.coordinates[0].toString(),
      longitude: spot.coordinates[1].toString(),
      spotType: spot.spotType,
      rating: spot.rating.toString(),
    });
    setIsAddingSpot(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedSpotForMedia) return;

    for (const file of Array.from(files)) {
      try {
        const filePath = `travel-spots/${selectedSpotForMedia.city}/${selectedSpotForMedia.name}/${Date.now()}-${file.name}`;
        await uploadFile(filePath, file);

        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');
        const mediaTypeEnum = isVideo ? MediaType.video : isAudio ? MediaType.audio : MediaType.image;

        await addMedia.mutateAsync({
          city: selectedSpotForMedia.city,
          spotName: selectedSpotForMedia.name,
          mediaFile: {
            path: filePath,
            mediaType: mediaTypeEnum,
            format: file.type,
            uploadedAt: BigInt(Date.now() * 1000000),
          },
        });
        toast.success(`${file.name} uploaded`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlChange = (url: string) => {
    setSocialMediaUrl(url);
    if (url.trim()) {
      setUrlValidation(validateSocialMediaUrl(url.trim()));
    } else {
      setUrlValidation(null);
    }
  };

  const handleAddSocialLink = async () => {
    if (!selectedSpotForMedia || !socialMediaUrl.trim()) return;
    const validation = validateSocialMediaUrl(socialMediaUrl.trim());
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid URL');
      return;
    }
    try {
      await addSocialLink.mutateAsync({
        city: selectedSpotForMedia.city,
        spotName: selectedSpotForMedia.name,
        socialMediaLink: {
          url: socialMediaUrl.trim(),
          platform: validation.platform,
          addedAt: BigInt(Date.now() * 1000000),
        },
      });
      setSocialMediaUrl('');
      setUrlValidation(null);
      toast.success('Social media link added');
    } catch (error) {
      console.error('Error adding social link:', error);
      toast.error('Failed to add social media link');
    }
  };

  const displaySpots = selectedCity ? citySpots : allSpots;

  return (
    <div className="space-y-4">
      {/* City filter */}
      <div className="flex gap-2 items-center">
        <Label className="text-xs shrink-0">Filter by city:</Label>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="flex-1 h-8 text-xs border border-input rounded-md px-2 bg-background"
        >
          <option value="">All cities</option>
          {cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit form toggle */}
      <Button
        size="sm"
        variant={isAddingSpot ? 'secondary' : 'default'}
        className="w-full h-8 text-xs"
        onClick={() => {
          if (isAddingSpot) {
            setIsAddingSpot(false);
            setEditingSpot(null);
            setFormData({ city: '', name: '', description: '', latitude: '', longitude: '', spotType: 'City', rating: '0' });
          } else {
            setIsAddingSpot(true);
          }
        }}
      >
        <Plus className="w-3 h-3 mr-1" />
        {isAddingSpot ? 'Cancel' : 'Add Travel Spot'}
      </Button>

      {/* Form */}
      {isAddingSpot && (
        <form onSubmit={handleFormSubmit} className="space-y-2 border rounded-lg p-3">
          <h4 className="text-xs font-semibold">{editingSpot ? 'Edit' : 'New'} Travel Spot</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">City *</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData(f => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Paris"
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Eiffel Tower"
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Latitude *</Label>
              <Input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData(f => ({ ...f, latitude: e.target.value }))}
                placeholder="48.8584"
                className="h-8 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Longitude *</Label>
              <Input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData(f => ({ ...f, longitude: e.target.value }))}
                placeholder="2.2945"
                className="h-8 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <select
                ref={spotTypeSelectRef}
                value={formData.spotType}
                onChange={(e) => setFormData(f => ({ ...f, spotType: e.target.value }))}
                className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background"
              />
            </div>
            <div>
              <Label className="text-xs">Rating (0-10)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={formData.rating}
                onChange={(e) => setFormData(f => ({ ...f, rating: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-full h-8 text-xs"
            disabled={addSpot.isPending || updateSpot.isPending}
          >
            {editingSpot ? 'Update' : 'Add'} Spot
          </Button>
        </form>
      )}

      {/* Spots list */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{displaySpots.length} spot(s)</p>
        {displaySpots.map((spot, idx) => (
          <Card key={`${spot.city}-${spot.name}-${idx}`} className="overflow-hidden">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-medium text-sm">{spot.name}</span>
                    <Badge variant="outline" className="text-xs">{spot.spotType}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{spot.city}</span>
                    {spot.rating > 0 && <span>· ⭐ {spot.rating}</span>}
                  </div>
                  {spot.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{spot.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleEditSpot(spot)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteSpot(spot.city, spot.name)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Media preview */}
              {spot.mediaFiles && spot.mediaFiles.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {spot.mediaFiles.slice(0, 4).map((file, i) => (
                    <MediaFileDisplay key={i} path={file.path} />
                  ))}
                  {spot.mediaFiles.length > 4 && (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                      +{spot.mediaFiles.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Media upload section */}
              <div className="border-t pt-2 space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setSelectedSpotForMedia(spot);
                      fileInputRef.current?.click();
                    }}
                    disabled={isUploading}
                  >
                    <Upload className="w-3 h-3" />
                    {isUploading && selectedSpotForMedia?.name === spot.name ? 'Uploading...' : 'Upload Media'}
                  </Button>
                </div>

                {/* Social media link */}
                {selectedSpotForMedia?.name === spot.name && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <Input
                        value={socialMediaUrl}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="YouTube or Instagram URL"
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={handleAddSocialLink}
                        disabled={!urlValidation?.isValid || addSocialLink.isPending}
                      >
                        <Link className="w-3 h-3" />
                      </Button>
                    </div>
                    {urlValidation && (
                      <p className={`text-xs ${urlValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {urlValidation.isValid ? `✓ Valid ${urlValidation.platform} URL` : urlValidation.error}
                      </p>
                    )}
                  </div>
                )}

                {/* Social links preview */}
                {spot.socialMediaLinks && spot.socialMediaLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {spot.socialMediaLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {link.platform}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
