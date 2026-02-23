import { useEffect, useRef, useState } from 'react';
import { Loader2, Play, Pause } from 'lucide-react';
import { useGetWebsiteLayoutPreferences, useGetTravelSpotSummaryByCity } from '@/hooks/useQueries';
import { useActor } from '@/hooks/useActor';
import { calculate_solar_declination } from '@/lib/solarCalculations';
import { ensureTzGroupV2, clearTimezoneOverlays, getLatLonFromIntersection, findTimezoneAtLatLon, renderTimezoneByOffset } from '@/lib/TzOverlayV2';
import { loadTimeZoneData } from '@/lib/timezoneUtils';

interface FlightAnimationData {
  fromCity: string;
  toCity: string;
  fromCoords: { lat: number; lon: number };
  toCoords: { lat: number; lon: number };
}

interface InteractiveGlobeProps {
  onSearchPerformed?: () => void;
  showTimeZones?: boolean;
  showCapitals?: boolean;
  showGlobalCities?: boolean;
  showMajorCities?: boolean;
  showTerminator?: boolean;
  showTwilight?: boolean;
  onTerminatorChange?: (value: boolean) => void;
  onTwilightChange?: (value: boolean) => void;
  activeOffsetIndex?: number;
  onOffsetChange?: (index: number) => void;
  rotationSpeed?: number;
  countryFontSize?: number;
  flightAnimation?: FlightAnimationData | null;
  onFlightAnimationComplete?: () => void;
}

declare global {
  interface Window {
    THREE: any;
    SunCalc: any;
  }
}

// Object pool item interface for HTML labels
interface PooledLabel {
  cssObject: any; // CSS2DObject
  element: HTMLDivElement;
  inUse: boolean;
  animationData?: {
    startTime: number;
    fadeInDuration: number;
    displayDuration: number;
    fadeOutDuration: number;
  };
}

interface PooledRipple {
  mesh: any;
  inUse: boolean;
  animationData?: {
    startTime: number;
    duration: number;
    initialScale: number;
    maxScale: number;
  };
}

/**
 * Helper function to filter front-facing borders
 * Returns only border lines whose center point faces the camera
 */
const getFrontFacingBorders = (borderLines: any[], camera: any): any[] => {
  if (!camera || borderLines.length === 0) return [];
  
  const cameraDirection = camera.position.clone().normalize();
  const frontFacingBorders: any[] = [];
  
  borderLines.forEach((line) => {
    if (!line.geometry || !line.geometry.attributes.position) return;
    
    // Get bounding sphere center
    if (!line.geometry.boundingSphere) {
      line.geometry.computeBoundingSphere();
    }
    
    // Transform bounding sphere center to world space
    const worldCenter = line.geometry.boundingSphere.center.clone();
    line.localToWorld(worldCenter);
    
    // Normalize to get direction from globe center
    const lineDirection = worldCenter.normalize();
    
    // Check if line center faces the camera (dot product > 0)
    const dotProduct = lineDirection.dot(cameraDirection);
    
    if (dotProduct > 0) {
      frontFacingBorders.push(line);
    }
  });
  
  return frontFacingBorders;
};

