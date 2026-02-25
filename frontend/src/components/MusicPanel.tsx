import { useState } from 'react';
import { Music, Play, Pause, Volume2, X, Clock, User, Disc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGetAllMusicAlbums } from '@/hooks/useQueries';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { Song, MusicAlbum } from '@/backend';

interface MusicPanelProps {
  onSongSelect?: (song: Song & { albumTitle: string }) => void;
  currentlyPlayingSong?: Song & { albumTitle: string };
}

export default function MusicPanel({ onSongSelect, currentlyPlayingSong }: MusicPanelProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<MusicAlbum | null>(null);

  const { data: musicAlbums = [] } = useGetAllMusicAlbums();

  // Get all songs from all albums
  const allSongs = musicAlbums.flatMap(album => 
    album.songs.map(song => ({
      ...song,
      albumTitle: album.title
    }))
  );

  const handleSongClick = (song: Song & { albumTitle: string }) => {
    if (onSongSelect) {
      onSongSelect(song);
    }
  };

  const formatDuration = (filePath: string) => {
    // This is a placeholder - in a real app you'd get the actual duration
    return '3:45';
  };

  const isCurrentlyPlaying = (song: Song & { albumTitle: string }) => {
    return currentlyPlayingSong?.filePath === song.filePath;
  };

  if (!isAuthenticated || musicAlbums.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
            title="Music"
          >
            <Music className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden z-[3100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Music Collection
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-12">
            <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {!isAuthenticated ? 'Authentication Required' : 'No Music Albums'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {!isAuthenticated 
                ? 'Please log in with Internet Identity to access your music collection.'
                : 'Create your first music album in the admin panel to start building your collection!'
              }
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
          title="Music"
        >
          <Music className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden z-[3100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Music Collection
            <Badge variant="outline" className="ml-2">
              {allSongs.length} songs
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[600px]">
          {/* Albums Sidebar */}
          <div className="w-1/3 border-r border-border pr-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Disc className="h-4 w-4" />
              Albums ({musicAlbums.length})
            </h3>
            <ScrollArea className="h-[550px]">
              <div className="space-y-2">
                <Button
                  variant={selectedAlbum === null ? "default" : "ghost"}
                  className="w-full justify-start h-auto p-3"
                  onClick={() => setSelectedAlbum(null)}
                >
                  <div className="text-left">
                    <div className="font-medium">All Songs</div>
                    <div className="text-xs text-muted-foreground">
                      {allSongs.length} tracks
                    </div>
                  </div>
                </Button>
                
                {musicAlbums.map((album) => (
                  <Button
                    key={album.title}
                    variant={selectedAlbum?.title === album.title ? "default" : "ghost"}
                    className="w-full justify-start h-auto p-3"
                    onClick={() => setSelectedAlbum(album)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{album.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {album.songs.length} tracks
                      </div>
                      {album.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {album.description}
                        </div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Songs List */}
          <div className="flex-1 pl-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Music className="h-4 w-4" />
                {selectedAlbum ? selectedAlbum.title : 'All Songs'}
              </h3>
              {selectedAlbum && (
                <Badge variant="outline">
                  {selectedAlbum.songs.length} tracks
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[550px]">
              <div className="space-y-1">
                {(selectedAlbum ? selectedAlbum.songs.map(song => ({ ...song, albumTitle: selectedAlbum.title })) : allSongs).map((song, index) => (
                  <Card
                    key={`${song.albumTitle}-${song.filePath}-${index}`}
                    className={`cursor-pointer transition-all hover:bg-muted/50 ${
                      isCurrentlyPlaying(song) ? 'bg-primary/10 border-primary/30' : ''
                    }`}
                    onClick={() => handleSongClick(song)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Play/Pause Icon */}
                        <div className="flex-shrink-0">
                          {isCurrentlyPlaying(song) ? (
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <Volume2 className="h-4 w-4 text-primary" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors">
                              <Play className="h-4 w-4 ml-0.5" />
                            </div>
                          )}
                        </div>

                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {song.title || 'Untitled'}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {song.artist && (
                              <>
                                <User className="h-3 w-3" />
                                <span className="truncate">{song.artist}</span>
                              </>
                            )}
                            {song.artist && song.albumTitle && <span>•</span>}
                            {song.albumTitle && (
                              <>
                                <Disc className="h-3 w-3" />
                                <span className="truncate">{song.albumTitle}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="flex-shrink-0 text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(song.filePath)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(selectedAlbum ? selectedAlbum.songs : allSongs).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No songs in this {selectedAlbum ? 'album' : 'collection'}</p>
                    <p className="text-sm">Upload songs in the admin panel to get started!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer with current playing info */}
        {currentlyPlayingSong && (
          <>
            <Separator />
            <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Volume2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  Now Playing: {currentlyPlayingSong.title || 'Untitled'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentlyPlayingSong.artist || 'Unknown Artist'} • {currentlyPlayingSong.albumTitle}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
