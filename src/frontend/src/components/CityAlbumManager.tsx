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
      const socialMediaLink: SocialMediaLink = {
        url: socialMediaUrl.trim(),
        platform: validation.platform || 'unknown',
        addedAt: BigInt(Date.now() * 1000000)
      };

      await addSocialMediaLink.mutateAsync({
        city: selectedCity.trim(),
        socialMediaLink
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Upload Media Files</Label>
                    {hasCompletedUploads && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCompletedUploads}
                      >
                        Clear Completed
                      </Button>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-center">
                        <Label
                          htmlFor="file-upload"
                          className="cursor-pointer text-primary hover:underline"
                        >
                          Choose files
                        </Label>
                        <Input
                          id="file-upload"
                          type="file"
                          multiple
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,video/mp4,video/quicktime"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          or drag and drop
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        JPEG, PNG, WebP, AVIF, MP4, MOV (Images: 10MB max, Videos: 50MB max)
                      </p>
                    </div>
                  </div>

                  {/* Uploading Files List */}
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadingFiles.map((uploadingFile, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          {getStatusIcon(uploadingFile.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {uploadingFile.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(uploadingFile.file.size)}
                            </p>
                            {uploadingFile.status === 'uploading' && (
                              <Progress value={uploadingFile.progress} className="mt-1" />
                            )}
                            {uploadingFile.status === 'error' && uploadingFile.error && (
                              <p className="text-xs text-red-500 mt-1">{uploadingFile.error}</p>
                            )}
                          </div>
                          {(uploadingFile.status === 'pending' || uploadingFile.status === 'error') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeUploadingFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {hasPendingUploads && (
                    <Button
                      onClick={handleUploadFiles}
                      disabled={isAnyUploading}
                      className="w-full"
                    >
                      {isAnyUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload {uploadingFiles.filter(f => f.status === 'pending').length} File(s)
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Social Media Links Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label>Add Social Media Video Link</Label>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <p className="font-medium mb-1">Supported platforms:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>YouTube: Video URLs (watch, embed, or short links)</li>
                        <li>Instagram: Post, Reel, or IGTV URLs</li>
                      </ul>
                      <p className="mt-2">
                        Videos will be embedded and playable directly in the city album gallery.
                      </p>
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={handleAddSocialMediaLink} className="space-y-3">
                    <div>
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
                    <Button
                      type="submit"
                      disabled={isAddingSocialMedia || !socialMediaUrl.trim() || (urlValidation !== null && !urlValidation.isValid)}
                      className="w-full"
                    >
                      {isAddingSocialMedia ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding Link...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Video Link
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Content Display */}
      {selectedCity && selectedAlbum && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Content for {selectedCity}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Media Files */}
            {selectedAlbum.mediaFiles.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Media Files ({selectedAlbum.mediaFiles.length})
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedAlbum.mediaFiles.map((media, index) => (
                    <MediaFileCard
                      key={index}
                      media={media}
                      onDelete={() => handleDeleteMedia(media.path)}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Social Media Links */}
            {selectedAlbum.socialMediaLinks.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Social Media Links ({selectedAlbum.socialMediaLinks.length})
                </Label>
                <div className="space-y-2">
                  {selectedAlbum.socialMediaLinks.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      {getSocialMediaIcon(link.platform)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.url}</p>
                        <p className="text-xs text-muted-foreground">
                          Added {formatDate(link.addedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(link.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {isAuthenticated && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSocialMediaLink(link.url)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAlbum.mediaFiles.length === 0 && selectedAlbum.socialMediaLinks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No content yet for {selectedCity}</p>
                <p className="text-sm">Upload media files or add social media links to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Media File Card Component
interface MediaFileCardProps {
  media: MediaFile;
  onDelete: () => void;
  formatDate: (timestamp: bigint) => string;
}

function MediaFileCard({ media, onDelete, formatDate }: MediaFileCardProps) {
  const { data: fileUrl } = useFileUrl(media.path);
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  return (
    <div className="relative group border rounded-lg overflow-hidden">
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="p-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {media.mediaType === MediaType.image ? <Image className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
            {media.format.toUpperCase()}
          </Badge>
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDate(media.uploadedAt)}
        </p>
      </div>
    </div>
  );
}
