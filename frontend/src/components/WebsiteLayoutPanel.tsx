import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Settings, Music, Map, Monitor, Globe2 } from 'lucide-react';
import { useGetWebsiteLayoutSettings, useSaveWebsiteLayoutPreferences } from '@/hooks/useQueries';

interface WebsiteLayoutPanelProps {
  onSettingsChange?: () => void;
}

export default function WebsiteLayoutPanel({ onSettingsChange }: WebsiteLayoutPanelProps) {
  const [open, setOpen] = useState(false);
  const { data: settings } = useGetWebsiteLayoutSettings();
  const { mutate: saveSettings, isPending } = useSaveWebsiteLayoutPreferences();

  const [showMusicPlayerBar, setShowMusicPlayerBar] = useState(true);
  const [defaultSearchPlace, setDefaultSearchPlace] = useState('');
  const [showAllTravelSpots, setShowAllTravelSpots] = useState(true);
  const [rippleSize, setRippleSize] = useState(0.5);
  const [cityFontSize, setCityFontSize] = useState(8.0);

  useEffect(() => {
    if (settings) {
      setShowMusicPlayerBar(settings.showMusicPlayerBar);
      setDefaultSearchPlace(settings.defaultSearchPlace);
      setShowAllTravelSpots(settings.showAllTravelSpots);
      setRippleSize(settings.rippleSize);
      setCityFontSize(settings.cityFontSize);
    }
  }, [settings]);

  const handleSave = () => {
    saveSettings(
      {
        showMusicPlayerBar,
        defaultSearchPlace,
        showAllTravelSpots,
        rippleSize,
        cityFontSize,
      },
      {
        onSuccess: () => {
          onSettingsChange?.();
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-sm"
          title="Global Control"
        >
          <Settings className="w-4 h-4 text-white/80" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[300px] w-[300px] bg-slate-900/95 border-white/15 backdrop-blur-xl text-white p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Globe2 className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white">Global Control</DialogTitle>
              <p className="text-[10px] text-white/40 mt-0.5">Display & map preferences</p>
            </div>
          </div>
        </DialogHeader>

        <Separator className="bg-white/10" />

        <div className="px-4 py-3 space-y-4">

          {/* Display Settings Section */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Monitor className="w-3 h-3 text-white/40" />
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Display</span>
            </div>
            <div className="space-y-2.5">
              {/* Music Player Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Music className="w-3 h-3 text-white/40" />
                  <Label className="text-xs text-white/70 cursor-pointer">Music Bar</Label>
                </div>
                <Switch
                  checked={showMusicPlayerBar}
                  onCheckedChange={setShowMusicPlayerBar}
                  className="scale-75 origin-right"
                />
              </div>

              {/* Show All Travel Spots */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Map className="w-3 h-3 text-white/40" />
                  <Label className="text-xs text-white/70 cursor-pointer">All Spots</Label>
                </div>
                <Switch
                  checked={showAllTravelSpots}
                  onCheckedChange={setShowAllTravelSpots}
                  className="scale-75 origin-right"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Map Settings Section */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Map className="w-3 h-3 text-white/40" />
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Map</span>
            </div>
            <div className="space-y-3">
              {/* Default Search Place */}
              <div className="space-y-1">
                <Label className="text-[10px] text-white/50">Default Location</Label>
                <Input
                  value={defaultSearchPlace}
                  onChange={(e) => setDefaultSearchPlace(e.target.value)}
                  placeholder="e.g. Tokyo"
                  className="h-7 text-xs bg-white/5 border-white/15 text-white placeholder:text-white/25 focus:border-white/30"
                />
              </div>

              {/* Ripple Size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-white/50">Ripple Size</Label>
                  <span className="text-[10px] text-white/40 tabular-nums">{rippleSize.toFixed(1)}</span>
                </div>
                <Slider
                  value={[rippleSize]}
                  onValueChange={([v]) => setRippleSize(v)}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* City Font Size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-white/50">City Labels</Label>
                  <span className="text-[10px] text-white/40 tabular-nums">{cityFontSize.toFixed(0)}px</span>
                </div>
                <Slider
                  value={[cityFontSize]}
                  onValueChange={([v]) => setCityFontSize(v)}
                  min={4}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* Footer */}
        <div className="px-4 py-3">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white border-0"
          >
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
