import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, X, Image, Video, Trash2, Plus, Search, Camera, AlertCircle, CheckCircle, Lock, LogIn, Link, Youtube, Instagram, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';
import { MediaFile, MediaType, CityAlbum, SocialMediaLink } from '@/backend';
import { useGetAllCityAlbums, useGetCityAlbum, useAddMediaToCityAlbum, useRemoveMediaFromCityAlbum, useAddSocialMediaLinkToCityAlbum, useRemoveSocialMediaLinkFromCityAlbum, validateSocialMediaUrl } from '@/hooks/useQueries';
import { useFileUpload, useFileUrl, useFileDelete } from '../blob-storage/FileStorage';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function CityAlbumManager() {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [citySearchInput, setCitySearchInput] = useState<string>('');
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [socialMediaUrl, setSocialMediaUrl] = useState<string>('');
  const [isAddingSocialMedia, setIsAddingSocialMedia] = useState<boolean>(false);
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; platform?: string; error?: string } | null>(null);

  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: allAlbums = [], refetch: refetchAllAlbums } = useGetAllCityAlbums();
  const { data: selectedAlbum, refetch: refetchSelectedAlbum } = useGetCityAlbum(selectedCity);
  const { uploadFile, isUploading } = useFileUpload();
  const { deleteFile } = useFileDelete();
  const addMediaToCityAlbum = useAddMediaToCityAlbum();
  const removeMediaFromCityAlbum = useRemoveMediaFromCityAlbum();
  const addSocialMediaLink = useAddSocialMediaLinkToCityAlbum();
  const removeSocialMediaLink = useRemoveSocialMediaLinkFromCityAlbum();

  // Get unique cities from existing albums
  const existingCities = Array.from(new Set(allAlbums.map(album => album.city))).sort();

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

  // Real-time URL validation
  const handleSocialMediaUrlChange = (value: string) => {
    setSocialMediaUrl(value);
    
    if (value.trim()) {
      const validation = validateSocialMediaUrl(value.trim());
      setUrlValidation(validation);
    } else {
      setUrlValidation(null);
    }
  };

  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file type - updated to support WebP, AVIF, and MOV
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/mov'];
    const allValidTypes = [...validImageTypes, ...validVideoTypes];

    if (!allValidTypes.includes(file.type.toLowerCase())) {
      return {
        isValid: false,
        error: `Invalid file type: ${file.name}. Only JPEG, PNG, WebP, AVIF, MP4, and MOV files are supported.`
      };
    }

    // Check file size (max 50MB for videos, 10MB for images)
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = file.type.startsWith('video/') ? 50 : 10;
      return {
        isValid: false,
        error: `File too large: ${file.name}. Maximum size is ${maxSizeMB}MB.`
      };
    }

    // Check for empty files
    if (file.size === 0) {
      return {
        isValid: false,
        error: `Empty file: ${file.name}. Please select a valid file.`
      };
    }

    return { isValid: true };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      toast.error('Please log in to upload files');
      return;
    }

    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    const newUploadingFiles: UploadingFile[] = [];
    
    for (const file of files) {
      const validation = validateFile(file);
      
      if (validation.isValid) {
        newUploadingFiles.push({
          file,
          progress: 0,
          status: 'pending'
        });
      } else {
        toast.error(validation.error);
      }
    }
    
    if (newUploadingFiles.length > 0) {
      setUploadingFiles(prev => [...prev, ...newUploadingFiles]);
    }
    
    // Reset input
    event.target.value = '';
  };

  const handleUploadFiles = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to upload files');
      return;
    }

    if (!selectedCity.trim()) {
      toast.error('Please select or enter a city name');
      return;
    }

    const pendingFiles = uploadingFiles.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      toast.error('No files ready for upload');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const uploadingFile of pendingFiles) {
      try {
        // Update status to uploading
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === uploadingFile.file 
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          )
        );

        const fileExtension = uploadingFile.file.name.split('.').pop()?.toLowerCase() || '';
        const mediaType: MediaType = uploadingFile.file.type.startsWith('video/') ? MediaType.video : MediaType.image;
        const sanitizedCity = selectedCity.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
        const fileName = `city-albums/${sanitizedCity}/${Date.now()}_${uploadingFile.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        // Upload file with progress tracking
        const uploadResult = await uploadFile(
          fileName,
          uploadingFile.file,
          (percentage: number) => {
            setUploadingFiles(prev => 
              prev.map(f => 
                f.file === uploadingFile.file 
                  ? { ...f, progress: percentage }
                  : f
              )
            );
          }
        );
        
        // Create media file object
        const mediaFile: MediaFile = {
          path: uploadResult.path,
          mediaType,
          format: fileExtension,
          uploadedAt: BigInt(Date.now() * 1000000) // Convert to nanoseconds
        };

        // Add to city album
        await addMediaToCityAlbum.mutateAsync({
          city: selectedCity.trim(),
          mediaFile
        });

        // Update status to success
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === uploadingFile.file 
              ? { ...f, status: 'success', progress: 100 }
              : f
          )
        );

        successCount++;
      } catch (error) {
        console.error('Error uploading file:', error);
        
        // Update status to error
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === uploadingFile.file 
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        );

        errorCount++;
      }
    }

    // Show summary toast
    if (successCount > 0 && errorCount === 0) {
      toast.success(`Successfully uploaded ${successCount} file(s) to ${selectedCity}`);
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`Uploaded ${successCount} file(s), ${errorCount} failed`);
    } else if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} file(s)`);
    }

    // Refetch data if any uploads succeeded
    if (successCount > 0) {
      refetchSelectedAlbum();
      refetchAllAlbums();
    }

    // Clear successful uploads after a delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.status !== 'success'));
    }, 3000);
  };

  const handleDeleteMedia = async (mediaPath: string) => {
    if (!selectedCity) return;

    if (!confirm('Are you sure you want to delete this media file?')) {
      return;
    }

    try {
      // Remove from city album
      await removeMediaFromCityAlbum.mutateAsync({
        city: selectedCity,
        mediaPath
      });

      // Delete file from storage
      await deleteFile(mediaPath);

      toast.success('Media file deleted successfully');
      refetchSelectedAlbum();
      refetchAllAlbums();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast.error('Failed to delete media file');
    }
  };

  const handleAddSocialMediaLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please log in to add social media links');
      return;
    }

    if (!selectedCity.trim()) {
      toast.error('Please select or enter a city name');
      return;
    }

    if (!socialMediaUrl.trim()) {
      toast.error('Please enter a social media URL');
      return;
    }

    // Validate URL
    const validation = validateSocialMediaUrl(socialMediaUrl.trim());
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid social media URL');
      return;
    }

    setIsAddingSocialMedia(true);

    try {
      await addSocialMediaLink.mutateAsync({
        city: selectedCity.trim(),
        url: socialMediaUrl.trim()
      });

      toast.success(`${validation.platform === 'youtube' ? 'YouTube' : 'Instagram'} video link added successfully`);
      setSocialMediaUrl('');
      setUrlValidation(null);
      refetchSelectedAlbum();
      refetchAllAlbums();
    } catch (error) {
      console.error('Error adding social media link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add social media link');
    } finally {
      setIsAddingSocialMedia(false);
    }
  };

  const handleDeleteSocialMediaLink = async (url: string) => {
    if (!selectedCity) return;

    if (!confirm('Are you sure you want to remove this social media link?')) {
      return;
    }

    try {
      await removeSocialMediaLink.mutateAsync({
        city: selectedCity,
        url
      });

      toast.success('Social media link removed successfully');
      refetchSelectedAlbum();
      refetchAllAlbums();
    } catch (error) {
      console.error('Error removing social media link:', error);
      toast.error('Failed to remove social media link');
    }
  };

  const removeUploadingFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearCompletedUploads = () => {
    setUploadingFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'uploading'));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'pending':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
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

  const hasCompletedUploads = uploadingFiles.some(f => f.status === 'success' || f.status === 'error');
  const hasPendingUploads = uploadingFiles.some(f => f.status === 'pending');
  const isAnyUploading = uploadingFiles.some(f => f.status === 'uploading');

  if (isInitializing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Initializing authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">City Album</h3>
          <p className="text-sm text-muted-foreground">
            Upload photos, videos, and add social media links for each city
          </p>
        </div>
      </div>

      {/* Authentication Status Alert */}
      {!isAuthenticated ? (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                You need to log in with Internet Identity to upload media and add social media links. 
                You can still view existing content.
              </span>
              <Button size="sm" variant="outline" className="ml-4">
                <LogIn className="h-4 w-4 mr-2" />
                Log In
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Camera className="h-4 w-4" />
          <AlertDescription>
            Upload images (JPEG, PNG, WebP, AVIF) and videos (MP4, MOV) for any city. Add YouTube and Instagram video links.
            Images max 10MB, videos max 50MB. Select an existing city or enter a new city name to get started.
          </AlertDescription>
        </Alert>
      )}

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
                {existingCities.map((city) => {
                  const album = allAlbums.find(album => album.city === city);
                  const totalItems = (album?.mediaFiles.length || 0) + (album?.socialMediaLinks.length || 0);
                  return (
                    <Button
                      key={city}
                      variant={selectedCity === city ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCitySelect(city)}
                    >
                      {city}
                      <Badge variant="secondary" className="ml-2">
                        {totalItems}
                      </Badge>
                    </Button>
                  );
                })}
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

      {/* File Upload and Social Media Links */}
      {selectedCity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Add Content for {selectedCity}
              {!isAuthenticated && <Lock className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isAuthenticated ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Authentication required to add content
                </p>
                <p className="text-xs text-muted-foreground">
                  Please log in with Internet Identity to upload media and add social media links
                </p>
              </div>
            ) : (
              <>
                {/* File Upload Section */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Upload Media Files</Label>
                  <div>
                    <Label htmlFor="media-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Click to select images and videos
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            <Plus className="h-4 w-4 mr-2" />
                            Choose Files
                          </span>
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          JPEG, PNG, WebP, AVIF (max 10MB) • MP4, MOV (max 50MB)
                        </p>
                      </div>
                    </Label>
                    <Input
                      id="media-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,video/mp4,video/quicktime,video/mov"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Selected Files Preview */}
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center justify-between">
                        <Label>Upload Queue ({uploadingFiles.length})</Label>
                        {hasCompletedUploads && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={clearCompletedUploads}
                          >
                            Clear Completed
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {uploadingFiles.map((uploadingFile, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                {getStatusIcon(uploadingFile.status)}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {uploadingFile.file.type.startsWith('video/') ? (
                                  <Video className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <Image className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(uploadingFile.file.size)} • {uploadingFile.file.type}
                                </p>
                                {uploadingFile.status === 'uploading' && (
                                  <Progress value={uploadingFile.progress} className="mt-1 h-1" />
                                )}
                                {uploadingFile.status === 'error' && uploadingFile.error && (
                                  <p className="text-xs text-red-500 mt-1">{uploadingFile.error}</p>
                                )}
                              </div>
                            </div>
                            {(uploadingFile.status === 'pending' || uploadingFile.status === 'error') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeUploadingFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      {hasPendingUploads && (
                        <Button
                          onClick={handleUploadFiles}
                          disabled={isUploading || isAnyUploading || addMediaToCityAlbum.isPending}
                          className="w-full"
                        >
                          {isUploading || isAnyUploading || addMediaToCityAlbum.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload {uploadingFiles.filter(f => f.status === 'pending').length} File(s)
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Enhanced Social Media Links Section */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Add Social Media Videos</Label>
                  
                  {/* Information Alert */}
                  <Alert className="mb-4">
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
                          Added videos will appear in the "Social Media" tab when viewing the city on the map.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={handleAddSocialMediaLink} className="space-y-4">
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
                              <AlertCircle className="h-4 w-4 text-red-500" />
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
                              <AlertCircle className="h-4 w-4" />
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
                    
                    <Button
                      type="submit"
                      disabled={
                        isAddingSocialMedia || 
                        addSocialMediaLink.isPending || 
                        !socialMediaUrl.trim() || 
                        urlValidation?.isValid !== true
                      }
                      className="w-full"
                    >
                      {isAddingSocialMedia || addSocialMediaLink.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Link className="h-4 w-4 mr-2" />
                      )}
                      Add Social Media Link
                    </Button>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Media Gallery */}
      {selectedCity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {selectedCity} Content Gallery
              {selectedAlbum && (
                <Badge variant="secondary">
                  {selectedAlbum.mediaFiles.length + selectedAlbum.socialMediaLinks.length} items
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedAlbum || (selectedAlbum.mediaFiles.length === 0 && selectedAlbum.socialMediaLinks.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No content yet</p>
                <p className="text-sm">
                  {isAuthenticated 
                    ? "Upload photos, videos, or add social media links to get started!" 
                    : "Log in to add content for this city."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Media Files */}
                {selectedAlbum.mediaFiles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Camera className="h-5 w-5" />
                      <h4 className="font-medium">Media Files</h4>
                      <Badge variant="outline">{selectedAlbum.mediaFiles.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedAlbum.mediaFiles.map((mediaFile, index) => (
                        <MediaFileCard
                          key={`${mediaFile.path}-${index}`}
                          mediaFile={mediaFile}
                          onDelete={() => handleDeleteMedia(mediaFile.path)}
                          isDeleting={removeMediaFromCityAlbum.isPending}
                          canDelete={isAuthenticated}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Media Links */}
                {selectedAlbum.socialMediaLinks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Link className="h-5 w-5" />
                      <h4 className="font-medium">Social Media Videos</h4>
                      <Badge variant="outline">{selectedAlbum.socialMediaLinks.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedAlbum.socialMediaLinks.map((link, index) => (
                        <SocialMediaLinkCard
                          key={`${link.url}-${index}`}
                          socialMediaLink={link}
                          onDelete={() => handleDeleteSocialMediaLink(link.url)}
                          isDeleting={removeSocialMediaLink.isPending}
                          canDelete={isAuthenticated}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MediaFileCardProps {
  mediaFile: MediaFile;
  onDelete: () => void;
  isDeleting: boolean;
  canDelete: boolean;
}

function MediaFileCard({ mediaFile, onDelete, isDeleting, canDelete }: MediaFileCardProps) {
  const { data: fileUrl, isLoading, error } = useFileUrl(mediaFile.path);

  const formatDate = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="aspect-square bg-muted rounded-md flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !fileUrl) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="aspect-square bg-red-50 rounded-md flex flex-col items-center justify-center border border-red-200">
            <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
            <span className="text-xs text-red-600 text-center">
              Failed to load media
            </span>
            {canDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDelete}
                disabled={isDeleting}
                className="mt-2"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-square relative">
          {mediaFile.mediaType === MediaType.video ? (
            <video
              src={fileUrl}
              className="w-full h-full object-cover rounded-t-lg"
              controls
              preload="metadata"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <img
              src={fileUrl}
              alt="City media"
              className="w-full h-full object-cover rounded-t-lg"
              style={{ objectFit: 'cover' }}
              loading="lazy"
            />
          )}
          
          {/* Overlay with controls */}
          {canDelete && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                size="sm"
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Media type indicator */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs">
              {mediaFile.mediaType === MediaType.video ? (
                <Video className="h-3 w-3 mr-1" />
              ) : (
                <Image className="h-3 w-3 mr-1" />
              )}
              {mediaFile.format.toUpperCase()}
            </Badge>
          </div>
        </div>
        
        {/* File info */}
        <div className="p-2">
          <p className="text-xs text-muted-foreground">
            {formatDate(mediaFile.uploadedAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface SocialMediaLinkCardProps {
  socialMediaLink: SocialMediaLink;
  onDelete: () => void;
  isDeleting: boolean;
  canDelete: boolean;
}

function SocialMediaLinkCard({ socialMediaLink, onDelete, isDeleting, canDelete }: SocialMediaLinkCardProps) {
  const formatDate = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSocialMediaIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-5 w-5 text-red-500" />;
      case 'instagram':
        return <Instagram className="h-5 w-5 text-pink-500" />;
      default:
        return <Link className="h-5 w-5 text-blue-500" />;
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
    <Card className="group relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getSocialMediaIcon(socialMediaLink.platform)}
            <span className="font-medium text-sm">
              {getPlatformName(socialMediaLink.platform)}
            </span>
          </div>
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={isDeleting}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <a
            href={socialMediaLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline break-all flex items-center gap-1"
          >
            View Video
            <ExternalLink className="h-3 w-3" />
          </a>
          <p className="text-xs text-muted-foreground">
            Added {formatDate(socialMediaLink.addedAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
