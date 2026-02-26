import React, { useState, useRef } from 'react';
import { Plus, Trash2, Music, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useGetAllMusicAlbums, useAddMusicAlbum, useDeleteMusicAlbum, useAddSongToMusicAlbum, useRemoveSongFromMusicAlbum } from '@/hooks/useQueries';
import { useFileUpload, useFileUrl, useFileDelete } from '@/blob-storage/FileStorage';
import { Song } from '@/backend';

interface SongDisplayProps {
  song: Song;
  onDelete: (songTitle: string) => void;
}

function SongDisplay({ song, onDelete }: SongDisplayProps) {
  const { data: url } = useFileUrl(song.filePath);

  return (
    <div className="flex items-center gap-3 p-2 bg-muted rounded">
      <Music className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{song.title || 'Untitled'}</p>
        {song.artist && <p className="text-xs text-muted-foreground truncate">{song.artist}</p>}
        {url && (
          <audio src={url} controls className="w-full mt-1 h-8" />
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
        onClick={() => onDelete(song.title || '')}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function MusicAlbumManager() {
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [openAlbums, setOpenAlbums] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const { data: albums = [], isLoading } = useGetAllMusicAlbums();
  const addAlbum = useAddMusicAlbum();
  const deleteAlbum = useDeleteMusicAlbum();
  const addSong = useAddSongToMusicAlbum();
  const removeSong = useRemoveSongFromMusicAlbum();
  const { uploadFile, isUploading } = useFileUpload();
  const { deleteFile } = useFileDelete();

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) {
      toast.error('Please enter an album title');
      return;
    }

    try {
      await addAlbum.mutateAsync({
        title: newAlbumTitle.trim(),
        description: newAlbumDescription.trim(),
        songs: []
      });
      setNewAlbumTitle('');
      setNewAlbumDescription('');
      toast.success('Album created successfully');
    } catch (error) {
      console.error('Error creating album:', error);
      toast.error('Failed to create album');
    }
  };

  const handleDeleteAlbum = async (albumTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${albumTitle}"?`)) return;

    try {
      const success = await deleteAlbum.mutateAsync(albumTitle);
      if (success) {
        toast.success('Album deleted successfully');
        if (selectedAlbum === albumTitle) {
          setSelectedAlbum(null);
        }
      } else {
        toast.error('Failed to delete album');
      }
    } catch (error) {
      console.error('Error deleting album:', error);
      toast.error('Failed to delete album');
    }
  };

  const handleUploadSong = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAlbum) return;

    try {
      const filePath = `music/${selectedAlbum}/${Date.now()}-${file.name}`;
      await uploadFile(filePath, file);

      const song: Song = {
        title: songTitle.trim() || file.name.replace(/\.[^/.]+$/, ''),
        artist: songArtist.trim() || undefined,
        album: selectedAlbum,
        filePath,
        uploadedAt: BigInt(Date.now() * 1000000),
      };

      await addSong.mutateAsync({
        title: selectedAlbum,
        song
      });

      setSongTitle('');
      setSongArtist('');
      toast.success('Song uploaded successfully');
    } catch (error) {
      console.error('Error uploading song:', error);
      toast.error('Failed to upload song');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedAlbum) return;

    let successCount = 0;
    let failCount = 0;

    for (const file of Array.from(files)) {
      try {
        const filePath = `music/${selectedAlbum}/${Date.now()}-${file.name}`;
        await uploadFile(filePath, file);

        const song: Song = {
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: undefined,
          album: selectedAlbum,
          filePath,
          uploadedAt: BigInt(Date.now() * 1000000),
        };

        await addSong.mutateAsync({
          title: selectedAlbum,
          song
        });

        successCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} song(s) uploaded successfully`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} song(s) failed to upload`);
    }

    if (batchFileInputRef.current) {
      batchFileInputRef.current.value = '';
    }
  };

  const handleDeleteSong = async (albumTitle: string, songTitleToDelete: string) => {
    if (!confirm('Are you sure you want to delete this song?')) return;

    try {
      const success = await removeSong.mutateAsync({
        title: albumTitle,
        songTitle: songTitleToDelete
      });
      if (success) {
        toast.success('Song deleted successfully');
      } else {
        toast.error('Failed to delete song');
      }
    } catch (error) {
      console.error('Error deleting song:', error);
      toast.error('Failed to delete song');
    }
  };

  const toggleAlbum = (albumTitle: string) => {
    setOpenAlbums(prev =>
      prev.includes(albumTitle)
        ? prev.filter(t => t !== albumTitle)
        : [...prev, albumTitle]
    );
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading music albums...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Create New Album */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Create New Album</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAlbum} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="albumTitle" className="text-xs">Album Title *</Label>
              <Input
                id="albumTitle"
                placeholder="e.g. Paris Vibes"
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                className="text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="albumDescription" className="text-xs">Description</Label>
              <Input
                id="albumDescription"
                placeholder="Optional description"
                value={newAlbumDescription}
                onChange={(e) => setNewAlbumDescription(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={addAlbum.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              {addAlbum.isPending ? 'Creating...' : 'Create Album'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Albums List */}
      {albums.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No music albums yet. Create your first album!
        </p>
      ) : (
        <div className="space-y-3">
          {albums.map((album) => (
            <Collapsible
              key={album.title}
              open={openAlbums.includes(album.title)}
              onOpenChange={() => toggleAlbum(album.title)}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-sm">{album.title}</p>
                          {album.description && (
                            <p className="text-xs text-muted-foreground">{album.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {album.songs.length} songs
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAlbum(album.title);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {openAlbums.includes(album.title) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    {/* Upload Song */}
                    <div className="space-y-2 border rounded p-3">
                      <p className="text-xs font-medium">Add Song</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Song title (optional)"
                          value={selectedAlbum === album.title ? songTitle : ''}
                          onChange={(e) => {
                            setSelectedAlbum(album.title);
                            setSongTitle(e.target.value);
                          }}
                          className="text-xs"
                        />
                        <Input
                          placeholder="Artist (optional)"
                          value={selectedAlbum === album.title ? songArtist : ''}
                          onChange={(e) => {
                            setSelectedAlbum(album.title);
                            setSongArtist(e.target.value);
                          }}
                          className="text-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={handleUploadSong}
                          className="hidden"
                        />
                        <input
                          ref={batchFileInputRef}
                          type="file"
                          accept="audio/*"
                          multiple
                          onChange={handleBatchUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => {
                            setSelectedAlbum(album.title);
                            fileInputRef.current?.click();
                          }}
                          disabled={isUploading}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Single
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => {
                            setSelectedAlbum(album.title);
                            batchFileInputRef.current?.click();
                          }}
                          disabled={isUploading}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Batch
                        </Button>
                      </div>
                    </div>

                    {/* Songs List */}
                    {album.songs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No songs yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {album.songs.map((song, index) => (
                          <SongDisplay
                            key={index}
                            song={song}
                            onDelete={(st) => handleDeleteSong(album.title, st)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
