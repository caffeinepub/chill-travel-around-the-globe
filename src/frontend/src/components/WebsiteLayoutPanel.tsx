import React, { useState, useEffect } from 'react';
import { Settings, Monitor, Map, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useGetWebsiteLayoutPreferences, useSaveWebsiteLayoutPreferences } from '@/hooks/useQueries';

export default function WebsiteLayoutPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [localTime, setLocalTime] = useState<string>('');

  const { data: layoutPreferences } = useGetWebsiteLayoutPreferences();
  const saveLayoutPreferences = useSaveWebsiteLayoutPreferences();

  // Update local time every second
  useEffect(() => {
    const updateLocalTime = () => {
      const now = new Date();
      const formattedTime = now.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      setLocalTime(formattedTime);
    };

    updateLocalTime();
    const interval = setInterval(updateLocalTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleMusicPlayerToggle = async (enabled: boolean) => {
    try {
      await saveLayoutPreferences.mutateAsync({
        showMusicPlayer: enabled
      });
      toast.success(`Music player ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error saving layout preferences:', error);
      toast.error('Failed to save layout preferences');
    }
  };

  const handleDefaultSearchPlaceChange = async (defaultSearchPlace: string) => {
    if (!defaultSearchPlace.trim()) {
      toast.error('Please enter a valid location');
      return;
    }

    try {
      await saveLayoutPreferences.mutateAsync({
        defaultSearchPlace: defaultSearchPlace.trim()
      });
      
      toast.success('Default search place updated successfully!');
    } catch (error) {
      console.error('Error saving default search place:', error);
      toast.error('Failed to save default search place');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
          title="Website Layout"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto z-[3100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Website Layout
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Control the appearance and behavior of website features
            </p>
          </div>

          {/* Website Layout Tabs - Theme removed, only Map Settings and Display Settings */}
          <Tabs defaultValue="map" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="map" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Map Settings
              </TabsTrigger>
              <TabsTrigger value="display" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Display Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Map Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="default-search-place" className="text-base font-medium">
                        Default Search Place
                      </Label>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        id="default-search-place"
                        type="text"
                        placeholder="e.g., Hong Kong, New York, Tokyo"
                        defaultValue={layoutPreferences?.defaultSearchPlace || 'Hong Kong'}
                        disabled={saveLayoutPreferences.isPending}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleDefaultSearchPlaceChange(e.currentTarget.value);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          if (input) {
                            handleDefaultSearchPlaceChange(input.value);
                          }
                        }}
                        disabled={saveLayoutPreferences.isPending}
                      >
                        {saveLayoutPreferences.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Current default search place: <strong>{layoutPreferences?.defaultSearchPlace || 'Hong Kong'}</strong>
                      <br />
                      Local time: <strong>{localTime}</strong>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="display" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Display Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="music-player-toggle" className="text-base font-medium">
                        Music Player Bar
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Show or hide the music player bar at the bottom of the website
                      </p>
                    </div>
                    <Switch
                      id="music-player-toggle"
                      checked={layoutPreferences?.showMusicPlayer !== false}
                      onCheckedChange={handleMusicPlayerToggle}
                      disabled={saveLayoutPreferences.isPending}
                    />
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Changes take effect immediately. The music player bar will be {layoutPreferences?.showMusicPlayer !== false ? 'visible' : 'hidden'} 
                      when you have uploaded songs to your Music Album.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

