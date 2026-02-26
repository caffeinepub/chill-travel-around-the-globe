import React, { useState } from 'react';
import { BookMarked, MapPin, Star, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useGetAllCitiesWithRatingsAndTravelSpots } from '@/hooks/useQueries';
import type { TravelSpot } from '@/backend';

interface CityloguePanelProps {
  onTravelSpotFocus?: (spot: TravelSpot) => void;
}

const SPOT_TYPE_COLORS: Record<string, string> = {
  City: 'bg-blue-100 text-blue-700',
  Hotel: 'bg-orange-100 text-orange-700',
  Restaurant: 'bg-red-100 text-red-700',
  Shopping: 'bg-yellow-100 text-yellow-700',
  Heritage: 'bg-purple-100 text-purple-700',
  Relax: 'bg-green-100 text-green-700',
  Beach: 'bg-cyan-100 text-cyan-700',
  Transport: 'bg-amber-100 text-amber-700',
  Airport: 'bg-sky-100 text-sky-700',
  Others: 'bg-gray-100 text-gray-700',
};

export default function CityloguePanel({ onTravelSpotFocus }: CityloguePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  const { data: citiesData = [], isLoading } = useGetAllCitiesWithRatingsAndTravelSpots();

  const toggleCity = (city: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) {
        next.delete(city);
      } else {
        next.add(city);
      }
      return next;
    });
  };

  const handleSpotClick = (spot: TravelSpot) => {
    onTravelSpotFocus?.(spot);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
          title="Citylogue"
        >
          <BookMarked className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            Citylogue
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : citiesData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">🏙️</div>
              <p className="text-muted-foreground">No cities with ratings yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add city ratings in the Admin Panel to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {citiesData.map(([city, rating, spots]) => (
                <Collapsible
                  key={city}
                  open={expandedCities.has(city)}
                  onOpenChange={() => toggleCity(city)}
                >
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/40 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-medium text-sm">{city}</span>
                            {rating !== null && (
                              <div className="flex items-center gap-1 text-xs text-amber-600">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {spots.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {spots.length} spot{spots.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {expandedCities.has(city) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {spots.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3 ml-4">
                        No travel spots for this city yet.
                      </p>
                    ) : (
                      <div className="ml-4 mt-1 space-y-1">
                        {spots.map((spot, idx) => (
                          <Card
                            key={`${spot.name}-${idx}`}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleSpotClick(spot)}
                          >
                            <CardContent className="p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate block">
                                    {spot.name}
                                  </span>
                                  {spot.description && (
                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                      {spot.description}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {spot.rating > 0 && (
                                    <div className="flex items-center gap-0.5 text-xs text-amber-600">
                                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                      <span>{spot.rating.toFixed(1)}</span>
                                    </div>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${SPOT_TYPE_COLORS[spot.spotType] || SPOT_TYPE_COLORS.Others}`}
                                  >
                                    {spot.spotType}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
