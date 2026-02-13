import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Music, Map, Loader2, Save, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useGetWebsiteLayoutPreferences, useAddWebsiteLayoutSettings, useUpdateWebsiteLayoutSettings } from '@/hooks/useQueries';

export default function WebsiteLayoutPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [defaultSearchPlace, setDefaultSearchPlace] = useState('');
  const [showAllTravelSpots, setShowAllTravelSpots] = useState(false);
  const [rippleSize, setRippleSize] = useState(0.5);
  const [cityFontSize, setCityFontSize] = useState(8);
  const [localTime, setLocalTime] = useState('');

  const { data: layoutPreferences, isLoading } = useGetWebsiteLayoutPreferences();
  const addSettings = useAddWebsiteLayoutSettings();
  const updateSettings = useUpdateWebsiteLayoutSettings();

  // Load preferences when data is available
  useEffect(() => {
    if (layoutPreferences) {
      setShowMusicPlayer(layoutPreferences.showMusicPlayer);
      setDefaultSearchPlace(layoutPreferences.defaultSearchPlace);
      setShowAllTravelSpots(layoutPreferences.showAllTravelSpots);
      setRippleSize(layoutPreferences.rippleSize || 0.5);
      setCityFontSize(layoutPreferences.cityFontSize || 8);
    }
  }, [layoutPreferences]);

  // Update local time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    if (!defaultSearchPlace.trim()) {
      toast.error('Please enter a default search place');
      return;
    }

    try {
      const settings = {
        showMusicPlayerBar: showMusicPlayer,
        defaultSearchPlace: defaultSearchPlace.trim(),
        showAllTravelSpots,
        rippleSize,
        cityFontSize
      };

      if (layoutPreferences) {
        await updateSettings.mutateAsync(settings);
        toast.success('Settings updated successfully');
      } else {
        await addSettings.mutateAsync(settings);
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[3100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Website Layout Settings
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="map" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="map">
                <Map className="h-4 w-4 mr-2" />
                Map Settings
              </TabsTrigger>
              <TabsTrigger value="display">
                <Settings className="h-4 w-4 mr-2" />
                Display Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Default Search Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultSearchPlace">City or Country</Label>
                    <Input
                      id="defaultSearchPlace"
                      type="text"
                      placeholder="e.g., Hong Kong, Paris, Tokyo"
                      value={defaultSearchPlace}
                      onChange={(e) => setDefaultSearchPlace(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This location will be used as the starting point for 3D globe animations and as the default search when switching to 2D map view.
                    </p>
                  </div>

                  {defaultSearchPlace && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Local Time: {defaultSearchPlace}</p>
                        <p className="text-xs text-muted-foreground">{localTime}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">3D Globe Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rippleSize">Ripple Effect Size</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="rippleSize"
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={rippleSize}
                        onChange={(e) => setRippleSize(parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12 text-right">{rippleSize.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adjust the size of the ripple effect that appears on cities in the 3D globe view.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cityFontSize">City Label Font Size</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="cityFontSize"
                        type="range"
                        min="4"
                        max="16"
                        step="0.5"
                        value={cityFontSize}
                        onChange={(e) => setCityFontSize(parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12 text-right">{cityFontSize.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adjust the font size of city labels displayed on the 3D globe.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="display" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Music Player</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="showMusicPlayer">Show Music Player Bar</Label>
                      <p className="text-xs text-muted-foreground">
                        Display the music player bar at the bottom of the screen
                      </p>
                    </div>
                    <Switch
                      id="showMusicPlayer"
                      checked={showMusicPlayer}
                      onCheckedChange={setShowMusicPlayer}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Travel Spots Display</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="showAllTravelSpots">Show All Travel Spots on Map</Label>
                      <p className="text-xs text-muted-foreground">
                        Display travel spots from all cities on the 2D map view
                      </p>
                    </div>
                    <Switch
                      id="showAllTravelSpots"
                      checked={showAllTravelSpots}
                      onCheckedChange={setShowAllTravelSpots}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={addSettings.isPending || updateSettings.isPending}>
            {(addSettings.isPending || updateSettings.isPending) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
