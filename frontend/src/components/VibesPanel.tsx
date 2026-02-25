import React, { useState, useMemo } from 'react';
import { Sparkles, MapPin, Building2, Hotel, UtensilsCrossed, ShoppingBag, Landmark, Armchair, MoreHorizontal, Loader2, ChevronDown, ChevronRight, Star, Plane, Car, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useGetAllBookmarksAndTravelSpotsByCity, useGetAllTravelSpots } from '@/hooks/useQueries';
import { TravelSpot, VibeItem, MapBookmark } from '@/backend';

interface VibesPanelProps {
  onTravelSpotFocus?: (spot: TravelSpot) => void;
  onBookmarkFocus?: (bookmark: MapBookmark) => void;
}

// Extended VibeItem with spotType information
interface EnhancedVibeItem extends VibeItem {
  spotType?: string;
}

export default function VibesPanel({ onTravelSpotFocus, onBookmarkFocus }: VibesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // Data queries - use getAllBookmarksAndTravelSpotsByCity which properly combines everything
  const { data: vibesByCity = [], isLoading: vibesLoading } = useGetAllBookmarksAndTravelSpotsByCity();
  const { data: allTravelSpots = [], isLoading: spotsLoading } = useGetAllTravelSpots();

  // Create a map of travel spots by city and name for quick lookup
  const travelSpotMap = useMemo(() => {
    const map = new Map<string, TravelSpot>();
    allTravelSpots.forEach(spot => {
      const key = `${spot.city}|||${spot.name}`;
      map.set(key, spot);
    });
    return map;
  }, [allTravelSpots]);

  // Enhance vibes data with spotType information
  const enhancedVibesByCity = useMemo(() => {
    return vibesByCity.map(([city, items]) => {
      const enhancedItems: EnhancedVibeItem[] = items.map(item => {
        if (item.itemType !== 'Bookmark') {
          // For travel spots, get the spotType from the full travel spot data
          const key = `${item.city}|||${item.name}`;
          const travelSpot = travelSpotMap.get(key);
          return {
            ...item,
            spotType: travelSpot?.spotType || item.itemType
          };
        }
        return item;
      });
      return [city, enhancedItems] as [string, EnhancedVibeItem[]];
    });
  }, [vibesByCity, travelSpotMap]);

  // Get icon for item type
  const getItemTypeIcon = (item: EnhancedVibeItem) => {
    if (item.itemType === 'Bookmark') {
      return <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />;
    }
    
    // For travel spots, use the spot type
    const type = (item.spotType || item.itemType).toLowerCase();
    switch (type) {
      case 'hotel':
        return <Hotel className="h-4 w-4 text-orange-500" />;
      case 'restaurant':
        return <UtensilsCrossed className="h-4 w-4 text-red-500" />;
      case 'shopping':
        return <ShoppingBag className="h-4 w-4 text-yellow-500" />;
      case 'heritage':
        return <Landmark className="h-4 w-4 text-purple-500" />;
      case 'relax':
        return <Armchair className="h-4 w-4 text-green-500" />;
      case 'city':
        return <Building2 className="h-4 w-4 text-blue-500" />;
      case 'airport':
        return <Plane className="h-4 w-4 text-blue-400" />;
      case 'transport':
        return <Car className="h-4 w-4 text-amber-800" />;
      case 'beach':
        return <Waves className="h-4 w-4 text-blue-900" />;
      default:
        return <MoreHorizontal className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get color for item type
  const getItemTypeColor = (item: EnhancedVibeItem) => {
    if (item.itemType === 'Bookmark') {
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
    
    // For travel spots, use the spot type
    const type = (item.spotType || item.itemType).toLowerCase();
    switch (type) {
      case 'hotel':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'restaurant':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'shopping':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'heritage':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'relax':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'city':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'airport':
        return 'bg-blue-100 text-blue-600 border-blue-300';
      case 'transport':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'beach':
        return 'bg-blue-100 text-blue-900 border-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Handle city expansion toggle
  const toggleCityExpansion = (city: string) => {
    const newExpanded = new Set(expandedCities);
    if (newExpanded.has(city)) {
      newExpanded.delete(city);
      // Also collapse all types for this city
      const newExpandedTypes = new Set(expandedTypes);
      Array.from(expandedTypes).forEach(key => {
        if (key.startsWith(`${city}-`)) {
          newExpandedTypes.delete(key);
        }
      });
      setExpandedTypes(newExpandedTypes);
    } else {
      newExpanded.add(city);
    }
    setExpandedCities(newExpanded);
  };

  // Handle type expansion toggle
  const toggleTypeExpansion = (city: string, type: string) => {
    const key = `${city}-${type}`;
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTypes(newExpanded);
  };

  // Handle item click - focus map and close dialog
  const handleItemClick = (item: EnhancedVibeItem) => {
    if (item.itemType === 'Bookmark') {
      // For bookmarks, call onBookmarkFocus
      if (onBookmarkFocus) {
        const bookmark: MapBookmark = {
          coordinates: item.coordinates,
          name: item.name,
          description: item.description,
          city: item.city,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
        onBookmarkFocus(bookmark);
      }
    } else {
      // For travel spots, call onTravelSpotFocus
      if (onTravelSpotFocus) {
        // Get the full travel spot data from the map
        const key = `${item.city}|||${item.name}`;
        const travelSpot = travelSpotMap.get(key);
        
        if (travelSpot) {
          onTravelSpotFocus(travelSpot);
        }
      }
    }
    setIsOpen(false);
  };

  // Reset expanded states when dialog closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setExpandedCities(new Set());
      setExpandedTypes(new Set());
    }
  };

  // Calculate totals for summary
  const totalItems = enhancedVibesByCity.reduce((sum, [_, items]) => sum + items.length, 0);
  const totalCities = enhancedVibesByCity.length;
  const totalTravelSpots = enhancedVibesByCity.reduce((sum, [_, items]) => 
    sum + items.filter(item => item.itemType !== 'Bookmark').length, 0);
  const totalBookmarks = enhancedVibesByCity.reduce((sum, [_, items]) => 
    sum + items.filter(item => item.itemType === 'Bookmark').length, 0);

  const isLoading = vibesLoading || spotsLoading;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
            title="Vibes Panel"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[3100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Travel Vibes Overview
            </DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading your travel vibes...</span>
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No travel vibes yet</p>
              <p className="text-sm">Start adding travel spots and bookmarks to see your vibes overview!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats - enhanced with travel spots and bookmarks breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{totalItems}</div>
                    <div className="text-xs text-muted-foreground">Total Items</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{totalCities}</div>
                    <div className="text-xs text-muted-foreground">Cities</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalTravelSpots}</div>
                    <div className="text-xs text-muted-foreground">Travel Spots</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{totalBookmarks}</div>
                    <div className="text-xs text-muted-foreground">Bookmarks</div>
                  </CardContent>
                </Card>
              </div>

              {/* Cities with Accordion-style expansion */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Cities & Travel Vibes
                </h3>
                
                <div className="space-y-2">
                  {enhancedVibesByCity
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([city, items]) => (
                      <CityAccordionItem
                        key={city}
                        city={city}
                        items={items}
                        isExpanded={expandedCities.has(city)}
                        onToggle={() => toggleCityExpansion(city)}
                        expandedTypes={expandedTypes}
                        onToggleType={(type) => toggleTypeExpansion(city, type)}
                        onItemClick={handleItemClick}
                        getItemTypeIcon={getItemTypeIcon}
                        getItemTypeColor={getItemTypeColor}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Separate component for city accordion item
interface CityAccordionItemProps {
  city: string;
  items: EnhancedVibeItem[];
  isExpanded: boolean;
  onToggle: () => void;
  expandedTypes: Set<string>;
  onToggleType: (type: string) => void;
  onItemClick: (item: EnhancedVibeItem) => void;
  getItemTypeIcon: (item: EnhancedVibeItem) => React.JSX.Element;
  getItemTypeColor: (item: EnhancedVibeItem) => string;
}

function CityAccordionItem({
  city,
  items,
  isExpanded,
  onToggle,
  expandedTypes,
  onToggleType,
  onItemClick,
  getItemTypeIcon,
  getItemTypeColor
}: CityAccordionItemProps) {
  
  // Calculate counts for display
  const travelSpotCount = items.filter(item => item.itemType !== 'Bookmark').length;
  const bookmarkCount = items.filter(item => item.itemType === 'Bookmark').length;
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-medium">{city}</span>
              </div>
              <div className="flex items-center gap-2">
                {travelSpotCount > 0 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {travelSpotCount} spot{travelSpotCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {bookmarkCount > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                    {bookmarkCount} bookmark{bookmarkCount > 1 ? 's' : ''}
                  </Badge>
                )}
                <Badge variant="secondary">
                  {items.length} total
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="ml-4 mt-2 space-y-2">
        {/* Group items by item type (Bookmark vs Travel Spot) */}
        {travelSpotCount > 0 && (
          <ItemTypeSection
            city={city}
            type="Travel Spot"
            items={items.filter(item => item.itemType !== 'Bookmark')}
            isExpanded={expandedTypes.has(`${city}-Travel Spot`)}
            onToggle={() => onToggleType('Travel Spot')}
            onItemClick={onItemClick}
            getItemTypeIcon={getItemTypeIcon}
            getItemTypeColor={getItemTypeColor}
          />
        )}
        {bookmarkCount > 0 && (
          <ItemTypeSection
            city={city}
            type="Bookmark"
            items={items.filter(item => item.itemType === 'Bookmark')}
            isExpanded={expandedTypes.has(`${city}-Bookmark`)}
            onToggle={() => onToggleType('Bookmark')}
            onItemClick={onItemClick}
            getItemTypeIcon={getItemTypeIcon}
            getItemTypeColor={getItemTypeColor}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Separate component for item type section
interface ItemTypeSectionProps {
  city: string;
  type: string;
  items: EnhancedVibeItem[];
  isExpanded: boolean;
  onToggle: () => void;
  onItemClick: (item: EnhancedVibeItem) => void;
  getItemTypeIcon: (item: EnhancedVibeItem) => React.JSX.Element;
  getItemTypeColor: (item: EnhancedVibeItem) => string;
}

function ItemTypeSection({
  city,
  type,
  items,
  isExpanded,
  onToggle,
  onItemClick,
  getItemTypeIcon,
  getItemTypeColor
}: ItemTypeSectionProps) {
  
  // Get icon for the section header
  const getSectionIcon = () => {
    if (type === 'Bookmark') {
      return <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />;
    }
    return <MapPin className="h-4 w-4 text-blue-500" />;
  };

  // Get color for the section header
  const getSectionColor = () => {
    if (type === 'Bookmark') {
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getSectionIcon()}
                <span className="font-medium text-sm">
                  {type === 'Bookmark' ? 'Bookmarks' : 'Travel Spots'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${getSectionColor()} text-xs`}>
                  {items.length} item{items.length > 1 ? 's' : ''}
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="ml-4 mt-2 space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No {type.toLowerCase()} items found in {city}
          </div>
        ) : (
          items.map((item, index) => (
            <Card 
              key={`${item.name}-${index}`}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onItemClick(item)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getItemTypeIcon(item)}
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      <Badge variant="outline" className={`${getItemTypeColor(item)} text-xs`}>
                        {item.itemType === 'Bookmark' ? 'Bookmark' : item.spotType || 'Travel Spot'}
                      </Badge>
                    </div>
                    
                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        📍 {item.coordinates[0].toFixed(4)}, {item.coordinates[1].toFixed(4)}
                      </Badge>
                    </div>
                  </div>
                  <div className="ml-2 flex items-center">
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

