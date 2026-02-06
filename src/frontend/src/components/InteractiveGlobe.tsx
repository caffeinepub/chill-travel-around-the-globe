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

  const latLonToVector3 = (lat: number, lon: number, radius: number = 1.0): any => {
    if (!window.THREE) return null;
    
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new window.THREE.Vector3(x, y, z);
  };

  const removeFlightAnimation = () => {
    if (!globeRef.current) return;

    // Remove rocket
    if (flightRocketRef.current) {
      globeRef.current.remove(flightRocketRef.current);
      flightRocketRef.current.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      flightRocketRef.current = null;
    }

    // Remove flight path
    if (flightPathLineRef.current) {
      globeRef.current.remove(flightPathLineRef.current);
      if (flightPathLineRef.current.geometry) flightPathLineRef.current.geometry.dispose();
      if (flightPathLineRef.current.material) flightPathLineRef.current.material.dispose();
      flightPathLineRef.current = null;
    }

    // Remove city labels
    flightCityLabelsRef.current.forEach(label => {
      if (label.parent) {
        label.parent.remove(label);
      }
      if (label.element && label.element.parentNode) {
        label.element.parentNode.removeChild(label.element);
      }
    });
    flightCityLabelsRef.current = [];

    // Clear animation data
    flightAnimationDataRef.current = null;

    console.log('[FLIGHT] Removed all flight animation objects');
  };

  const createFlightAnimation = (animData: FlightAnimationData) => {
    if (!window.THREE || !globeRef.current) return;

    // Remove any existing flight animation first
    removeFlightAnimation();

    const startPoint = latLonToVector3(animData.fromCoords.lat, animData.fromCoords.lon, 1.05);
    const endPoint = latLonToVector3(animData.toCoords.lat, animData.toCoords.lon, 1.05);
    
    if (!startPoint || !endPoint) return;

    // Create curved path for the rocket using QuadraticBezierCurve3
    const midPoint = new window.THREE.Vector3()
      .addVectors(startPoint, endPoint)
      .multiplyScalar(0.5);
    
    const distance = startPoint.distanceTo(endPoint);
    const arcHeight = distance * 0.4;
    
    const controlPoint = midPoint.clone().normalize().multiplyScalar(1.05 + arcHeight);

    const curve = new window.THREE.QuadraticBezierCurve3(
      startPoint,
      controlPoint,
      endPoint
    );

    // Create enhanced visible flight path line with stronger glow
    const pathPoints = curve.getPoints(100);
    const pathGeometry = new window.THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMaterial = new window.THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      linewidth: 4
    });
    const pathLine = new window.THREE.Line(pathGeometry, pathMaterial);
    globeRef.current.add(pathLine);
    flightPathLineRef.current = pathLine;

    // Create an enlarged 3D rocket model (3x larger than before)
    const rocketGroup = new window.THREE.Group();
    
    // Scale factor: 3x larger
    const scale = 3.0;
    
    // Rocket body (sleek cylinder) - enlarged
    const bodyGeometry = new window.THREE.CylinderGeometry(0.0015 * scale, 0.0015 * scale, 0.008 * scale, 16);
    const bodyMaterial = new window.THREE.MeshPhongMaterial({
      color: 0xE0E0E0,
      emissive: 0x4488ff,
      emissiveIntensity: 0.15,
      shininess: 100
    });
    const body = new window.THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    rocketGroup.add(body);
    
    // Rocket nose cone (conical) - enlarged
    const noseGeometry = new window.THREE.ConeGeometry(0.0015 * scale, 0.004 * scale, 16);
    const noseMaterial = new window.THREE.MeshPhongMaterial({
      color: 0xFF4444,
      emissive: 0xff2222,
      emissiveIntensity: 0.2,
      shininess: 120
    });
    const nose = new window.THREE.Mesh(noseGeometry, noseMaterial);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.006 * scale;
    rocketGroup.add(nose);
    
    // Tail fins (4 fins arranged around the base) - enlarged
    const finGeometry = new window.THREE.BoxGeometry(0.003 * scale, 0.0005 * scale, 0.002 * scale);
    const finMaterial = new window.THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 80
    });
    
    for (let i = 0; i < 4; i++) {
      const fin = new window.THREE.Mesh(finGeometry, finMaterial);
      const angle = (i * Math.PI) / 2;
      fin.position.x = Math.cos(angle) * 0.0015 * scale;
      fin.position.y = Math.sin(angle) * 0.0015 * scale;
      fin.position.z = -0.004 * scale;
      fin.rotation.z = angle;
      rocketGroup.add(fin);
    }
    
    // Exhaust flame (animated cone for motion realism) - enlarged
    const exhaustGeometry = new window.THREE.ConeGeometry(0.001 * scale, 0.003 * scale, 8);
    const exhaustMaterial = new window.THREE.MeshBasicMaterial({
      color: 0xFFAA00,
      transparent: true,
      opacity: 0.8
    });
    const exhaust = new window.THREE.Mesh(exhaustGeometry, exhaustMaterial);
    exhaust.rotation.x = -Math.PI / 2;
    exhaust.position.z = -0.006 * scale;
    rocketGroup.add(exhaust);
    
    // Add glow effect to exhaust - enlarged
    const exhaustGlowGeometry = new window.THREE.ConeGeometry(0.0015 * scale, 0.004 * scale, 8);
    const exhaustGlowMaterial = new window.THREE.MeshBasicMaterial({
      color: 0xFF6600,
      transparent: true,
      opacity: 0.4
    });
    const exhaustGlow = new window.THREE.Mesh(exhaustGlowGeometry, exhaustGlowMaterial);
    exhaustGlow.rotation.x = -Math.PI / 2;
    exhaustGlow.position.z = -0.007 * scale;
    rocketGroup.add(exhaustGlow);
    
    globeRef.current.add(rocketGroup);
    flightRocketRef.current = rocketGroup;

    // Create city name labels for both departure and arrival cities
    const createCityNameLabel = (cityName: string, coords: { lat: number; lon: number }) => {
      const position = latLonToVector3(coords.lat, coords.lon, 1.08);
      if (!position) return null;

      const div = document.createElement('div');
      div.className = 'flight-city-label';
      div.style.position = 'absolute';
      div.style.pointerEvents = 'none';
      div.style.color = '#ffffff';
      div.style.fontSize = '16px';
      div.style.fontWeight = 'bold';
      div.style.textShadow = '0 0 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)';
      div.style.padding = '4px 8px';
      div.style.backgroundColor = 'rgba(0,0,0,0.6)';
      div.style.borderRadius = '4px';
      div.style.whiteSpace = 'nowrap';
      div.textContent = cityName;

      const css2DObject = new window.THREE.CSS2DObject(div);
      css2DObject.position.copy(position);
      globeRef.current.add(css2DObject);

      return { cssObject: css2DObject, element: div };
    };

    // Create labels for both cities
    const fromLabel = createCityNameLabel(animData.fromCity, animData.fromCoords);
    const toLabel = createCityNameLabel(animData.toCity, animData.toCoords);
    
    if (fromLabel) flightCityLabelsRef.current.push(fromLabel.cssObject);
    if (toLabel) flightCityLabelsRef.current.push(toLabel.cssObject);

    // Store animation data with journey key for toggle detection
    const journeyKey = `${animData.fromCity}-${animData.toCity}`;
    flightAnimationDataRef.current = {
      curve: curve,
      progress: 0,
      isActive: true,
      journeyKey: journeyKey
    };

    console.log(`[FLIGHT] Created enlarged 3D rocket model (3x scale) with journey key: ${journeyKey}`);
  };

  const onTzPointerMove = (event: PointerEvent) => {
    if (!showTimeZones) return;
    
    if (isSliderActiveRef.current) {
      return;
    }
    
    const globe = globeRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const raycaster = raycasterRef.current;
    
    if (!globe || !renderer || !camera || !raycaster) return;
    
    if (isDraggingRef.current) {
      return;
    }
    
    try {
      const canvas = renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera({ x, y }, camera);
      const intersects = raycaster.intersectObject(globe, false);
      
      if (intersects.length === 0) return;
      
      const intersection = intersects[0];
      
      const ll = getLatLonFromIntersection(intersection.point);
      if (!ll) return;
      
      const resolveTzid = async () => {
        const tzData = window.TZ_DATA || await loadTimeZoneData();
        const tzid = findTimezoneAtLatLon(tzData, ll.lat, ll.lon);
        
        if (!tzid || tzid.startsWith('Etc/')) return;
        
        if (tzid !== lastHoveredTzidRef.current) {
          if (tzRafRef.current === null) {
            tzRafRef.current = requestAnimationFrame(() => {
              tzRafRef.current = null;
              
              clearTimezoneOverlays(globe);
              
              renderTimezoneByOffset(tzData, globe, 0);
              lastHoveredTzidRef.current = tzid;
              console.log(`[TZ] Rendered: ${tzid}`);
            });
          }
        }
      };
      
      resolveTzid().catch(e => console.error('[TZ] resolve error', e));
    } catch (e) {
      console.error('[TZ] hover error', e);
    }
  };

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !renderer.domElement) return;
    
    if (showTimeZones) {
      renderer.domElement.addEventListener('pointermove', onTzPointerMove);
      console.log('[TZ] Pointermove listener attached');
    } else {
      renderer.domElement.removeEventListener('pointermove', onTzPointerMove);
      console.log('[TZ] Pointermove listener removed');
    }
    
    return () => {
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('pointermove', onTzPointerMove);
      }
    };
  }, [showTimeZones]);

  const updateCityMarkerVisibility = () => {
    if (!cameraRef.current || cityMarkersRef.current.length === 0) return;

    const cameraDirection = cameraRef.current.position.clone().normalize();
    
    cityMarkersRef.current.forEach((marker) => {
      const isCapital = marker.userData.classification === 'Capital';
      const isGlobalCity = marker.userData.classification === 'Global City';
      const isMajorCity = marker.userData.classification === 'Major City';
      
      const markerDirection = marker.position.clone().normalize();
      const dotProduct = markerDirection.dot(cameraDirection);
      const isFrontSide = dotProduct > 0;
      
      let visible = false;
      
      if (isFrontSide) {
        if (isCapital && showCapitalsRef.current) {
          visible = true;
        } else if (isGlobalCity && showGlobalCitiesRef.current) {
          visible = true;
        } else if (isMajorCity && showMajorCitiesRef.current) {
          visible = true;
        }
      }
      
      marker.visible = visible;
    });
  };

  const geocodeCity = async (cityName: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const encodedQuery = encodeURIComponent(cityName);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LocationMapExplorer/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        if (!isNaN(lat) && !isNaN(lon)) {
          return { lat, lon };
        }
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const initializeObjectPools = (globe: any) => {
    if (!window.THREE || !globe) return;

    console.log('Initializing object pools with HTML labels...');

    for (let i = 0; i < 50; i++) {
      const div = document.createElement('div');
      div.className = 'journey-label';
      div.style.position = 'absolute';
      div.style.pointerEvents = 'none';
      div.style.opacity = '0';
      div.style.visibility = 'hidden';
      div.textContent = '';

      const css2DObject = new window.THREE.CSS2DObject(div);
      css2DObject.position.set(0, 0, 0);
      css2DObject.visible = false;

      css2DObject.userData = {
        type: 'pooledJourneyLabel',
        poolIndex: i
      };

      globe.add(css2DObject);
      journeyLabelPoolRef.current.push({
        cssObject: css2DObject,
        element: div,
        inUse: false
      });
    }

    for (let i = 0; i < 50; i++) {
      const geometry = new window.THREE.TorusGeometry(0.01, 0.003, 16, 32);
      const material = new window.THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: window.THREE.DoubleSide
      });

      const ripple = new window.THREE.Mesh(geometry, material);
      ripple.position.set(0, 0, 0);
      ripple.scale.set(1, 1, 1);
      ripple.visible = false;

      ripple.userData = {
        type: 'pooledRipple',
        poolIndex: i
      };

      globe.add(ripple);
      rippleEffectPoolRef.current.push({
        mesh: ripple,
        inUse: false
      });
    }

    console.log(`Object pools initialized: ${journeyLabelPoolRef.current.length} HTML labels, ${rippleEffectPoolRef.current.length} ripples`);
  };

  const getAvailableLabel = (): PooledLabel | null => {
    const available = journeyLabelPoolRef.current.find(item => !item.inUse);
    if (available) {
      available.inUse = true;
      return available;
    }
    console.warn('Journey label pool exhausted!');
    return null;
  };

  const returnLabelToPool = (pooledLabel: PooledLabel) => {
    pooledLabel.inUse = false;
    pooledLabel.cssObject.visible = false;
    pooledLabel.element.style.opacity = '0';
    pooledLabel.element.style.visibility = 'hidden';
    pooledLabel.element.textContent = '';
    pooledLabel.animationData = undefined;
  };

  const getAvailableRipple = (): PooledRipple | null => {
    const available = rippleEffectPoolRef.current.find(item => !item.inUse);
    if (available) {
      available.inUse = true;
      return available;
    }
    console.warn('Ripple effect pool exhausted!');
    return null;
  };

  const returnRippleToPool = (pooledRipple: PooledRipple) => {
    pooledRipple.inUse = false;
    pooledRipple.mesh.visible = false;
    pooledRipple.mesh.material.opacity = 0;
    pooledRipple.mesh.scale.set(1, 1, 1);
    pooledRipple.animationData = undefined;
  };

  const createRippleEffect = (
    cityCoords: { lat: number; lon: number },
    color: number,
    globe: any
  ) => {
    if (!window.THREE) return;

    const pooledRipple = getAvailableRipple();
    if (!pooledRipple) return;

    const position = latLonToVector3(cityCoords.lat, cityCoords.lon, 1.02);
    if (!position) {
      returnRippleToPool(pooledRipple);
      return;
    }

    const ripple = pooledRipple.mesh;
    ripple.position.copy(position);
    ripple.lookAt(new window.THREE.Vector3(0, 0, 0));
    ripple.material.color.setHex(color);
    ripple.material.opacity = 0.9;
    ripple.scale.set(1, 1, 1);
    ripple.visible = true;

    pooledRipple.animationData = {
      startTime: Date.now(),
      initialScale: 1,
      maxScale: rippleSizeRef.current * 3.75,
      duration: 1500
    };

    console.log(`Activated ripple from pool at (${cityCoords.lat}, ${cityCoords.lon}) with color #${color.toString(16).padStart(6, '0')}`);
  };

  const createCityLabel = (
    cityName: string,
    cityCoords: { lat: number; lon: number },
    globe: any,
    isStartLabel: boolean = false
  ) => {
    if (!window.THREE) return;

    const pooledLabel = getAvailableLabel();
    if (!pooledLabel) return;

    const position = latLonToVector3(cityCoords.lat, cityCoords.lon, 1.05);
    if (!position) {
      returnLabelToPool(pooledLabel);
      return;
    }

    const cssObject = pooledLabel.cssObject;
    const element = pooledLabel.element;

    element.textContent = cityName;

    cssObject.position.copy(position);
    cssObject.visible = true;

    const displayDuration = isStartLabel ? 2000 : 2500;
    pooledLabel.animationData = {
      startTime: Date.now(),
      fadeInDuration: 500,
      displayDuration: displayDuration,
      fadeOutDuration: 500
    };

    console.log(`Activated ${isStartLabel ? 'start' : 'destination'} HTML label from pool for ${cityName}`);
  };

  const createAnimatedCityArc = (
    city1: { name: string; lat: number; lon: number },
    city2: { name: string; lat: number; lon: number },
    scene: any,
    globe: any,
    color: number = 0xffff00,
    startDelay: number = 0
  ) => {
    if (!window.THREE) return;

    const startPoint = latLonToVector3(city1.lat, city1.lon, 1.01);
    const endPoint = latLonToVector3(city2.lat, city2.lon, 1.01);
    
    if (!startPoint || !endPoint) return;

    const midPoint = new window.THREE.Vector3()
      .addVectors(startPoint, endPoint)
      .multiplyScalar(0.5);
    
    const distance = startPoint.distanceTo(endPoint);
    const arcHeight = distance * 0.5;
    
    const controlPoint = midPoint.clone().normalize().multiplyScalar(1.01 + arcHeight);

    const curve = new window.THREE.CatmullRomCurve3([
      startPoint,
      controlPoint,
      endPoint
    ]);

    const numPoints = 100;
    const points = curve.getPoints(numPoints);

    const geometry = new window.THREE.BufferGeometry();
    const positions = new Float32Array(numPoints * 3);
    const progress = new Float32Array(numPoints);

    for (let i = 0; i < numPoints; i++) {
      positions[i * 3] = points[i].x;
      positions[i * 3 + 1] = points[i].y;
      positions[i * 3 + 2] = points[i].z;
      progress[i] = i / (numPoints - 1);
    }

    geometry.setAttribute('position', new window.THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('progress', new window.THREE.BufferAttribute(progress, 1));

    const material = new window.THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        color: { value: new window.THREE.Color(color) },
        pointSize: { value: 3.0 }
      },
      vertexShader: `
        attribute float progress;
        uniform float time;
        uniform float pointSize;
        varying float vAlpha;
        
        void main() {
          float distanceFromHead = abs(progress - time);
          
          float tailLength = 0.3;
          vAlpha = 0.0;
          
          if (progress <= time && progress >= time - tailLength) {
            float tailProgress = (time - progress) / tailLength;
            vAlpha = 1.0 - tailProgress;
          } else if (progress > time && progress <= time + 0.05) {
            vAlpha = 1.0;
          }
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize * vAlpha;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) {
            discard;
          }
          
          float alpha = vAlpha * (1.0 - smoothstep(0.3, 0.5, dist));
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthTest: true,
      blending: window.THREE.AdditiveBlending
    });

    const particleSystem = new window.THREE.Points(geometry, material);
    
    particleSystem.userData = {
      type: 'animatedParticleArc',
      city1: city1.name,
      city1Coords: { lat: city1.lat, lon: city1.lon },
      city2: city2.name,
      city2Coords: { lat: city2.lat, lon: city2.lon },
      material: material,
      time: 0,
      startDelay: startDelay,
      delayTimer: 0,
      isAnimating: false,
      hasTriggeredStartLabel: false,
      hasTriggeredArrivalEvent: false,
      color: color
    };

    globe.add(particleSystem);
    animatedArcsRef.current.push(particleSystem);

    console.log(`Created animated particle arc from ${city1.name} to ${city2.name} with color #${color.toString(16).padStart(6, '0')} and ${startDelay}s delay`);
  };

  const highlightCountry = (countryName: string) => {
    if (highlightedCountryRef.current) {
      borderLinesRef.current.forEach((line) => {
        if (line.userData.countryName === highlightedCountryRef.current) {
          line.material = normalMaterialRef.current;
        }
      });
    }

    borderLinesRef.current.forEach((line) => {
      if (line.userData.countryName === countryName) {
        line.material = highlightMaterialRef.current;
      }
    });

    highlightedCountryRef.current = countryName;
    console.log(`Country highlighted: ${countryName}`);
  };

  const deselectCountry = () => {
    if (highlightedCountryRef.current) {
      borderLinesRef.current.forEach((line) => {
        if (line.userData.countryName === highlightedCountryRef.current) {
          line.material = normalMaterialRef.current;
        }
      });
      
      console.log(`Country deselected: ${highlightedCountryRef.current}`);
      highlightedCountryRef.current = null;
    }
  };

  const setupPostProcessing = (renderer: any, scene: any, camera: any) => {
    if (!window.THREE) return;

    const loadPostProcessing = async () => {
      try {
        const effectComposerScript = document.createElement('script');
        effectComposerScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js';
        effectComposerScript.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          effectComposerScript.onload = resolve;
          effectComposerScript.onerror = reject;
          document.head.appendChild(effectComposerScript);
        });

        const renderPassScript = document.createElement('script');
        renderPassScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js';
        renderPassScript.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          renderPassScript.onload = resolve;
          renderPassScript.onerror = reject;
          document.head.appendChild(renderPassScript);
        });

        const bloomPassScript = document.createElement('script');
        bloomPassScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js';
        bloomPassScript.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          bloomPassScript.onload = resolve;
          bloomPassScript.onerror = reject;
          document.head.appendChild(bloomPassScript);
        });

        const composer = new window.THREE.EffectComposer(renderer);
        
        const renderPass = new window.THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);
        
        const bloomPass = new window.THREE.UnrealBloomPass(
          new window.THREE.Vector2(window.innerWidth, window.innerHeight),
          1.2,
          0.6,
          0.8
        );
        composer.addPass(bloomPass);
        
        composerRef.current = composer;
        console.log('Post-processing bloom effect initialized successfully');
      } catch (error) {
        console.error('Failed to load post-processing modules:', error);
      }
    };

    loadPostProcessing();
  };

  const updateCountryLabelsScale = () => {
    if (!globeRef.current || !window.THREE) return;

    countryLabelsRef.current.forEach((label) => {
      const baseScale = label.userData.baseScale || 0.15;
      const scaleFactor = countryFontSizeRef.current / 8;
      const newScale = baseScale * scaleFactor;
      label.scale.set(newScale * 2, newScale * 0.5, 1);
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadThreeJS = async () => {
      try {
        if (!window.THREE) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
          script.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const controlsScript = document.createElement('script');
        controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
        controlsScript.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          controlsScript.onload = resolve;
          controlsScript.onerror = reject;
          document.head.appendChild(controlsScript);
        });

        const css2DScript = document.createElement('script');
        css2DScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/renderers/CSS2DRenderer.js';
        css2DScript.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          css2DScript.onload = resolve;
          css2DScript.onerror = reject;
          document.head.appendChild(css2DScript);
        });

        if (!isMounted) return;

        initializeGlobe();
      } catch (err) {
        console.error('Failed to load Three.js:', err);
        if (isMounted) {
          setError('Failed to load 3D globe. Please refresh the page.');
          setIsLoading(false);
        }
      }
    };

    const initializeGlobe = async () => {
      if (!mountRef.current || !window.THREE) return;

      const container = mountRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      const loadingManager = new window.THREE.LoadingManager();
      loadingManagerRef.current = loadingManager;

      let assetsLoaded = false;

      loadingManager.onLoad = () => {
        console.log('All assets loaded successfully');
        assetsLoaded = true;
        
        if (isMounted) {
          initializeScene();
        }
      };

      loadingManager.onProgress = (url: string, itemsLoaded: number, itemsTotal: number) => {
        console.log(`Loading: ${url} (${itemsLoaded}/${itemsTotal})`);
      };

      loadingManager.onError = (url: string) => {
        console.error(`Error loading: ${url}`);
      };

      highlightMaterialRef.current = new window.THREE.LineBasicMaterial({
        color: 0x4ACFFF,
        linewidth: 3,
        transparent: true,
        opacity: 1.0
      });

      normalMaterialRef.current = new window.THREE.LineBasicMaterial({
        color: 0xffffcc,
        linewidth: 1,
        transparent: true,
        opacity: 0.3
      });

      const scene = new window.THREE.Scene();
      scene.background = new window.THREE.Color(0x000011);
      sceneRef.current = scene;

      const camera = new window.THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(0, 0, 3);
      cameraRef.current = camera;

      const renderer = new window.THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = window.THREE.PCFSoftShadowMap;
      renderer.outputEncoding = window.THREE.sRGBEncoding;
      renderer.toneMapping = window.THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      rendererRef.current = renderer;

      container.appendChild(renderer.domElement);

      setupPostProcessing(renderer, scene, camera);

      const css2DRenderer = new window.THREE.CSS2DRenderer();
      css2DRenderer.setSize(width, height);
      css2DRenderer.domElement.style.position = 'absolute';
      css2DRenderer.domElement.style.top = '0';
      css2DRenderer.domElement.style.left = '0';
      css2DRenderer.domElement.style.pointerEvents = 'none';
      container.appendChild(css2DRenderer.domElement);
      css2DRendererRef.current = css2DRenderer;

      const geometry = new window.THREE.SphereGeometry(1, 64, 64);

      const textureLoader = new window.THREE.TextureLoader(loadingManager);
      
      const earthTexture = textureLoader.load(
        'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
        (texture) => {
          console.log('Color texture loaded successfully');
        },
        undefined,
        (error) => {
          console.error('Error loading color texture:', error);
        }
      );

      const bumpTexture = textureLoader.load(
        'https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png',
        (texture) => {
          console.log('Bump texture loaded successfully');
        },
        undefined,
        (error) => {
          console.error('Error loading bump texture:', error);
        }
      );

      const specularTexture = textureLoader.load(
        'https://unpkg.com/three-globe@2.31.1/example/img/earth-water.png',
        (texture) => {
          console.log('Specular texture loaded successfully');
        },
        undefined,
        (error) => {
          console.error('Error loading specular texture:', error);
        }
      );

      const cloudTexture = textureLoader.load(
        'https://unpkg.com/three-globe@2.31.1/example/img/earth-clouds.png',
        (texture) => {
          console.log('Cloud texture loaded successfully');
        },
        undefined,
        (error) => {
          console.error('Error loading cloud texture:', error);
        }
      );

      const cityLightsTexture = textureLoader.load(
        'https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg',
        (texture) => {
          console.log('City lights texture loaded successfully');
        },
        undefined,
        (error) => {
          console.error('Error loading city lights texture:', error);
        }
      );

      const material = new window.THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: earthTexture },
          nightTexture: { value: cityLightsTexture },
          bumpMap: { value: bumpTexture },
          bumpScale: { value: 0.05 },
          specularMap: { value: specularTexture },
          solarDeclination: { value: 0.0 },
          subsolarLongitude: { value: 0.0 },
          showTerminator: { value: 1.0 },
          showTwilight: { value: 1.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          uniform sampler2D bumpMap;
          uniform float bumpScale;
          
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            
            vec3 bumpNormal = vNormal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position + bumpNormal * bumpScale * 0.01, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D dayTexture;
          uniform sampler2D nightTexture;
          uniform sampler2D specularMap;
          uniform float solarDeclination;
          uniform float subsolarLongitude;
          uniform float showTerminator;
          uniform float showTwilight;
          
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          void main() {
            vec4 dayColor = texture2D(dayTexture, vUv);
            vec4 nightColor = texture2D(nightTexture, vUv);
            float specular = texture2D(specularMap, vUv).r;
            
            vec3 normalizedPos = normalize(vPosition);
            float lat = asin(normalizedPos.y);
            float lon = atan(normalizedPos.z, normalizedPos.x);
            
            float subsolarLat = solarDeclination;
            float subsolarLon = subsolarLongitude;
            
            float cosAngle = sin(lat) * sin(subsolarLat) + 
                            cos(lat) * cos(subsolarLat) * cos(subsolarLon - lon);
            
            cosAngle = clamp(cosAngle, -1.0, 1.0);
            float angle = acos(cosAngle);
            
            float halfPi = 3.14159265359 / 2.0;
            float civilTwilight = 0.1047;
            float nauticalTwilight = 0.2094;
            float astronomicalTwilight = 0.3142;
            
            float dayNightMix = 1.0;
            
            if (showTerminator > 0.5) {
              if (angle < halfPi) {
                dayNightMix = 1.0;
              } else if (showTwilight > 0.5) {
                if (angle < halfPi + civilTwilight) {
                  float civilProgress = (angle - halfPi) / civilTwilight;
                  dayNightMix = mix(1.0, 0.7, civilProgress);
                } else if (angle < halfPi + nauticalTwilight) {
                  float nauticalProgress = (angle - halfPi - civilTwilight) / (nauticalTwilight - civilTwilight);
                  dayNightMix = mix(0.7, 0.35, nauticalProgress);
                } else if (angle < halfPi + astronomicalTwilight) {
                  float astroProgress = (angle - halfPi - nauticalTwilight) / (astronomicalTwilight - nauticalTwilight);
                  dayNightMix = mix(0.35, 0.0, astroProgress);
                } else {
                  dayNightMix = 0.0;
                }
              } else {
                dayNightMix = 0.0;
              }
            } else {
              dayNightMix = 1.0;
            }
            
            vec3 finalColor = mix(nightColor.rgb, dayColor.rgb, dayNightMix);
            
            if (angle < halfPi && specular > 0.5 && showTerminator > 0.5) {
              float spec = pow(max(1.0 - angle / halfPi, 0.0), 16.0);
              finalColor += vec3(0.2, 0.2, 0.2) * spec * dayNightMix;
            }
            
            if (showTerminator > 0.5) {
              float terminatorGlow = smoothstep(0.2, -0.2, abs(angle - halfPi));
              vec3 terminatorColor = vec3(1.0, 0.6, 0.3) * 0.3;
              finalColor += terminatorColor * terminatorGlow;
            }
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `
      });

      const globe = new window.THREE.Mesh(geometry, material);
      globe.castShadow = true;
      globe.receiveShadow = true;
      
      const axialTilt = 23.5 * (Math.PI / 180);
      globe.rotation.z = axialTilt;
      
      initialGlobeRotationRef.current = globe.rotation.y;
      
      scene.add(globe);
      globeRef.current = globe;

      ensureTzGroupV2(globe);

      const cloudGeometry = new window.THREE.SphereGeometry(1.01, 64, 64);
      const cloudMaterial = new window.THREE.MeshPhongMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        side: window.THREE.FrontSide
      });
      const clouds = new window.THREE.Mesh(cloudGeometry, cloudMaterial);
      
      clouds.rotation.z = axialTilt;
      
      scene.add(clouds);
      cloudsRef.current = clouds;
      console.log('Cloud layer added to scene with 23.5° axial tilt');

      const atmosphereGeometry = new window.THREE.SphereGeometry(1.15, 64, 64);
      
      const atmosphereMaterial = new window.THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
          }
        `,
        blending: window.THREE.AdditiveBlending,
        side: window.THREE.BackSide,
        transparent: true
      });
      
      const atmosphere = new window.THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      scene.add(atmosphere);
      console.log('Atmospheric glow added to scene');

      const ambientLight = new window.THREE.AmbientLight(0x404040, 0.4);
      scene.add(ambientLight);

      const directionalLight = new window.THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 0, 0);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 50;
      scene.add(directionalLight);
      directionalLightRef.current = directionalLight;

      const pointLight = new window.THREE.PointLight(0x4a90e2, 0.5, 10);
      pointLight.position.set(-5, 0, 0);
      scene.add(pointLight);

      if (window.THREE.OrbitControls) {
        const controls = new window.THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = false;
        controls.minDistance = 1.5;
        controls.maxDistance = 10;
        controls.autoRotate = rotationSpeed > 0;
        controls.autoRotateSpeed = rotationSpeed * 1000;
        
        controls.addEventListener('start', () => {
          isDraggingRef.current = true;
          console.log('[TZ] Drag started');
        });
        
        controls.addEventListener('end', () => {
          isDraggingRef.current = false;
          console.log('[TZ] Drag ended');
        });
        
        controlsRef.current = controls;
      }

      const starsGeometry = new window.THREE.BufferGeometry();
      const starsCount = 10000;
      const positions = new Float32Array(starsCount * 3);

      for (let i = 0; i < starsCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 2000;
      }

      starsGeometry.setAttribute('position', new window.THREE.BufferAttribute(positions, 3));
      const starsMaterial = new window.THREE.PointsMaterial({
        color: 0xffffff,
        size: 2,
        sizeAttenuation: false
      });
      const stars = new window.THREE.Points(starsGeometry, starsMaterial);
      scene.add(stars);

      raycasterRef.current = new window.THREE.Raycaster();
      raycasterRef.current.params.Line.threshold = 0.03;
      mouseRef.current = new window.THREE.Vector2();

      const fileLoader = new window.THREE.FileLoader(loadingManager);
      fileLoader.load(
        'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
        (data: any) => {
          const geojsonData = JSON.parse(data);
          processGeoJSON(geojsonData, scene, globe);
        },
        undefined,
        (error: any) => {
          console.error('Error loading GeoJSON:', error);
        }
      );

      const initializeScene = async () => {
        if (!isMounted) return;

        initializeObjectPools(globe);
        
        if (actor) {
          try {
            console.log('[GLOBE] Fetching all cities from backend...');
            const allCities = await actor.getAllCities();
            console.log(`[GLOBE] Fetched ${allCities.length} total cities from backend`);
            
            const capitals = allCities.filter(city => city.classification === 'Capital');
            const globalCities = allCities.filter(city => city.classification === 'Global City');
            const majorCities = allCities.filter(city => city.classification === 'Major City');
            
            console.log(`[GLOBE] Filtered ${capitals.length} capitals`);
            console.log('[GLOBE] First 10 capitals:', capitals.slice(0, 10));
            console.log(`[GLOBE] Filtered ${globalCities.length} global cities`);
            console.log('[GLOBE] First 10 global cities:', globalCities.slice(0, 10));
            console.log(`[GLOBE] Filtered ${majorCities.length} major cities`);
            console.log('[GLOBE] First 10 major cities:', majorCities.slice(0, 10));
            
            capitals.forEach(city => {
              createCityMarker(city.name, city.country, city.latitude, city.longitude, 0xffff00, 0.0035, globe, 'Capital');
            });
            
            globalCities.forEach(city => {
              createCityMarker(city.name, city.country, city.latitude, city.longitude, 0x87CEEB, 0.003, globe, 'Global City');
            });
            
            majorCities.forEach(city => {
              createCityMarker(city.name, city.country, city.latitude, city.longitude, 0xffffff, 0.0025, globe, 'Major City');
            });
            
            console.log(`[GLOBE] Rendered ${capitals.length + globalCities.length + majorCities.length} city markers on globe`);
            
            updateCityMarkerVisibility();
          } catch (error) {
            console.error('[GLOBE] Error fetching cities from backend:', error);
          }
        } else {
          console.warn('[GLOBE] Actor not available, skipping city marker rendering');
        }

        additionalLabels.forEach((location) => {
          createCountryLabel(location.name, [location.lon, location.lat], 0, 0, globe);
        });
        
        const homeBaseName = layoutPreferences?.defaultSearchPlace || 'Zurich';
        
        const traveledCities = travelSpotSummary?.map(([city]) => city) || [];
        
        console.log(`Home base: ${homeBaseName}`);
        console.log(`Traveled cities: ${traveledCities.join(', ')}`);
        
        const homeBaseCoords = await geocodeCity(homeBaseName);
        
        if (homeBaseCoords && traveledCities.length > 0) {
          const homeBase = {
            name: homeBaseName,
            lat: homeBaseCoords.lat,
            lon: homeBaseCoords.lon
          };
          
          const colorPalette = [
            0xffff00,
            0x00ffff,
            0xff00ff,
            0xff6600,
            0x00ff00,
            0xff0066,
            0x6600ff,
            0xffcc00
          ];
          
          for (let i = 0; i < traveledCities.length; i++) {
            const cityName = traveledCities[i];
            
            const cityCoords = await geocodeCity(cityName);
            
            if (cityCoords) {
              const traveledCity = {
                name: cityName,
                lat: cityCoords.lat,
                lon: cityCoords.lon
              };
              
              const color = colorPalette[i % colorPalette.length];
              
              const startDelay = (i * 0.5) % 5;
              
              createAnimatedCityArc(homeBase, traveledCity, scene, globe, color, startDelay);
            } else {
              console.warn(`Could not geocode traveled city: ${cityName}`);
            }
          }
          
          console.log(`Created ${traveledCities.length} personalized travel particle arcs from ${homeBaseName}`);
        } else {
          console.log('No home base or traveled cities found, skipping arc creation');
        }

        animate();

        setIsLoading(false);
      };

      const animate = () => {
        if (!isMounted) return;
        
        animationIdRef.current = requestAnimationFrame(animate);

        if (globeRef.current && globeRef.current.material && globeRef.current.material.uniforms) {
          const currentTime = currentDateRef.current;
          
          const startOfYear = new Date(Date.UTC(currentTime.getUTCFullYear(), 0, 1));
          const dayOfYear = Math.floor((currentTime.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
          
          const declinationDegrees = calculate_solar_declination(dayOfYear);
          const declinationRadians = declinationDegrees * (Math.PI / 180);
          
          const hours = currentTime.getUTCHours();
          const minutes = currentTime.getUTCMinutes();
          const seconds = currentTime.getUTCSeconds();
          const totalHours = hours + minutes / 60 + seconds / 3600;
          
          const subsolarLonDegrees = (totalHours - 12) * 15;
          const subsolarLonRadians = subsolarLonDegrees * (Math.PI / 180);
          
          globeRef.current.material.uniforms.solarDeclination.value = declinationRadians;
          globeRef.current.material.uniforms.subsolarLongitude.value = subsolarLonRadians;
          
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
          }
        }

        if (globeRef.current && Math.abs(rotationSpeedRef.current) > 1e-8) {
          globeRef.current.rotation.y += rotationSpeedRef.current;
        }

        if (cloudsRef.current && Math.abs(rotationSpeedRef.current) > 1e-8) {
          cloudsRef.current.rotation.y += rotationSpeedRef.current * 1.2;
        }

        updateCityMarkerVisibility();

        // Animate flight rocket along curved path with correct orientation (nose toward destination)
        if (flightAnimationDataRef.current && flightAnimationDataRef.current.isActive && flightRocketRef.current) {
          const animData = flightAnimationDataRef.current;
          
          // Moderate speed: complete journey in ~8 seconds, then loop continuously
          animData.progress += 0.003;
          
          if (animData.progress >= 1.0) {
            // Loop back to start for continuous animation
            animData.progress = 0;
          }
          
          // Get position on curve
          const position = animData.curve.getPointAt(animData.progress);
          flightRocketRef.current.position.copy(position);
          
          // Get tangent for orientation - this makes the nose point toward destination
          const tangent = animData.curve.getTangentAt(animData.progress);
          
          // Create a point ahead on the path for lookAt
          const lookAtPoint = position.clone().add(tangent);
          
          // Make the rocket look at the point ahead (nose toward destination)
          flightRocketRef.current.lookAt(lookAtPoint);
          
          // Set up vector to point away from globe center for proper orientation
          const up = position.clone().normalize();
          flightRocketRef.current.up.copy(up);
          
          // Make rocket visible
          flightRocketRef.current.visible = true;
        }

        animatedArcsRef.current.forEach((particleSystem) => {
          if (particleSystem && particleSystem.userData.material) {
            const userData = particleSystem.userData;
            const material = userData.material;
            
            if (!userData.isAnimating) {
              userData.delayTimer += 0.0167;
              
              if (userData.delayTimer >= userData.startDelay) {
                userData.isAnimating = true;
              }
            }
            
            if (userData.isAnimating) {
              if (userData.time === 0 && !userData.hasTriggeredStartLabel) {
                userData.hasTriggeredStartLabel = true;
                
                createCityLabel(userData.city1, userData.city1Coords, globeRef.current, true);
                
                console.log(`Particle arc animation started from ${userData.city1}, triggered start city label`);
              }
              
              userData.time += 0.005;
              
              if (userData.time >= 0.99 && !userData.hasTriggeredArrivalEvent) {
                userData.hasTriggeredArrivalEvent = true;
                
                createRippleEffect(userData.city2Coords, userData.color, globeRef.current);
                
                createCityLabel(userData.city2, userData.city2Coords, globeRef.current, false);
                
                console.log(`Particle arc completed to ${userData.city2}, triggered ripple and arrival label`);
              }
              
              if (userData.time >= 1.0) {
                userData.time = 0;
                userData.hasTriggeredStartLabel = false;
                userData.hasTriggeredArrivalEvent = false;
              }
              
              material.uniforms.time.value = userData.time;
            }
          }
        });

        rippleEffectPoolRef.current.forEach((pooledRipple) => {
          if (!pooledRipple.inUse || !pooledRipple.animationData) return;
          
          const ripple = pooledRipple.mesh;
          const animData = pooledRipple.animationData;
          
          const elapsed = Date.now() - animData.startTime;
          const progress = Math.min(elapsed / animData.duration, 1);
          
          const scale = animData.initialScale + (animData.maxScale - animData.initialScale) * progress;
          ripple.scale.set(scale, scale, scale);
          
          ripple.material.opacity = 0.9 * (1 - progress);
          
          if (progress >= 1) {
            returnRippleToPool(pooledRipple);
          }
        });

        journeyLabelPoolRef.current.forEach((pooledLabel) => {
          if (!pooledLabel.inUse || !pooledLabel.animationData) return;
          
          const element = pooledLabel.element;
          const animData = pooledLabel.animationData;
          
          const elapsed = Date.now() - animData.startTime;
          const fadeInDuration = animData.fadeInDuration;
          const displayDuration = animData.displayDuration;
          const fadeOutDuration = animData.fadeOutDuration;
          
          if (elapsed < fadeInDuration) {
            const fadeInProgress = elapsed / fadeInDuration;
            element.style.opacity = fadeInProgress.toString();
            element.style.visibility = 'visible';
          }
          else if (elapsed < displayDuration) {
            element.style.opacity = '1';
            element.style.visibility = 'visible';
          }
          else if (elapsed < displayDuration + fadeOutDuration) {
            const fadeOutProgress = (elapsed - displayDuration) / fadeOutDuration;
            element.style.opacity = (1 - fadeOutProgress).toString();
            element.style.visibility = 'visible';
          }
          else {
            returnLabelToPool(pooledLabel);
          }
        });

        if (controlsRef.current) {
          controlsRef.current.update();
        }

        if (cameraRef.current && globeRef.current) {
          const camera = cameraRef.current;
          
          const cameraDirection = camera.position.clone().normalize();
          
          countryLabelsRef.current.forEach((label) => {
            if (!label.userData.position3D) return;
            
            const labelDirection = label.userData.position3D.clone().normalize();
            
            const dotProduct = labelDirection.dot(cameraDirection);
            
            let opacity = 0.0;
            
            if (dotProduct < 0.0) {
              opacity = 0.0;
            } else if (dotProduct > 0.15) {
              opacity = 1.0;
            } else {
              opacity = (dotProduct - 0.0) / (0.15 - 0.0);
            }
            
            if (label.material && label.material.transparent !== undefined) {
              label.material.transparent = true;
              label.material.opacity = opacity;
              label.visible = opacity > 0;
            }
          });
          
          journeyLabelPoolRef.current.forEach((pooledLabel) => {
            if (!pooledLabel.inUse) return;
            
            const cssObject = pooledLabel.cssObject;
            const element = pooledLabel.element;
            
            const worldPosition = new window.THREE.Vector3();
            cssObject.getWorldPosition(worldPosition);
            
            const labelDirection = worldPosition.clone().normalize();
            
            const dotProduct = labelDirection.dot(cameraDirection);
            
            let occlusionOpacity = 0.0;
            
            if (dotProduct < 0.0) {
              occlusionOpacity = 0.0;
            } else if (dotProduct > 0.15) {
              occlusionOpacity = 1.0;
            } else {
              occlusionOpacity = (dotProduct - 0.0) / (0.15 - 0.0);
            }
            
            let animationOpacity = 1.0;
            if (pooledLabel.animationData) {
              const animData = pooledLabel.animationData;
              const elapsed = Date.now() - animData.startTime;
              const fadeInDuration = animData.fadeInDuration;
              const displayDuration = animData.displayDuration;
              const fadeOutDuration = animData.fadeOutDuration;
              
              if (elapsed < fadeInDuration) {
                animationOpacity = elapsed / fadeInDuration;
              } else if (elapsed < displayDuration) {
                animationOpacity = 1.0;
              } else if (elapsed < displayDuration + fadeOutDuration) {
                const fadeOutProgress = (elapsed - displayDuration) / fadeOutDuration;
                animationOpacity = 1.0 - fadeOutProgress;
              } else {
                animationOpacity = 0.0;
              }
            }
            
            const finalOpacity = occlusionOpacity * animationOpacity;
            
            element.style.opacity = finalOpacity.toString();
            element.style.visibility = finalOpacity > 0 ? 'visible' : 'hidden';
            cssObject.visible = finalOpacity > 0;
          });
          
          // Handle flight city labels visibility
          flightCityLabelsRef.current.forEach((label) => {
            const worldPosition = new window.THREE.Vector3();
            label.getWorldPosition(worldPosition);
            
            const labelDirection = worldPosition.clone().normalize();
            const dotProduct = labelDirection.dot(cameraDirection);
            
            let opacity = 0.0;
            
            if (dotProduct < 0.0) {
              opacity = 0.0;
            } else if (dotProduct > 0.15) {
              opacity = 1.0;
            } else {
              opacity = (dotProduct - 0.0) / (0.15 - 0.0);
            }
            
            label.element.style.opacity = opacity.toString();
            label.element.style.visibility = opacity > 0 ? 'visible' : 'hidden';
            label.visible = opacity > 0;
          });
        }

        if (composerRef.current) {
          composerRef.current.render();
        } else if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }

        if (css2DRendererRef.current && sceneRef.current && cameraRef.current) {
          css2DRendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };

      const handleResize = () => {
        if (!container || !camera || !renderer || !css2DRendererRef.current) return;
        
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
        css2DRendererRef.current.setSize(newWidth, newHeight);
        
        if (composerRef.current) {
          composerRef.current.setSize(newWidth, newHeight);
        }
      };

      window.addEventListener('resize', handleResize);

      const handleMouseMove = (event: MouseEvent) => {
        if (!rendererRef.current || !rendererRef.current.domElement) return;
        
        const canvas = rendererRef.current.domElement;
        const rect = canvas.getBoundingClientRect();
        
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (raycasterRef.current && cameraRef.current) {
          raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
          
          const frontFacingBorders = getFrontFacingBorders(borderLinesRef.current, cameraRef.current);
          
          const intersects = raycasterRef.current.intersectObjects(frontFacingBorders, true);

          const validIntersects = intersects.filter(intersect => {
            const distance = intersect.point.length();
            return Math.abs(distance - 1.0) <= 0.12;
          });

          if (validIntersects.length > 0) {
            const intersectedObject = validIntersects[0].object;
            const countryName = intersectedObject.userData.countryName;
            
            console.log(`Hovering over country: ${countryName}`);

            if (hoveredCountryRef.current !== countryName) {
              if (hoveredCountryRef.current && hoveredCountryRef.current !== highlightedCountryRef.current) {
                borderLinesRef.current.forEach((line) => {
                  if (line.userData.countryName === hoveredCountryRef.current) {
                    line.material = normalMaterialRef.current;
                  }
                });
              }

              hoveredCountryRef.current = countryName;
              
              if (countryName !== highlightedCountryRef.current) {
                borderLinesRef.current.forEach((line) => {
                  if (line.userData.countryName === countryName) {
                    line.material = highlightMaterialRef.current;
                  }
                });
              }
              
              canvas.style.cursor = 'pointer';
            }
          } else {
            if (hoveredCountryRef.current && hoveredCountryRef.current !== highlightedCountryRef.current) {
              borderLinesRef.current.forEach((line) => {
                if (line.userData.countryName === hoveredCountryRef.current) {
                  line.material = normalMaterialRef.current;
                }
              });
            }
            hoveredCountryRef.current = null;
            canvas.style.cursor = 'grab';
          }
        }
      };

      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.addEventListener('pointermove', handleMouseMove);
      }

      const handleClick = (event: MouseEvent) => {
        if (!rendererRef.current || !rendererRef.current.domElement) return;
        
        const canvas = rendererRef.current.domElement;
        const rect = canvas.getBoundingClientRect();
        
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (raycasterRef.current && cameraRef.current) {
          raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
          
          if (cityMarkersRef.current.length > 0) {
            const cityIntersects = raycasterRef.current.intersectObjects(cityMarkersRef.current, true);
            
            if (cityIntersects.length > 0) {
              const intersectedMarker = cityIntersects[0].object;
              const cityName = intersectedMarker.userData.cityName;
              const country = intersectedMarker.userData.country;
              
              setCityTooltip({
                name: cityName,
                country: country,
                x: event.clientX,
                y: event.clientY
              });
              
              console.log(`City marker clicked: ${cityName}${country ? ` (${country})` : ''}`);
              return;
            }
          }
          
          setCityTooltip(null);
          
          const frontFacingBorders = getFrontFacingBorders(borderLinesRef.current, cameraRef.current);
          
          const borderIntersects = raycasterRef.current.intersectObjects(frontFacingBorders, true);
          
          const validBorderIntersects = borderIntersects.filter(intersect => {
            const distance = intersect.point.length();
            return Math.abs(distance - 1.0) <= 0.12;
          });
          
          if (validBorderIntersects.length > 0) {
            const intersectedObject = validBorderIntersects[0].object;
            const countryName = intersectedObject.userData.countryName;
            highlightCountry(countryName);
            return;
          }
          
          const labelIntersects = raycasterRef.current.intersectObjects(countryLabelsRef.current, true);
          
          if (labelIntersects.length > 0) {
            const intersectedLabel = labelIntersects[0].object;
            const countryName = intersectedLabel.userData.countryName;
            highlightCountry(countryName);
            return;
          }
          
          if (globeRef.current) {
            const globeIntersects = raycasterRef.current.intersectObject(globeRef.current, false);
            
            if (globeIntersects.length > 0) {
              deselectCountry();
            }
          }
        }
      };

      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.addEventListener('click', handleClick);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        if (rendererRef.current && rendererRef.current.domElement) {
          rendererRef.current.domElement.removeEventListener('pointermove', handleMouseMove);
          rendererRef.current.domElement.removeEventListener('click', handleClick);
        }
      };
    };

    const processGeoJSON = (geojsonData: any, scene: any, globe: any) => {
      geojsonData.features.forEach((feature: any) => {
        const countryName = feature.properties.NAME || feature.properties.ADMIN || 'Unknown';
        const geometry = feature.geometry;
        const population = feature.properties.POP_EST || 0;
        const area = feature.properties.AREA || 0;

        let centroid: [number, number] | null = null;
        
        if (labelOverrides[countryName]) {
          const override = labelOverrides[countryName];
          centroid = [override.lon, override.lat];
        } else {
          centroid = calculateCentroid(geometry);
        }
        
        if (centroid) {
          createCountryLabel(countryName, centroid, population, area, globe);
        }

        if (geometry.type === 'Polygon') {
          createBorderLines(geometry.coordinates, countryName, scene, globe);
        } else if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach((polygon: any) => {
            createBorderLines(polygon, countryName, scene, globe);
          });
        }
      });

      console.log('Country borders and labels loaded successfully');
    };

    const calculateCentroid = (geometry: any): [number, number] | null => {
      let totalLat = 0;
      let totalLon = 0;
      let pointCount = 0;

      const processCoordinates = (coords: any) => {
        coords.forEach((ring: any) => {
          ring.forEach((coord: [number, number]) => {
            const [lon, lat] = coord;
            totalLon += lon;
            totalLat += lat;
            pointCount++;
          });
        });
      };

      if (geometry.type === 'Polygon') {
        processCoordinates(geometry.coordinates);
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: any) => {
          processCoordinates(polygon);
        });
      }

      if (pointCount === 0) return null;

      return [totalLon / pointCount, totalLat / pointCount];
    };

    const createCountryLabel = (
      name: string,
      centroid: [number, number],
      population: number,
      area: number,
      globe: any
    ) => {
      const [lon, lat] = centroid;

      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const radius = 1.02;

      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = 512;
      canvas.height = 128;

      const canvasFontSize = Math.floor((countryFontSizeRef.current / 16) * 48);
      context.font = `bold ${canvasFontSize}px ${countryFontFamily}, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      context.lineWidth = 8;
      context.strokeText(name, canvas.width / 2, canvas.height / 2);

      context.fillStyle = 'rgba(255, 255, 255, 1)';
      context.fillText(name, canvas.width / 2, canvas.height / 2);

      const texture = new window.THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      const spriteMaterial = new window.THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 1,
        depthTest: true,
        depthWrite: false
      });

      const sprite = new window.THREE.Sprite(spriteMaterial);
      sprite.position.set(x, y, z);
      
      const baseScale = 0.15;
      sprite.scale.set(baseScale * 2, baseScale * 0.5, 1);

      sprite.userData = {
        countryName: name,
        population,
        area,
        centroid: [lon, lat],
        isMajorCountry: population > 50000000 || area > 1000000,
        position3D: new window.THREE.Vector3(x, y, z),
        baseScale: baseScale
      };

      globe.add(sprite);
      countryLabelsRef.current.push(sprite);
    };
    
    const createCityMarker = (
      name: string,
      country: string,
      lat: number,
      lon: number,
      color: number,
      radius: number,
      globe: any,
      classification: string
    ) => {
      if (!window.THREE) return;
      
      const position = latLonToVector3(lat, lon, 1.02);
      if (!position) return;
      
      let geometry;
      
      if (classification === 'Global City') {
        const starPoints = 5;
        const outerRadius = radius;
        const innerRadius = radius * 0.4;
        const shape = new window.THREE.Shape();
        
        for (let i = 0; i < starPoints * 2; i++) {
          const angle = (i * Math.PI) / starPoints;
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          
          if (i === 0) {
            shape.moveTo(x, y);
          } else {
            shape.lineTo(x, y);
          }
        }
        shape.closePath();
        
        const extrudeSettings = {
          depth: radius * 0.2,
          bevelEnabled: false
        };
        
        geometry = new window.THREE.ExtrudeGeometry(shape, extrudeSettings);
      } else {
        geometry = new window.THREE.SphereGeometry(radius, 16, 16);
      }
      
      const material = new window.THREE.MeshBasicMaterial({
        color: color
      });
      
      const marker = new window.THREE.Mesh(geometry, material);
      marker.position.copy(position);
      
      if (classification === 'Global City') {
        marker.lookAt(new window.THREE.Vector3(0, 0, 0));
      }
      
      marker.userData = {
        type: 'cityMarker',
        cityName: name,
        country: country,
        classification: classification
      };
      
      globe.add(marker);
      cityMarkersRef.current.push(marker);
      
      const markerType = classification === 'Global City' ? 'light blue star' : (color === 0xffff00 ? 'yellow sphere' : 'white sphere');
      console.log(`Created ${markerType} marker for ${name} (${classification}) at (${lat}, ${lon}) with radius ${radius}`);
    };

    const createBorderLines = (coordinates: any, countryName: string, scene: any, globe: any) => {
      coordinates.forEach((ring: any) => {
        const points: any[] = [];

        ring.forEach((coord: [number, number]) => {
          const [lon, lat] = coord;
          
          const phi = (90 - lat) * (Math.PI / 180);
          const theta = (lon + 180) * (Math.PI / 180);
          
          const radius = 1.005;
          
          const x = -(radius * Math.sin(phi) * Math.cos(theta));
          const y = radius * Math.cos(phi);
          const z = radius * Math.sin(phi) * Math.sin(theta);

          points.push(new window.THREE.Vector3(x, y, z));
        });

        if (points.length > 1) {
          const lineGeometry = new window.THREE.BufferGeometry().setFromPoints(points);
          const line = new window.THREE.Line(lineGeometry, normalMaterialRef.current);
          line.userData.countryName = countryName;
          globe.add(line);
          borderLinesRef.current.push(line);
        }
      });
    };

    loadThreeJS();

    return () => {
      isMounted = false;
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (tzRafRef.current !== null) {
        cancelAnimationFrame(tzRafRef.current);
      }

      if (css2DRendererRef.current && mountRef.current) {
        mountRef.current.removeChild(css2DRendererRef.current.domElement);
      }

      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      if (composerRef.current) {
        composerRef.current = null;
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((object: any) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material: any) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }

      if (highlightMaterialRef.current) {
        highlightMaterialRef.current.dispose();
      }
      if (normalMaterialRef.current) {
        normalMaterialRef.current.dispose();
      }

      // Clean up flight rocket, path, and city labels
      removeFlightAnimation();

      borderLinesRef.current = [];
      countryLabelsRef.current = [];
      cityMarkersRef.current = [];
      highlightedCountryRef.current = null;
      animatedArcsRef.current = [];
      journeyLabelPoolRef.current = [];
      rippleEffectPoolRef.current = [];
    };
  }, [layoutPreferences, travelSpotSummary, actor]);

  useEffect(() => {
    if (onSearchPerformed) {
      // This effect will be triggered by the parent component
    }
  }, [onSearchPerformed]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-blue-900 to-black text-white">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-400 mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">3D Globe Loading Failed</h3>
          <p className="text-gray-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-blue-900 to-black overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-blue-900 to-black text-white z-10">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <div className="text-center">
              <div className="text-lg font-semibold mb-1">Loading Interactive Globe</div>
              <div className="text-sm text-blue-200">Preparing high-resolution Earth visualization with real-time day/night terminator...</div>
            </div>
          </div>
        </div>
      )}
      
      {!isLoading && cityTooltip && (
        <div 
          className="fixed z-[1001] bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-yellow-400/50 pointer-events-none"
          style={{
            left: `${cityTooltip.x + 10}px`,
            top: `${cityTooltip.y + 10}px`,
          }}
        >
          <div className="text-white text-sm font-semibold">{cityTooltip.name}</div>
          {cityTooltip.country && (
            <div className="text-yellow-300 text-xs">{cityTooltip.country}</div>
          )}
        </div>
      )}
      
      {/* Right-side controls - Day/Night panels with no spacing between them */}
      {!isLoading && (
        <div id="globe-right-controls" className="fixed bottom-16 right-5 z-[1000] flex flex-col">
          {/* Day/Night Terminator Panel - Positioned directly above Day/Night Visualization Panel with no gap */}
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20 flex gap-2 min-w-[200px]">
            <button
              onClick={() => {
                const newValue = !showTerminator;
                if (onTerminatorChange) onTerminatorChange(newValue);
              }}
              className={`flex-1 px-2 py-1 text-white text-[10px] font-medium rounded-md transition-colors duration-200 border ${
                showTerminator 
                  ? 'bg-yellow-500/80 hover:bg-yellow-600/80 border-yellow-400/30' 
                  : 'bg-gray-500/50 hover:bg-gray-600/50 border-gray-400/30'
              }`}
              title="Toggle day/night terminator line"
            >
              Terminator
            </button>
            
            <button
              onClick={() => {
                const newValue = !showTwilight;
                if (onTwilightChange) onTwilightChange(newValue);
              }}
              className={`flex-1 px-2 py-1 text-white text-[10px] font-medium rounded-md transition-colors duration-200 border ${
                showTwilight 
                  ? 'bg-purple-500/80 hover:bg-purple-600/80 border-purple-400/30' 
                  : 'bg-gray-500/50 hover:bg-gray-600/50 border-gray-400/30'
              }`}
              title="Toggle twilight zones (civil, nautical, astronomical)"
            >
              Twilight
            </button>
          </div>

          {/* Day/Night Visualization Panel - Positioned directly below Day/Night Terminator Panel with no gap */}
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20 flex flex-col gap-1.5 min-w-[200px]">
            <div className="text-white text-[9px] text-center bg-blue-500/20 rounded px-1.5 py-0.5">
              {isYearlyAnimation ? formatYearlyDate(currentDate) : formatHourlyDate(currentDate)}
            </div>
            
            <div className="flex gap-1.5">
              <button
                onClick={syncToRealTime}
                className="flex-1 px-1.5 py-0.5 bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-600/80 hover:to-purple-600/80 text-white text-[9px] font-medium rounded-md transition-all duration-200 border border-blue-400/30"
                title="Sync to current real-world UTC time"
              >
                Real
              </button>
              
              <button
                onClick={toggleAnimation}
                className="flex-1 px-1.5 py-0.5 bg-orange-500/80 hover:bg-orange-600/80 text-white text-[9px] font-medium rounded-md transition-colors duration-200 border border-orange-400/30 flex items-center justify-center gap-0.5"
              >
                {isAnimating && !isYearlyAnimation ? (
                  <>
                    <Pause className="h-2 w-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-2 w-2" />
                    Hourly
                  </>
                )}
              </button>
              
              <button
                onClick={isYearlyAnimation ? pauseYearlyAnimation : playYearlyAnimation}
                className="flex-1 px-1.5 py-0.5 bg-green-500/80 hover:bg-green-600/80 text-white text-[9px] font-medium rounded-md transition-colors duration-200 border border-green-400/30 flex items-center justify-center gap-0.5"
              >
                {isYearlyAnimation ? (
                  <>
                    <Pause className="h-2 w-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-2 w-2" />
                    Year
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ minHeight: '100vh' }}
      />
    </div>
  );
}
