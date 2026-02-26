import React, { useState, useRef } from 'react';
import { Upload, Trash2, Link, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useGetCityAlbum, useAddMediaToCityAlbum, useRemoveMediaFromCityAlbum, useAddSocialMediaLinkToCityAlbum, useRemoveSocialMediaLinkFromCityAlbum, validateSocialMediaUrl } from '@/hooks/useQueries';
import { useFileUpload, useFileUrl, useFileDelete } from '@/blob-storage/FileStorage';
import { MediaType } from '@/backend';

interface CityAlbumManagerProps {
  city: string;
}

interface MediaFileDisplayProps {
  path: string;
  onDelete: (path: string) => void;
}

function MediaFileDisplay({ path, onDelete }: MediaFileDisplayProps) {
  const { data: url } = useFileUrl(path);

  if (!url) return (
    <div className="w-full h-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
      Loading...
    </div>
  );

  const isVideo = path.match(/\.(mp4|webm|ogg|mov)$/i);
  const isAudio = path.match(/\.(mp3|wav|ogg|aac|flac)$/i);

  return (
    <div className="relative group">
      {isVideo ? (
        <video
          src={url}
          className="w-full h-24 object-cover rounded"
          controls
        />
      ) : isAudio ? (
        <div className="w-full h-24 bg-muted rounded flex flex-col items-center justify-center gap-2 p-2">
          <audio src={url} controls className="w-full" />
        </div>
      ) : (
        <img
          src={url}
          alt={path}
          className="w-full h-24 object-cover rounded"
        />
      )}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(path)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function CityAlbumManager({ city }: CityAlbumManagerProps) {
  const [socialMediaUrl, setSocialMediaUrl] = useState('');
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; platform: string; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: cityAlbum, isLoading } = useGetCityAlbum(city);
  const addMedia = useAddMediaToCityAlbum();
  const removeMedia = useRemoveMediaFromCityAlbum();
  const addSocialLink = useAddSocialMediaLinkToCityAlbum();
  const removeSocialLink = useRemoveSocialMediaLinkFromCityAlbum();
  const { uploadFile, isUploading } = useFileUpload();
  const { deleteFile } = useFileDelete();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const filePath = `city-albums/${city}/${Date.now()}-${file.name}`;
        await uploadFile(filePath, file);

        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');
        const mediaType = isVideo ? { video: null } : isAudio ? { audio: null } : { image: null };
        const mediaTypeEnum = isVideo ? MediaType.video : isAudio ? MediaType.audio : MediaType.image;

        await addMedia.mutateAsync({
          city,
          mediaFile: {
            path: filePath,
            mediaType: mediaTypeEnum,
            format: file.type,
            uploadedAt: BigInt(Date.now() * 1000000),
          }
        });

        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteMedia = async (path: string) => {
    if (!confirm('Are you sure you want to delete this media file?')) return;

    try {
      await deleteFile(path);
      await removeMedia.mutateAsync({ city, mediaPath: path });
      toast.success('Media file deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete media file');
    }
  };

  const handleUrlChange = (url: string) => {
    setSocialMediaUrl(url);
    if (url.trim()) {
      const validation = validateSocialMediaUrl(url.trim());
      setUrlValidation(validation);
    } else {
      setUrlValidation(null);
    }
  };

  const handleAddSocialLink = async () => {
    if (!socialMediaUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    const validation = validateSocialMediaUrl(socialMediaUrl.trim());
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid URL');
      return;
    }

    try {
      await addSocialLink.mutateAsync({
        city,
        socialMediaLink: {
          url: socialMediaUrl.trim(),
          platform: validation.platform,
          addedAt: BigInt(Date.now() * 1000000),
        }
      });
      setSocialMediaUrl('');
      setUrlValidation(null);
      toast.success('Social media link added successfully');
    } catch (error) {
      console.error('Error adding social link:', error);
      toast.error('Failed to add social media link');
    }
  };

  const handleRemoveSocialLink = async (url: string) => {
    if (!confirm('Are you sure you want to remove this link?')) return;

    try {
      await removeSocialLink.mutateAsync({ city, url });
      toast.success('Social media link removed successfully');
    } catch (error) {
      console.error('Error removing social link:', error);
      toast.error('Failed to remove social media link');
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading album...</div>;
  }

  const mediaFiles = cityAlbum?.mediaFiles || [];
  const socialMediaLinks = cityAlbum?.socialMediaLinks || [];

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Upload photos, videos, or audio files for <strong>{city}</strong>. You can also add YouTube or Instagram video links.
        </AlertDescription>
      </Alert>

      {/* File Upload Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Media Files</Label>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>

        {mediaFiles.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {mediaFiles.map((file, index) => (
              <MediaFileDisplay
                key={index}
                path={file.path}
                onDelete={handleDeleteMedia}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No media files yet</p>
        )}
      </div>

      {/* Social Media Links Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Social Media Links</Label>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Supported platforms: <strong>YouTube</strong> (watch/embed URLs) and <strong>Instagram</strong> (posts, reels, IGTV).
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Input
              placeholder="https://www.youtube.com/watch?v=... or https://www.instagram.com/reel/..."
              value={socialMediaUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className={`text-sm ${urlValidation ? (urlValidation.isValid ? 'border-green-500' : 'border-red-500') : ''}`}
            />
            {urlValidation && (
              <p className={`text-xs ${urlValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {urlValidation.isValid
                  ? `✓ Valid ${urlValidation.platform} URL`
                  : urlValidation.error}
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAddSocialLink}
            disabled={addSocialLink.isPending || !urlValidation?.isValid}
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>

        {socialMediaLinks.length > 0 ? (
          <div className="space-y-2">
            {socialMediaLinks.map((link, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {link.platform}
                  </Badge>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate flex items-center gap-1"
                  >
                    {link.url}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleRemoveSocialLink(link.url)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No social media links yet</p>
        )}
      </div>
    </div>
  );
}
