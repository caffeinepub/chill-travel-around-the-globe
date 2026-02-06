import { useFileUrl } from '../blob-storage/FileStorage';
import { MediaFile, MediaType, SocialMediaLink } from '@/backend';
import { Loader2, AlertCircle, Video, Image, Play, ChevronLeft, ChevronRight, Youtube, Instagram, Link, ExternalLink, Maximize2 } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MediaGalleryPopupProps {
  mediaFiles: MediaFile[];
  socialMediaLinks?: SocialMediaLink[];
}

// Utility functions for extracting video IDs and creating embed URLs
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getInstagramVideoId(url: string): string | null {
  const patterns = [
    /instagram\.com\/p\/([^\/\?]+)/,
    /instagram\.com\/reel\/([^\/\?]+)/,
    /instagram\.com\/tv\/([^\/\?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function createYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
}

function createInstagramEmbedUrl(videoId: string): string {
  return `https://www.instagram.com/p/${videoId}/embed/`;
}

export function MediaGalleryPopup({ mediaFiles, socialMediaLinks = [] }: MediaGalleryPopupProps) {
  const { photos, videos } = useMemo(() => {
    if (!mediaFiles || mediaFiles.length === 0) {
      return { photos: [], videos: [] };
    }

    const photos = mediaFiles.filter(file => file.mediaType === MediaType.image);
    const videos = mediaFiles.filter(file => file.mediaType === MediaType.video);
    
    return { photos, videos };
  }, [mediaFiles]);

  // Determine default tab based on available content - prioritize social media first
  const defaultTab = socialMediaLinks.length > 0 ? 'social' : photos.length > 0 ? 'photos' : 'videos';

  if (!mediaFiles || (mediaFiles.length === 0 && socialMediaLinks.length === 0)) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No media content available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger 
            value="social" 
            className="flex items-center gap-2"
            disabled={socialMediaLinks.length === 0}
          >
            <Link className="h-4 w-4" />
            Social Media ({socialMediaLinks.length})
          </TabsTrigger>
          <TabsTrigger 
            value="photos" 
            className="flex items-center gap-2"
            disabled={photos.length === 0}
          >
            <Image className="h-4 w-4" />
            Photos ({photos.length})
          </TabsTrigger>
          <TabsTrigger 
            value="videos" 
            className="flex items-center gap-2"
            disabled={videos.length === 0}
          >
            <Video className="h-4 w-4" />
            Videos ({videos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="mt-0">
          {socialMediaLinks.length > 0 ? (
            <div className="space-y-4">
              {socialMediaLinks.map((link, index) => (
                <EmbeddedSocialVideo 
                  key={`social-${link.url}-${index}`} 
                  socialMediaLink={link}
                  allSocialLinks={socialMediaLinks}
                  currentIndex={index}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Link className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No social media videos available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="photos" className="mt-0">
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {photos.map((mediaFile, index) => (
                <MediaThumbnail 
                  key={`photo-${mediaFile.path}-${index}`} 
                  mediaFile={mediaFile} 
                  allPhotos={photos}
                  currentIndex={index}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No photos available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-0">
          {videos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {videos.map((mediaFile, index) => (
                <MediaThumbnail 
                  key={`video-${mediaFile.path}-${index}`} 
                  mediaFile={mediaFile}
                  allPhotos={[]}
                  currentIndex={-1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No videos available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface EmbeddedSocialVideoProps {
  socialMediaLink: SocialMediaLink;
  allSocialLinks: SocialMediaLink[];
  currentIndex: number;
}

function EmbeddedSocialVideo({ socialMediaLink, allSocialLinks, currentIndex }: EmbeddedSocialVideoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [embedError, setEmbedError] = useState(false);

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

  const getEmbedUrl = useCallback(() => {
    const platform = socialMediaLink.platform.toLowerCase();
    
    if (platform === 'youtube') {
      const videoId = getYouTubeVideoId(socialMediaLink.url);
      return videoId ? createYouTubeEmbedUrl(videoId) : null;
    } else if (platform === 'instagram') {
      const videoId = getInstagramVideoId(socialMediaLink.url);
      return videoId ? createInstagramEmbedUrl(videoId) : null;
    }
    
    return null;
  }, [socialMediaLink.url, socialMediaLink.platform]);

  const embedUrl = getEmbedUrl();

  const handleExpandClick = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleEmbedError = useCallback(() => {
    setEmbedError(true);
  }, []);

  if (!embedUrl || embedError) {
    // Fallback to external link if embedding fails
    return (
      <div className="bg-gray-50 rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getSocialMediaIcon(socialMediaLink.platform)}
            <div>
              <h4 className="font-medium text-sm">
                {getPlatformName(socialMediaLink.platform)} Video
              </h4>
              <p className="text-xs text-gray-500">
                Added {new Date(Number(socialMediaLink.addedAt) / 1000000).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleExpandClick}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Expand video"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
        
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 mb-3">
            {embedError ? 'Unable to embed video' : 'Video not embeddable'}
          </p>
          <a
            href={socialMediaLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            Watch on {getPlatformName(socialMediaLink.platform)}
          </a>
        </div>

        {/* Expanded view for non-embeddable videos */}
        {isExpanded && (
          <SocialMediaExpansion
            socialMediaLink={socialMediaLink}
            allSocialLinks={allSocialLinks}
            currentIndex={currentIndex}
            onClose={handleCloseExpanded}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <div className="flex items-center gap-3">
          {getSocialMediaIcon(socialMediaLink.platform)}
          <div>
            <h4 className="font-medium text-sm">
              {getPlatformName(socialMediaLink.platform)} Video
            </h4>
            <p className="text-xs text-gray-500">
              Added {new Date(Number(socialMediaLink.addedAt) / 1000000).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button
          onClick={handleExpandClick}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Expand video"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Embedded Video Player */}
      <div className="relative aspect-video bg-black">
        <iframe
          src={embedUrl}
          title={`${getPlatformName(socialMediaLink.platform)} video`}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={handleEmbedError}
        />
      </div>

      {/* Video URL for reference */}
      <div className="p-3 bg-gray-50 border-t">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 truncate flex-1 mr-2">
            {socialMediaLink.url}
          </p>
          <a
            href={socialMediaLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </a>
        </div>
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <SocialMediaExpansion
          socialMediaLink={socialMediaLink}
          allSocialLinks={allSocialLinks}
          currentIndex={currentIndex}
          onClose={handleCloseExpanded}
          embedUrl={embedUrl}
        />
      )}
    </div>
  );
}

interface MediaThumbnailProps {
  mediaFile: MediaFile;
  allPhotos: MediaFile[];
  currentIndex: number;
}

function MediaThumbnail({ mediaFile, allPhotos, currentIndex }: MediaThumbnailProps) {
  const { data: fileUrl, isLoading, error } = useFileUrl(mediaFile.path);
  const [mediaError, setMediaError] = useState(false);
  const [isAlbumOpen, setIsAlbumOpen] = useState(false);
  const [albumIndex, setAlbumIndex] = useState(0);
  const [albumAspectMode, setAlbumAspectMode] = useState<'portrait' | 'landscape' | null>(null);

  const handleClick = useCallback(() => {
    if (fileUrl && !mediaError) {
      if (mediaFile.mediaType === MediaType.image && allPhotos.length > 0) {
        // Open lovely album for photos
        setAlbumIndex(currentIndex);
        setIsAlbumOpen(true);
        // Reset aspect mode - it will be determined by the clicked photo
        setAlbumAspectMode(null);
      } else if (mediaFile.mediaType === MediaType.video) {
        // For videos, open simple fullscreen with audio enabled
        setIsAlbumOpen(true);
      }
    }
  }, [fileUrl, mediaError, mediaFile.mediaType, allPhotos.length, currentIndex]);

  const closeAlbum = useCallback(() => {
    setIsAlbumOpen(false);
    setAlbumAspectMode(null);
  }, []);

  const nextPhoto = useCallback(() => {
    setAlbumIndex((prev) => (prev + 1) % allPhotos.length);
  }, [allPhotos.length]);

  const prevPhoto = useCallback(() => {
    setAlbumIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  }, []);

  const goToPhoto = useCallback((index: number) => {
    setAlbumIndex(index);
  }, []);

  const handleMediaError = useCallback(() => {
    setMediaError(true);
  }, []);

  const handleMediaLoad = useCallback(() => {
    setMediaError(false);
  }, []);

  const handleAspectModeSet = useCallback((mode: 'portrait' | 'landscape') => {
    if (albumAspectMode === null) {
      setAlbumAspectMode(mode);
    }
  }, [albumAspectMode]);

  // Handle keyboard navigation for album
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isAlbumOpen) return;
    
    switch (e.key) {
      case 'Escape':
        closeAlbum();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (mediaFile.mediaType === MediaType.image) prevPhoto();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (mediaFile.mediaType === MediaType.image) nextPhoto();
        break;
    }
  }, [isAlbumOpen, closeAlbum, prevPhoto, nextPhoto, mediaFile.mediaType]);

  // Add/remove keyboard listeners when album opens/closes
  useEffect(() => {
    if (isAlbumOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isAlbumOpen, handleKeyDown]);

  if (isLoading) {
    return (
      <div className="aspect-square bg-gray-100 rounded-md flex items-center justify-center border">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !fileUrl || mediaError) {
    return (
      <div className="aspect-square bg-red-50 rounded-md flex flex-col items-center justify-center border border-red-200">
        <AlertCircle className="h-6 w-6 text-red-500 mb-1" />
        <span className="text-xs text-red-600 text-center px-1">
          {error ? 'Load failed' : 'Media error'}
        </span>
      </div>
    );
  }

  return (
    <>
      <div 
        className="aspect-square relative rounded-md overflow-hidden border cursor-pointer hover:opacity-80 transition-all duration-200 group hover:scale-[1.02] hover:shadow-md"
        onClick={handleClick}
        title={`Click to view ${mediaFile.mediaType === MediaType.video ? 'video' : 'image'} in full size`}
      >
        {mediaFile.mediaType === MediaType.video ? (
          <video
            src={fileUrl}
            className="w-full h-full object-cover"
            preload="metadata"
            onError={handleMediaError}
            onLoadedData={handleMediaLoad}
          />
        ) : (
          <img
            src={fileUrl}
            alt="City media"
            className="w-full h-full object-cover"
            loading="lazy"
            onError={handleMediaError}
            onLoad={handleMediaLoad}
          />
        )}
        
        {/* Play button overlay for videos */}
        {mediaFile.mediaType === MediaType.video && !mediaError && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/60 rounded-full p-3">
              <Play className="h-4 w-4 text-white fill-white" />
            </div>
          </div>
        )}
        
        {/* Click indicator */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
            Click to view
          </div>
        </div>
      </div>

      {/* Lovely Album Style Fullscreen Viewer for Photos */}
      {isAlbumOpen && mediaFile.mediaType === MediaType.image && allPhotos.length > 0 && (
        <LovelyAlbumViewer
          photos={allPhotos}
          currentIndex={albumIndex}
          onClose={closeAlbum}
          onNext={nextPhoto}
          onPrev={prevPhoto}
          onGoTo={goToPhoto}
          aspectMode={albumAspectMode}
          onAspectModeSet={handleAspectModeSet}
        />
      )}

      {/* Enhanced Video Fullscreen with Audio Support */}
      {isAlbumOpen && mediaFile.mediaType === MediaType.video && (
        <EnhancedVideoFullscreen
          mediaFile={mediaFile}
          fileUrl={fileUrl}
          onClose={closeAlbum}
          onError={handleMediaError}
        />
      )}
    </>
  );
}

interface SocialMediaExpansionProps {
  socialMediaLink: SocialMediaLink;
  allSocialLinks: SocialMediaLink[];
  currentIndex: number;
  onClose: () => void;
  embedUrl?: string;
}

function SocialMediaExpansion({ socialMediaLink, allSocialLinks, currentIndex, onClose, embedUrl }: SocialMediaExpansionProps) {
  const [currentLinkIndex, setCurrentLinkIndex] = useState(currentIndex);
  const currentLink = allSocialLinks[currentLinkIndex];
  const [embedError, setEmbedError] = useState(false);

  const getSocialMediaIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-6 w-6 text-red-500" />;
      case 'instagram':
        return <Instagram className="h-6 w-6 text-pink-500" />;
      default:
        return <Link className="h-6 w-6 text-blue-500" />;
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

  const getCurrentEmbedUrl = useCallback(() => {
    const platform = currentLink.platform.toLowerCase();
    
    if (platform === 'youtube') {
      const videoId = getYouTubeVideoId(currentLink.url);
      return videoId ? createYouTubeEmbedUrl(videoId) : null;
    } else if (platform === 'instagram') {
      const videoId = getInstagramVideoId(currentLink.url);
      return videoId ? createInstagramEmbedUrl(videoId) : null;
    }
    
    return null;
  }, [currentLink.url, currentLink.platform]);

  const currentEmbedUrl = getCurrentEmbedUrl();

  const nextVideo = useCallback(() => {
    setCurrentLinkIndex((prev) => (prev + 1) % allSocialLinks.length);
    setEmbedError(false);
  }, [allSocialLinks.length]);

  const prevVideo = useCallback(() => {
    setCurrentLinkIndex((prev) => (prev - 1 + allSocialLinks.length) % allSocialLinks.length);
    setEmbedError(false);
  }, [allSocialLinks.length]);

  const goToVideo = useCallback((index: number) => {
    setCurrentLinkIndex(index);
    setEmbedError(false);
  }, []);

  const handleEmbedError = useCallback(() => {
    setEmbedError(true);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (allSocialLinks.length > 1) prevVideo();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (allSocialLinks.length > 1) nextVideo();
        break;
    }
  }, [onClose, prevVideo, nextVideo, allSocialLinks.length]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-5xl w-full">
        {/* Navigation Arrows */}
        {allSocialLinks.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevVideo();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-all duration-200 text-white hover:scale-110 z-10"
              title="Previous video"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextVideo();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-all duration-200 text-white hover:scale-110 z-10"
              title="Next video"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Main Content */}
        <div 
          className="bg-white rounded-lg overflow-hidden shadow-2xl max-w-4xl mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              {getSocialMediaIcon(currentLink.platform)}
              <div>
                <h3 className="font-semibold text-lg">
                  {getPlatformName(currentLink.platform)} Video
                </h3>
                <p className="text-sm text-gray-500">
                  Added {new Date(Number(currentLink.addedAt) / 1000000).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Close (Esc)"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Embedded Video Player */}
          {currentEmbedUrl && !embedError ? (
            <div className="relative aspect-video bg-black">
              <iframe
                src={currentEmbedUrl}
                title={`${getPlatformName(currentLink.platform)} video`}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onError={handleEmbedError}
              />
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 flex flex-col items-center justify-center p-8">
              <div className="text-center">
                {getSocialMediaIcon(currentLink.platform)}
                <h4 className="font-medium text-lg mt-4 mb-2">
                  {embedError ? 'Unable to embed video' : 'Video not embeddable'}
                </h4>
                <p className="text-gray-600 mb-4">
                  {embedError ? 'There was an error loading the embedded video.' : 'This video cannot be embedded directly.'}
                </p>
                <a
                  href={currentLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-5 w-5" />
                  Watch on {getPlatformName(currentLink.platform)}
                </a>
              </div>
            </div>
          )}

          {/* Video URL */}
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 truncate flex-1 mr-4">
                {currentLink.url}
              </p>
              <a
                href={currentLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                Open Original
              </a>
            </div>
          </div>
        </div>

        {/* Video Counter and Navigation */}
        {allSocialLinks.length > 1 && (
          <>
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
              {currentLinkIndex + 1} of {allSocialLinks.length}
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-3">
              {allSocialLinks.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToVideo(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    index === currentLinkIndex 
                      ? 'bg-white scale-110' 
                      : 'bg-white/50 hover:bg-white/75 hover:scale-105'
                  }`}
                  title={`Go to video ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface LovelyAlbumViewerProps {
  photos: MediaFile[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (index: number) => void;
  aspectMode: 'portrait' | 'landscape' | null;
  onAspectModeSet: (mode: 'portrait' | 'landscape') => void;
}

function LovelyAlbumViewer({ 
  photos, 
  currentIndex, 
  onClose, 
  onNext, 
  onPrev, 
  onGoTo,
  aspectMode,
  onAspectModeSet
}: LovelyAlbumViewerProps) {
  const currentPhoto = photos[currentIndex];
  const { data: currentPhotoUrl } = useFileUrl(currentPhoto.path);
  const [imageError, setImageError] = useState(false);
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState<{ width: number; height: number } | null>(null);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    setImageNaturalDimensions({
      width: naturalWidth,
      height: naturalHeight
    });
    
    // Set aspect mode based on the first loaded image if not already set
    if (aspectMode === null) {
      const isLandscape = naturalWidth > naturalHeight;
      onAspectModeSet(isLandscape ? 'landscape' : 'portrait');
    }
    
    setImageError(false);
  }, [aspectMode, onAspectModeSet]);

  // Calculate intelligent scaling for fullscreen images based on aspect mode
  const getFullscreenImageStyle = useCallback(() => {
    if (!imageNaturalDimensions || !aspectMode) {
      return { maxWidth: '90vw', maxHeight: '80vh' };
    }

    // Get approximate search bar width (based on the container structure)
    // The search bar is in a container with padding, so we estimate around 60-70% of viewport width
    const searchBarWidth = Math.min(800, window.innerWidth * 0.65);
    
    // Get map window height (approximately 80% of viewport height minus header)
    const mapHeight = Math.max(400, window.innerHeight * 0.6);

    if (aspectMode === 'landscape') {
      // For landscape mode: scale width to be close to search bar length
      const targetWidth = searchBarWidth;
      
      // Calculate height based on current image's aspect ratio
      const { width: naturalWidth, height: naturalHeight } = imageNaturalDimensions;
      const scaledHeight = (targetWidth / naturalWidth) * naturalHeight;
      
      // Ensure it doesn't exceed reasonable height limits
      const maxHeight = Math.min(mapHeight, window.innerHeight * 0.8);
      if (scaledHeight > maxHeight) {
        const adjustedWidth = (maxHeight / naturalHeight) * naturalWidth;
        return {
          width: `${adjustedWidth}px`,
          height: `${maxHeight}px`,
          maxWidth: '90vw',
          maxHeight: '80vh'
        };
      }
      
      return {
        width: `${targetWidth}px`,
        height: `${scaledHeight}px`,
        maxWidth: '90vw',
        maxHeight: '80vh'
      };
    } else {
      // For portrait mode: scale height to be similar to map window height
      const targetHeight = mapHeight;
      
      // Calculate width based on current image's aspect ratio
      const { width: naturalWidth, height: naturalHeight } = imageNaturalDimensions;
      const scaledWidth = (targetHeight / naturalHeight) * naturalWidth;
      
      // Ensure it doesn't exceed reasonable width limits
      const maxWidth = Math.min(searchBarWidth, window.innerWidth * 0.9);
      if (scaledWidth > maxWidth) {
        const adjustedHeight = (maxWidth / naturalWidth) * naturalHeight;
        return {
          width: `${maxWidth}px`,
          height: `${adjustedHeight}px`,
          maxWidth: '90vw',
          maxHeight: '80vh'
        };
      }
      
      return {
        width: `${scaledWidth}px`,
        height: `${targetHeight}px`,
        maxWidth: '90vw',
        maxHeight: '80vh'
      };
    }
  }, [imageNaturalDimensions, aspectMode]);

  if (!currentPhotoUrl || imageError) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black z-[10000] flex items-center justify-center lovely-album-viewer"
      onClick={onClose}
    >
      {/* Main Image Display */}
      <div className="relative flex items-center justify-center w-full h-full">
        <img
          src={currentPhotoUrl}
          alt="Album photo"
          style={getFullscreenImageStyle()}
          className="w-auto h-auto transition-all duration-500 ease-out"
          onError={handleImageError}
          onLoad={handleImageLoad}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-all duration-200 text-white hover:scale-110"
              title="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-all duration-200 text-white hover:scale-110"
              title="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Elegant Thumbnail Strip Navigation */}
      {photos.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-3">
          {photos.map((photo, index) => (
            <ThumbnailNavItem
              key={`thumb-${photo.path}-${index}`}
              photo={photo}
              index={index}
              isActive={index === currentIndex}
              onClick={() => onGoTo(index)}
            />
          ))}
        </div>
      )}

      {/* Photo Counter */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
        {currentIndex + 1} of {photos.length}
        {aspectMode && (
          <span className="ml-2 text-xs opacity-75">
            ({aspectMode} mode)
          </span>
        )}
      </div>
    </div>
  );
}

interface ThumbnailNavItemProps {
  photo: MediaFile;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

function ThumbnailNavItem({ photo, isActive, onClick }: ThumbnailNavItemProps) {
  const { data: thumbUrl } = useFileUrl(photo.path);
  const [thumbError, setThumbError] = useState(false);

  if (!thumbUrl || thumbError) {
    return (
      <div 
        className={`w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center cursor-pointer transition-all duration-200 ${
          isActive ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-80'
        }`}
        onClick={onClick}
      >
        <Image className="h-4 w-4 text-gray-400" />
      </div>
    );
  }

  return (
    <div 
      className={`w-12 h-12 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isActive ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-80 hover:scale-105'
      }`}
      onClick={onClick}
    >
      <img
        src={thumbUrl}
        alt="Thumbnail"
        className="w-full h-full object-cover"
        onError={() => setThumbError(true)}
      />
    </div>
  );
}

interface EnhancedVideoFullscreenProps {
  mediaFile: MediaFile;
  fileUrl: string;
  onClose: () => void;
  onError: () => void;
}

function EnhancedVideoFullscreen({ mediaFile, fileUrl, onClose, onError }: EnhancedVideoFullscreenProps) {
  const [videoError, setVideoError] = useState(false);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
    onError();
  }, [onError]);

  // Handle escape key for video fullscreen
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-6xl w-full">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
          title="Close (Esc)"
        >
          <div className="bg-black/50 rounded-full p-2">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </button>

        {/* Video content */}
        <div 
          className="bg-white rounded-lg overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {!videoError ? (
            <video
              src={fileUrl}
              controls
              autoPlay
              style={{ maxWidth: '90vw', maxHeight: '80vh' }}
              className="w-auto h-auto"
              onError={handleVideoError}
              preload="auto"
              playsInline
            />
          ) : (
            <div className="aspect-video bg-gray-100 flex flex-col items-center justify-center p-8 min-h-[400px]">
              <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Video Error</h3>
              <p className="text-gray-600 text-center">
                Unable to load or play this video. The file may be corrupted or in an unsupported format.
              </p>
            </div>
          )}
          
          {/* Media info */}
          <div className="p-4 bg-white border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Video className="h-4 w-4" />
              <span className="font-medium">Video</span>
              <span>•</span>
              <span>
                {new Date(Number(mediaFile.uploadedAt) / 1000000).toLocaleDateString()}
              </span>
              {!videoError && (
                <>
                  <span>•</span>
                  <span className="text-green-600 font-medium">Audio Enabled</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