export default function InteractiveGlobe({ 
  onSearchPerformed, 
  showTimeZones = false,
  showCapitals = true,
  showGlobalCities = true,
  showMajorCities = true,
  showTerminator = true,
  showTwilight = true,
  onTerminatorChange,
  onTwilightChange,
  activeOffsetIndex = 14,
  onOffsetChange,
  rotationSpeed = 0.0005,
  countryFontSize = 8,
  flightAnimation = null,
  onFlightAnimationComplete
}: InteractiveGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const composerRef = useRef<any>(null);
  const css2DRendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const globeRef = useRef<any>(null);
  const cloudsRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const borderLinesRef = useRef<any[]>([]);
  const countryLabelsRef = useRef<any[]>([]);
  const cityMarkersRef = useRef<any[]>([]);
  const raycasterRef = useRef<any>(null);
  const mouseRef = useRef<any>(null);
  const hoveredCountryRef = useRef<string | null>(null);
  const directionalLightRef = useRef<any>(null);
  
  const lastHoveredTzidRef = useRef<string | null>(null);
  const tzRafRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  
  const isSliderActiveRef = useRef<boolean>(false);
  
  const flightRocketRef = useRef<any>(null);
  const flightPathLineRef = useRef<any>(null);
  const flightCityLabelsRef = useRef<any[]>([]);
  const flightAnimationDataRef = useRef<{
    curve: any;
    progress: number;
    isActive: boolean;
    journeyKey: string;
  } | null>(null);
  
  const offsets = [-12, -11, -10, -9.5, -9, -8, -7, -6, -5, -4, -3.5, -3, -2, -1, 0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 8.75, 9, 9.5, 10, 10.5, 11, 12, 12.75, 13, 14];
  
  const [cityTooltip, setCityTooltip] = useState<{ name: string; country?: string; x: number; y: number } | null>(null);
  
  const showCapitalsRef = useRef<boolean>(showCapitals);
  const showGlobalCitiesRef = useRef<boolean>(showGlobalCities);
  const showMajorCitiesRef = useRef<boolean>(showMajorCities);
  
  const highlightedCountryRef = useRef<string | null>(null);
  
  const highlightMaterialRef = useRef<any>(null);
  const normalMaterialRef = useRef<any>(null);
  
  const animatedArcsRef = useRef<any[]>([]);
  
  const journeyLabelPoolRef = useRef<PooledLabel[]>([]);
  const rippleEffectPoolRef = useRef<PooledRipple[]>([]);
  
  const loadingManagerRef = useRef<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const countryFontFamily = 'Roboto';
  
  const journeyFontSize = 0.7;
  
  const rotationSpeedRef = useRef<number>(rotationSpeed);
  const countryFontSizeRef = useRef<number>(countryFontSize);

  const rippleSize = 0.5;
  const rippleSizeRef = useRef<number>(0.5);
  
  const journeyFontSizeRef = useRef<number>(0.7);

  const initialGlobeRotationRef = useRef<number>(0);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const currentDateRef = useRef<Date>(new Date());
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const animationTimeoutRef = useRef<number | null>(null);
  
  const [isYearlyAnimation, setIsYearlyAnimation] = useState<boolean>(false);

  // State for local time and UTC offset time display
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null);

  const { data: layoutPreferences } = useGetWebsiteLayoutPreferences();
  const { data: travelSpotSummary } = useGetTravelSpotSummaryByCity();
  
  const { actor } = useActor();

  const labelOverrides: Record<string, { lat: number; lon: number }> = {
    'United States': { lat: 38.5, lon: -98.0 },
    'Canada': { lat: 56.0, lon: -95.0 },
    'India': { lat: 22.0, lon: 79.0 },
    'Malaysia': { lat: 4.0, lon: 102.0 },
    'Fiji': { lat: -18.0, lon: 178.0 },
    'France': { lat: 46.2, lon: 2.2 }
  };

  const additionalLabels: Array<{ name: string; lat: number; lon: number }> = [
    { name: 'Singapore', lat: 1.35, lon: 103.8 },
    { name: 'Maldives', lat: 3.2, lon: 73.2 },
    { name: 'French Guiana', lat: 4.0, lon: -53.0 }
  ];

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time in the same format as used elsewhere in the app
  const formatDateTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleString('en-US', options);
  };

  // Calculate offset time based on selected UTC offset
  const getOffsetTime = (): string | null => {
    if (selectedOffset === null) return null;

    const localOffset = -currentTime.getTimezoneOffset() / 60;
    const offsetDiff = selectedOffset - localOffset;
    const offsetDate = new Date(currentTime.getTime() + offsetDiff * 60 * 60 * 1000);

    return formatDateTime(offsetDate);
  };

  // Get local time formatted
  const localTimeFormatted = formatDateTime(currentTime);
  const offsetTimeFormatted = getOffsetTime();

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  useEffect(() => {
    rotationSpeedRef.current = rotationSpeed;
    
    if (controlsRef.current) {
      controlsRef.current.autoRotate = rotationSpeed > 0;
      controlsRef.current.autoRotateSpeed = rotationSpeed * 1000;
    }
  }, [rotationSpeed]);

  useEffect(() => {
    countryFontSizeRef.current = countryFontSize;
    updateCountryLabelsScale();
  }, [countryFontSize]);

  useEffect(() => {
    if (globeRef.current && globeRef.current.material && globeRef.current.material.uniforms) {
      globeRef.current.material.uniforms.showTerminator.value = showTerminator ? 1.0 : 0.0;
      globeRef.current.material.uniforms.showTwilight.value = showTwilight ? 1.0 : 0.0;
      console.log(`Terminator: ${showTerminator ? 'ON' : 'OFF'}, Twilight: ${showTwilight ? 'ON' : 'OFF'}`);
    }
  }, [showTerminator, showTwilight]);

  useEffect(() => {
    showCapitalsRef.current = showCapitals;
    console.log(`[TOGGLE] showCapitals prop and ref updated to: ${showCapitals}`);
  }, [showCapitals]);

  useEffect(() => {
    showGlobalCitiesRef.current = showGlobalCities;
    console.log(`[TOGGLE] showGlobalCities prop and ref updated to: ${showGlobalCities}`);
  }, [showGlobalCities]);

  useEffect(() => {
    showMajorCitiesRef.current = showMajorCities;
    console.log(`[TOGGLE] showMajorCities prop and ref updated to: ${showMajorCities}`);
  }, [showMajorCities]);

  useEffect(() => {
    if (showTimeZones) {
      loadTimeZoneData().then(() => {
        console.log('[TZ] Timezone data loaded, slider enabled');
        isSliderActiveRef.current = false;
      }).catch(e => {
        console.error('[TZ] Failed to load timezone data', e);
      });
    } else {
      if (globeRef.current) {
        clearTimezoneOverlays(globeRef.current);
      }
      lastHoveredTzidRef.current = null;
      isSliderActiveRef.current = false;
      if (tzRafRef.current !== null) {
        cancelAnimationFrame(tzRafRef.current);
        tzRafRef.current = null;
      }
      console.log('[TZ] Timezone overlay disabled');
    }
  }, [showTimeZones]);

  useEffect(() => {
    if (showTimeZones && onOffsetChange && globeRef.current) {
      isSliderActiveRef.current = true;
      
      const renderTimezones = async () => {
        try {
          const tzData = window.TZ_DATA || await loadTimeZoneData();
          const offset = offsets[activeOffsetIndex];
          
          clearTimezoneOverlays(globeRef.current);
          
          renderTimezoneByOffset(tzData, globeRef.current, offset);
          
          // Update selected offset for time display
          setSelectedOffset(offset);
          
          console.log(`[TZ SLIDER] Rendered timezones for UTC${offset >= 0 ? '+' : ''}${offset}`);
        } catch (error) {
          console.error('[TZ SLIDER] Error rendering timezones:', error);
        }
      };
      
      renderTimezones();
    }
  }, [activeOffsetIndex, showTimeZones, onOffsetChange]);

  // Handle flight animation trigger
  useEffect(() => {
    if (flightAnimation && globeRef.current && window.THREE) {
      const journeyKey = `${flightAnimation.fromCity}-${flightAnimation.toCity}`;
      
      // Check if this is the same journey that's currently animating
      if (flightAnimationDataRef.current && flightAnimationDataRef.current.journeyKey === journeyKey) {
        // Stop the current animation - remove rocket, path, and labels
        console.log(`[FLIGHT] Stopping flight animation for ${journeyKey}`);
        removeFlightAnimation();
        
        // Notify parent that animation is complete/stopped
        if (onFlightAnimationComplete) {
          onFlightAnimationComplete();
        }
      } else {
        // Start new animation
        console.log(`[FLIGHT] Starting flight animation from ${flightAnimation.fromCity} to ${flightAnimation.toCity}`);
        createFlightAnimation(flightAnimation);
      }
    }
  }, [flightAnimation]);

  const formatHourlyDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  };

  const formatYearlyDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const toggleAnimation = () => {
    if (isAnimating) {
      if (animationTimeoutRef.current !== null) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      setIsAnimating(false);
      console.log('[ANIMATION] Paused at', currentDateRef.current);
    } else {
      setIsAnimating(true);
      setIsYearlyAnimation(false);
      console.log('[ANIMATION] Started from', currentDateRef.current);
      
      const animateHourly = () => {
        setCurrentDate((prev) => {
          const next = new Date(prev.getTime() + 60 * 60 * 1000);
          return next;
        });
        animationTimeoutRef.current = window.setTimeout(animateHourly, 1000);
      };
      
      animateHourly();
    }
  };

  const playYearlyAnimation = () => {
    if (animationTimeoutRef.current !== null) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    const currentYear = new Date().getFullYear();
    
    const startDate = new Date(Date.UTC(currentYear, 0, 1, 12, 0, 0));
    setCurrentDate(startDate);
    currentDateRef.current = startDate;
    
    setIsAnimating(true);
    setIsYearlyAnimation(true);
    
    console.log(`[YEARLY ANIMATION] Started from ${startDate.toISOString()}`);
    console.log('[YEARLY ANIMATION] Configuration: ~20 seconds, 18 FPS, 1 day per frame');
    
    const frameInterval = 1000 / 18;
    
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    
    console.log(`[YEARLY ANIMATION] Frame interval: ${frameInterval.toFixed(2)}ms`);
    console.log(`[YEARLY ANIMATION] Advancing by 1 day per frame`);
    
    let frameCount = 0;
    
    const animateYearly = () => {
      setCurrentDate((prev) => {
        frameCount++;
        
        const next = new Date(prev.getTime() + millisecondsPerDay);
        
        const endDate = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59));
        
        if (next.getTime() > endDate.getTime()) {
          if (animationTimeoutRef.current !== null) {
            clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = null;
          }
          setIsAnimating(false);
          setIsYearlyAnimation(false);
          console.log(`[YEARLY ANIMATION] Completed at December 31st after ${frameCount} frames`);
          return endDate;
        }
        
        if (frameCount % 30 === 0) {
          const dayOfYear = Math.floor((next.getTime() - new Date(Date.UTC(currentYear, 0, 1)).getTime()) / millisecondsPerDay) + 1;
          console.log(`[YEARLY ANIMATION] Frame ${frameCount}/365, Day ${dayOfYear}/365: ${next.toISOString()}`);
        }
        
        return next;
      });
      
      animationTimeoutRef.current = window.setTimeout(animateYearly, frameInterval);
    };
    
    animateYearly();
  };

  const pauseYearlyAnimation = () => {
    if (animationTimeoutRef.current !== null) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    setIsAnimating(false);
    console.log('[YEARLY ANIMATION] Paused at', currentDateRef.current);
  };

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current !== null) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const syncToRealTime = () => {
    console.log('[SYNC TO REAL-TIME] Starting sync...');
    
    if (animationTimeoutRef.current !== null) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    setIsAnimating(false);
    setIsYearlyAnimation(false);
    console.log('[SYNC TO REAL-TIME] Stopped animation');
    
    const now = new Date();
    console.log(`[SYNC TO REAL-TIME] Current UTC time: ${now.toISOString()}`);
    
    setCurrentDate(now);
    currentDateRef.current = now;
    
    if (window.SunCalc && globeRef.current && globeRef.current.material && globeRef.current.material.uniforms) {
      const sunPos = window.SunCalc.getPosition(now, 0, 0);
      const declinationRadians = sunPos.declination;
      
      const hours = now.getUTCHours();
      const minutes = now.getUTCMinutes();
      const seconds = now.getUTCSeconds();
      const totalHours = hours + minutes / 60 + seconds / 3600;
      const subsolarLonDegrees = (totalHours - 12) * 15;
      const subsolarLonRadians = subsolarLonDegrees * (Math.PI / 180);
      
      globeRef.current.material.uniforms.solarDeclination.value = declinationRadians;
      globeRef.current.material.uniforms.subsolarLongitude.value = subsolarLonRadians;
      
      console.log(`[SYNC TO REAL-TIME] Updated terminator - Declination: ${(declinationRadians * 180 / Math.PI).toFixed(2)}°, Subsolar Lon: ${subsolarLonDegrees.toFixed(2)}°`);
      
      if (directionalLightRef.current) {
        const declinationDegrees = declinationRadians * (180 / Math.PI);
        const lightDistance = 5;
        const phi = (90 - declinationDegrees) * (Math.PI / 180);
        const theta = (subsolarLonDegrees + 180) * (Math.PI / 180);
        
        const x = -(lightDistance * Math.sin(phi) * Math.cos(theta));
        const y = lightDistance * Math.cos(phi);
        const z = lightDistance * Math.sin(phi) * Math.sin(theta);
        
        directionalLightRef.current.position.set(x, y, z);
        directionalLightRef.current.lookAt(0, 0, 0);
        console.log(`[SYNC TO REAL-TIME] Updated light position to (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
      }
    }
    
    if (globeRef.current) {
      const originalRotation = initialGlobeRotationRef.current;
      globeRef.current.rotation.y = originalRotation;
      console.log(`[SYNC TO REAL-TIME] Reset globe rotation to ${originalRotation.toFixed(3)} radians`);
    }
    
    if (controlsRef.current) {
      controlsRef.current.autoRotate = rotationSpeed > 0;
      controlsRef.current.autoRotateSpeed = rotationSpeed * 1000;
      console.log(`[SYNC TO REAL-TIME] Auto-rotation ${rotationSpeed > 0 ? 'enabled' : 'disabled'}`);
    }
    
    console.log('[SYNC TO REAL-TIME] Sync complete!');
  };

  // Placeholder functions - these would be implemented in the full component
  const updateCountryLabelsScale = () => {};
  const removeFlightAnimation = () => {};
  const createFlightAnimation = (animation: FlightAnimationData) => {};

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      
      {showTimeZones && onOffsetChange && (
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-4 rounded-lg max-w-md z-10">
          <h3 className="text-white font-semibold mb-2 text-sm">UTC Offset Selection</h3>
          <div className="flex flex-wrap gap-1 mb-3">
            {offsets.map((offset, index) => (
              <button
                key={offset}
                onClick={() => onOffsetChange(index)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  activeOffsetIndex === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {offset >= 0 ? `+${offset}` : offset}
              </button>
            ))}
          </div>

          <div className="space-y-2 text-white text-sm">
            <div>
              <p className="text-xs font-medium text-gray-400">Local Time:</p>
              <p className="text-sm">{localTimeFormatted}</p>
            </div>

            {selectedOffset !== null && offsetTimeFormatted && (
              <div>
                <p className="text-xs font-medium text-gray-400">
                  UTC{selectedOffset >= 0 ? '+' : ''}
                  {selectedOffset} Time:
                </p>
                <p className="text-sm">{offsetTimeFormatted}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
