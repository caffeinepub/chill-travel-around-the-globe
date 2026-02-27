import { useState } from 'react';
import { Music, Plus, Upload, Play, Pause, Volume2, SkipBack, SkipForward, Trash2, Edit, Search, Filter, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useFileUpload } from '@/blob-storage/FileStorage';
import { useGetAllMusicAlbums, useAddMusicAlbum, useUpdateMusicAlbum, useDeleteMusicAlbum, useAddSongToMusicAlbum, useRemoveSongFromMusicAlbum } from '@/hooks/useQueries';
import { MusicAlbum, Song, MediaType } from '@/backend';

interface MusicAlbumFormData {
  title: string;
  description: string;
}

interface SongFormData {
  title: string;
  artist: string;
  album: string;
}

export default function MusicAlbumManager() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  
  const [isAlbumDialogOpen, setIsAlbumDialogOpen] = useState(false);
  const [isSongDialogOpen, setIsSongDialogOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<MusicAlbum | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [albumForm, setAlbumForm] = useState<MusicAlbumFormData>({
    title: '',
    description: ''
  });
  const [songForm, setSongForm] = useState<SongFormData>({
    title: '',
    artist: '',
    album: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // File upload hook
  const { uploadFile, isUploading } = useFileUpload();

  // Music album queries and mutations
  const { data: musicAlbums = [], refetch: refetchMusicAlbums } = useGetAllMusicAlbums();
  const addMusicAlbum = useAddMusicAlbum();
  const updateMusicAlbum = useUpdateMusicAlbum();
  const deleteMusicAlbum = useDeleteMusicAlbum();
  const addSongToAlbum = useAddSongToMusicAlbum();
  const removeSongFromAlbum = useRemoveSongFromMusicAlbum();

  const handleAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!albumForm.title.trim()) {
      toast.error('Please enter an album title');
      return;
    }

    try {
      if (editingAlbum) {
        const success = await updateMusicAlbum.mutateAsync({
          title: editingAlbum.title,
          description: albumForm.description.trim(),
          songs: editingAlbum.songs
        });
        
        if (success) {
          toast.success('Music album updated successfully!');
        } else {
          toast.error('Failed to update music album');
          return;
        }
      } else {
        await addMusicAlbum.mutateAsync({
          title: albumForm.title.trim(),
          description: albumForm.description.trim(),
          songs: []
        });
        
        toast.success('Music album created successfully!');
      }

      // Reset form and close dialog
      setAlbumForm({ title: '', description: '' });
      setEditingAlbum(null);
      setIsAlbumDialogOpen(false);
      
      // Refetch data
      refetchMusicAlbums();
    } catch (error) {
      console.error('Error saving music album:', error);
      toast.error('Failed to save music album');
    }
  };

  const handleSongUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAlbum) {
      toast.error('Please select an album');
      return;
    }

    const files = selectedFiles;
    if (!files || files.length === 0) {
      toast.error('Please select at least one audio file');
      return;
    }

    // Validate file types
    const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac'];
    const invalidFiles = Array.from(files).filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast.error('Please select only valid audio files (MP3, WAV, FLAC, AAC)');
      return;
    }

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Upload file
        const songPath = `music/${selectedAlbum}/${file.name}`;
        const { path } = await uploadFile(songPath, file);
        
        // Create song object with optional title and artist
        const song: Song = {
          title: songForm.title.trim() || undefined,
          artist: songForm.artist.trim() || undefined,
          album: songForm.album.trim() || selectedAlbum,
          filePath: path,
          uploadedAt: BigInt(Date.now() * 1000000)
        };

        // Add song to album
        return addSongToAlbum.mutateAsync({
          title: selectedAlbum,
          song
        });
      });

      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(Boolean).length;

      if (successCount === files.length) {
        toast.success(`${successCount} song${successCount > 1 ? 's' : ''} uploaded successfully!`);
      } else {
        toast.error(`Only ${successCount} of ${files.length} songs uploaded successfully`);
      }
      
      // Reset form
      setSongForm({ title: '', artist: '', album: '' });
      setSelectedFiles(null);
      setIsSongDialogOpen(false);
      
      // Clear file input
      const fileInput = document.getElementById('songFiles') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Refetch data
      refetchMusicAlbums();
    } catch (error) {
      console.error('Error uploading songs:', error);
      toast.error('Failed to upload songs');
    }
  };

  const handleEditAlbum = (album: MusicAlbum) => {
    setEditingAlbum(album);
    setAlbumForm({
      title: album.title,
      description: album.description
    });
    setIsAlbumDialogOpen(true);
  };

  const handleDeleteAlbum = async (title: string) => {
    if (!confirm('Are you sure you want to delete this music album? This will also delete all songs in the album.')) {
      return;
    }

    try {
      const success = await deleteMusicAlbum.mutateAsync(title);
      if (success) {
        toast.success('Music album deleted successfully!');
        refetchMusicAlbums();
      } else {
        toast.error('Failed to delete music album');
      }
    } catch (error) {
      console.error('Error deleting music album:', error);
      toast.error('Failed to delete music album');
    }
  };

  const handleDeleteSong = async (albumTitle: string, songTitle: string) => {
    if (!confirm('Are you sure you want to delete this song?')) {
      return;
    }

    try {
      const success = await removeSongFromAlbum.mutateAsync({
        title: albumTitle,
        songTitle: songTitle || 'Untitled'
      });
      
      if (success) {
        toast.success('Song deleted successfully!');
        refetchMusicAlbums();
      } else {
        toast.error('Failed to delete song');
      }
    } catch (error) {
      console.error('Error deleting song:', error);
      toast.error('Failed to delete song');
    }
  };

  const resetAlbumForm = () => {
    setAlbumForm({ title: '', description: '' });
    setEditingAlbum(null);
  };

  const resetSongForm = () => {
    setSongForm({ title: '', artist: '', album: '' });
    setSelectedAlbum('');
    setSelectedFiles(null);
  };

  const handleCreateAlbumClick = () => {
    resetAlbumForm();
    setIsAlbumDialogOpen(true);
  };

  const handleUploadSongClick = () => {
    resetSongForm();
    setIsSongDialogOpen(true);
  };

  const handleAlbumDialogOpenChange = (open: boolean) => {
    setIsAlbumDialogOpen(open);
    if (!open) {
      // Reset form when dialog closes
      setTimeout(() => {
        resetAlbumForm();
      }, 100);
    }
  };

  const handleSongDialogOpenChange = (open: boolean) => {
    setIsSongDialogOpen(open);
    if (!open) {
      // Reset form when dialog closes
      setTimeout(() => {
        resetSongForm();
      }, 100);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  // Filter albums and songs based on search term
  const filteredAlbums = musicAlbums.filter(album =>
    album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    album.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    album.songs.some(song => 
      (song.title && song.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (song.artist && song.artist.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const totalSongs = musicAlbums.reduce((total, album) => total + album.songs.length, 0);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
        <p className="text-muted-foreground mb-4">
          Please log in with Internet Identity to access Music Album features.
        </p>
        <p className="text-sm text-muted-foreground">
          You need to be authenticated to upload songs and manage your music collection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-md font-semibold">Music Album</h4>
          <p className="text-sm text-muted-foreground">
            Upload and organize your personal music collection
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleUploadSongClick}
            className="flex items-center gap-2"
            disabled={musicAlbums.length === 0}
          >
            <Upload className="h-4 w-4" />
            Upload Songs
          </Button>

          <Button 
            onClick={handleCreateAlbumClick}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Album
          </Button>
        </div>
      </div>

      <Alert>
        <Music className="h-4 w-4" />
        <AlertDescription>
          Create albums to organize your music collection. Upload multiple songs at once in MP3, WAV, FLAC, or AAC format.
          Song title and artist fields are optional. Use the music player bar at the bottom to control playback.
        </AlertDescription>
      </Alert>

      {/* Search and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search albums and songs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{musicAlbums.length} albums</span>
          <span>{totalSongs} songs</span>
        </div>
      </div>

      {/* Music Albums */}
      <div className="space-y-4">
        {filteredAlbums.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Music className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {musicAlbums.length === 0 ? 'No music albums yet' : 'No albums match your search'}
            </p>
            <p className="text-sm">
              {musicAlbums.length === 0 
                ? 'Create your first album to start building your music collection!'
                : 'Try adjusting your search terms'
              }
            </p>
          </div>
        ) : (
          filteredAlbums.map((album) => (
            <Card key={album.title}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5 text-primary" />
                      {album.title}
                    </CardTitle>
                    {album.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {album.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {album.songs.length} songs
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditAlbum(album)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteAlbum(album.title)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {album.songs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No songs in this album yet</p>
                    <p className="text-sm">Upload your first song to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {album.songs.map((song, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-medium">{song.title || 'Untitled'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {song.artist || 'Unknown Artist'} • {song.album}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(Number(song.uploadedAt) / 1000000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSong(album.title, song.title || 'Untitled')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Song Upload Dialog */}
      <Dialog open={isSongDialogOpen} onOpenChange={handleSongDialogOpenChange}>
        <DialogContent className="sm:max-w-md z-[3200]">
          <DialogHeader>
            <DialogTitle>Upload Songs</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSongUpload} className="space-y-4">
            <div>
              <Label htmlFor="albumSelect">Select Album</Label>
              <select
                id="albumSelect"
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Choose an album...</option>
                {musicAlbums.map((album) => (
                  <option key={album.title} value={album.title}>
                    {album.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="songTitle">Song Title (Optional)</Label>
              <Input
                id="songTitle"
                type="text"
                placeholder="Enter song title (optional)"
                value={songForm.title}
                onChange={(e) => setSongForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="songArtist">Artist (Optional)</Label>
              <Input
                id="songArtist"
                type="text"
                placeholder="Enter artist name (optional)"
                value={songForm.artist}
                onChange={(e) => setSongForm(prev => ({ ...prev, artist: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="songAlbumName">Album Name (Optional)</Label>
              <Input
                id="songAlbumName"
                type="text"
                placeholder="Leave empty to use selected album"
                value={songForm.album}
                onChange={(e) => setSongForm(prev => ({ ...prev, album: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="songFiles">Audio Files</Label>
              <Input
                id="songFiles"
                type="file"
                accept="audio/mp3,audio/mpeg,audio/wav,audio/flac,audio/aac"
                multiple
                onChange={handleFileChange}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported formats: MP3, WAV, FLAC, AAC. You can select multiple files for batch upload.
              </p>
              {selectedFiles && selectedFiles.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSongDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || addSongToAlbum.isPending}
              >
                {isUploading || addSongToAlbum.isPending ? 'Uploading...' : 'Upload Songs'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Album Creation Dialog */}
      <Dialog open={isAlbumDialogOpen} onOpenChange={handleAlbumDialogOpenChange}>
        <DialogContent className="sm:max-w-md z-[3200]">
          <DialogHeader>
            <DialogTitle>
              {editingAlbum ? 'Edit Music Album' : 'Create New Album'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAlbumSubmit} className="space-y-4">
            <div>
              <Label htmlFor="albumTitle">Album Title</Label>
              <Input
                id="albumTitle"
                type="text"
                placeholder="Enter album title"
                value={albumForm.title}
                onChange={(e) => setAlbumForm(prev => ({ ...prev, title: e.target.value }))}
                disabled={!!editingAlbum}
                required
              />
            </div>

            <div>
              <Label htmlFor="albumDescription">Description</Label>
              <Textarea
                id="albumDescription"
                placeholder="Describe your music album..."
                value={albumForm.description}
                onChange={(e) => setAlbumForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAlbumDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMusicAlbum.isPending || updateMusicAlbum.isPending}
              >
                {addMusicAlbum.isPending || updateMusicAlbum.isPending
                  ? 'Saving...'
                  : editingAlbum
                  ? 'Update Album'
                  : 'Create Album'
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
