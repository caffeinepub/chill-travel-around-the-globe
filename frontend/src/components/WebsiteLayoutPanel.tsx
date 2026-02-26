import React, { useState, useEffect } from 'react';
import { Settings, Monitor, Map, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useGetWebsiteLayoutPreferences, useGetWebsiteLayoutSettings, useAddWebsiteLayoutSettings, useUpdateWebsiteLayoutSettings } from '@/hooks/useQueries';

export default function WebsiteLayoutPanel() {
  const { data: preferences } = useGetWebsiteLayoutPreferences();
  const { data: settings } = useGetWebsiteLayoutSettings();
  const addSettings = useAddWebsiteLayoutSettings();
  const updateSettings = useUpdateWebsiteLayoutSettings();

  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [defaultSearchPlace, setDefaultSearchPlace] = useState('');
  const [showAllTravelSpots, setShowAllTravelSpots] = useState(true);
  const [rippleSize, setRippleSize] = useState(0.5);
  const [cityFontSize, setCityFontSize] = useState(8.0);
  const [localTime, setLocalTime] = useState('');
  const [utcOffsetTime, setUtcOffsetTime] = useState('');

  // Load preferences into local state
  useEffect(() => {
    if (preferences) {
      setShowMusicPlayer(preferences.showMusicPlayer);
      setDefaultSearchPlace(preferences.defaultSearchPlace);
      setShowAllTravelSpots(preferences.showAllTravelSpots);
      if (preferences.rippleSize !== undefined) setRippleSize(preferences.rippleSize);
      if (preferences.cityFontSize !== undefined) setCityFontSize(preferences.cityFontSize);
    }
  }, [preferences]);

  // Update local time and UTC offset time every second
  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      setLocalTime(now.toLocaleTimeString());

      // Calculate UTC offset time for the default search place
      if (defaultSearchPlace) {
        try {
          const utcOffset = -now.getTimezoneOffset() / 60;
          const sign = utcOffset >= 0 ? '+' : '-';
          const absOffset = Math.abs(utcOffset);
          const hours = Math.floor(absOffset);
          const minutes = Math.round((absOffset - hours) * 60);
          const offsetStr = minutes > 0
            ? `UTC ${sign}${hours}:${minutes.toString().padStart(2, '0')}`
            : `UTC ${sign}${hours}`;
          setUtcOffsetTime(`${now.toLocaleTimeString()} (${offsetStr})`);
        } catch {
          setUtcOffsetTime(now.toLocaleTimeString());
        }
      } else {
        const utcOffset = -now.getTimezoneOffset() / 60;
        const sign = utcOffset >= 0 ? '+' : '-';
        const absOffset = Math.abs(utcOffset);
        const hours = Math.floor(absOffset);
        const minutes = Math.round((absOffset - hours) * 60);
        const offsetStr = minutes > 0
          ? `UTC ${sign}${hours}:${minutes.toString().padStart(2, '0')}`
          : `UTC ${sign}${hours}`;
        setUtcOffsetTime(`${now.toLocaleTimeString()} (${offsetStr})`);
      }
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [defaultSearchPlace]);

  const handleSave = async () => {
    try {
      if (settings) {
        await updateSettings.mutateAsync({
          showMusicPlayerBar: showMusicPlayer,
          defaultSearchPlace,
          showAllTravelSpots,
          rippleSize,
          cityFontSize,
        });
      } else {
        await addSettings.mutateAsync({
          showMusicPlayerBar: showMusicPlayer,
          defaultSearchPlace,
          showAllTravelSpots,
          rippleSize,
          cityFontSize,
        });
      }
      toast.success('Layout settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="map">
        <TabsList className="w-full">
          <TabsTrigger value="map" className="flex-1">
            <Map className="h-4 w-4 mr-1" />
            Map Settings
          </TabsTrigger>
          <TabsTrigger value="display" className="flex-1">
            <Monitor className="h-4 w-4 mr-1" />
            Display Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Map className="h-4 w-4" />
                Map Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultSearchPlace" className="text-sm">Default Search Place</Label>
                <Input
                  id="defaultSearchPlace"
                  placeholder="e.g. Paris, France"
                  value={defaultSearchPlace}
                  onChange={(e) => setDefaultSearchPlace(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  The map will center on this location by default
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Local Time
                </Label>
                <div className="text-sm font-mono bg-muted px-3 py-2 rounded">
                  {localTime || '--:--:--'}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">UTC Offset Time</Label>
                <div className="text-sm font-mono bg-muted px-3 py-2 rounded">
                  {utcOffsetTime || '--:--:--'}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Ripple Size: {rippleSize.toFixed(2)}</Label>
                <Slider
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  value={[rippleSize]}
                  onValueChange={([val]) => setRippleSize(val)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">City Font Size: {cityFontSize.toFixed(1)}</Label>
                <Slider
                  min={4}
                  max={20}
                  step={0.5}
                  value={[cityFontSize]}
                  onValueChange={([val]) => setCityFontSize(val)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Display Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Show Music Player</Label>
                  <p className="text-xs text-muted-foreground">Display the music player bar</p>
                </div>
                <Switch
                  checked={showMusicPlayer}
                  onCheckedChange={setShowMusicPlayer}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Show All Travel Spots</Label>
                  <p className="text-xs text-muted-foreground">Display all travel spots on the map</p>
                </div>
                <Switch
                  checked={showAllTravelSpots}
                  onCheckedChange={setShowAllTravelSpots}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button
        onClick={handleSave}
        className="w-full"
        disabled={addSettings.isPending || updateSettings.isPending}
      >
        <Settings className="h-4 w-4 mr-2" />
        {(addSettings.isPending || updateSettings.isPending) ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
