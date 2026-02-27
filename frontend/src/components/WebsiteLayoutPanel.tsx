import React, { useState, useEffect } from 'react';
import { Settings2, Monitor, Map } from 'lucide-react';
import { useGetWebsiteLayoutPreferences, useSaveWebsiteLayoutPreferences, WebsiteLayoutPreferences } from '../hooks/useQueries';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

interface WebsiteLayoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WebsiteLayoutPanel({ isOpen, onClose }: WebsiteLayoutPanelProps) {
  const { data: layoutPreferences, isLoading } = useGetWebsiteLayoutPreferences();
  const savePreferences = useSaveWebsiteLayoutPreferences();

  const [localPrefs, setLocalPrefs] = useState<WebsiteLayoutPreferences>({
    showMusicPlayer: true,
    defaultSearchPlace: '',
    showAllTravelSpots: true,
    rippleSize: 0.5,
    cityFontSize: 8.0,
  });

  useEffect(() => {
    if (layoutPreferences) {
      setLocalPrefs({
        showMusicPlayer: layoutPreferences.showMusicPlayer,
        defaultSearchPlace: layoutPreferences.defaultSearchPlace,
        showAllTravelSpots: layoutPreferences.showAllTravelSpots,
        rippleSize: layoutPreferences.rippleSize,
        cityFontSize: layoutPreferences.cityFontSize,
      });
    }
  }, [layoutPreferences]);

  const handleToggleMusicPlayer = async (enabled: boolean) => {
    const updated: WebsiteLayoutPreferences = {
      ...localPrefs,
      showMusicPlayer: enabled,
    };
    setLocalPrefs(updated);
    await savePreferences.mutateAsync(updated);
  };

  const handleSave = async () => {
    const updated: WebsiteLayoutPreferences = {
      ...localPrefs,
      showMusicPlayer: localPrefs.showMusicPlayer,
    };
    await savePreferences.mutateAsync(updated);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-base">Website Layout Settings</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-16">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="map">
          <TabsList className="w-full">
            <TabsTrigger value="map" className="flex-1">
              <Map className="h-4 w-4 mr-1" /> Map Settings
            </TabsTrigger>
            <TabsTrigger value="display" className="flex-1">
              <Monitor className="h-4 w-4 mr-1" /> Display Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="defaultSearch" className="text-sm font-medium">Default Search Place</Label>
              <Input
                id="defaultSearch"
                value={localPrefs.defaultSearchPlace}
                onChange={(e) => setLocalPrefs(prev => ({ ...prev, defaultSearchPlace: e.target.value }))}
                placeholder="e.g. Tokyo, Japan"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">The location to show when the map first loads.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Ripple Size: {localPrefs.rippleSize.toFixed(1)}</Label>
              <Slider
                min={0.1}
                max={2.0}
                step={0.1}
                value={[localPrefs.rippleSize]}
                onValueChange={([val]) => setLocalPrefs(prev => ({ ...prev, rippleSize: val }))}
              />
              <p className="text-xs text-muted-foreground">Controls the size of the ripple animation on city markers.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">City Font Size: {localPrefs.cityFontSize.toFixed(1)}px</Label>
              <Slider
                min={6}
                max={20}
                step={0.5}
                value={[localPrefs.cityFontSize]}
                onValueChange={([val]) => setLocalPrefs(prev => ({ ...prev, cityFontSize: val }))}
              />
              <p className="text-xs text-muted-foreground">Controls the font size of city labels on the 3D globe.</p>
            </div>
          </TabsContent>

          <TabsContent value="display" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Show Music Player</Label>
                <p className="text-xs text-muted-foreground">Display the music player bar at the bottom.</p>
              </div>
              <Switch
                checked={localPrefs.showMusicPlayer}
                onCheckedChange={handleToggleMusicPlayer}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Show All Travel Spots</Label>
                <p className="text-xs text-muted-foreground">Display all travel spots on the map by default.</p>
              </div>
              <Switch
                checked={localPrefs.showAllTravelSpots}
                onCheckedChange={(val) => setLocalPrefs(prev => ({ ...prev, showAllTravelSpots: val }))}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={savePreferences.isPending} className="flex-1" size="sm">
          {savePreferences.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button onClick={onClose} variant="outline" size="sm">Cancel</Button>
      </div>
    </div>
  );
}
