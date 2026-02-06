/**
 * Time Zone Overlay V2
 * Timezone boundary rendering on 3D globe with proper sphere mapping and quarter-hour precision
 */

const EPS = 1e-9;
const MATCH_TOL = 0.126;

/**
 * Runtime flag to enable/disable translucent fill mesh for hovered timezone
 * When true: creates a translucent fill mesh for all polygon components
 * When false: only draws the magenta LineLoop border (default behavior)
 */
export const TZ_FILL_ENABLED = true;

/**
 * Round offset to nearest quarter hour (0.25 hour increments)
 * Returns values like 5.75, 6.5, 8.75, etc.
 */
function roundToQuarterHour(hours: number): number {
  // Round to nearest 0.25 (quarter hour)
  return Math.round(hours * 4) / 4;
}

/**
 * Standard globe coordinate converter - matches InteractiveGlobe.tsx
 * Converts latitude/longitude to 3D vector position on globe surface
 */
function tzLatLonToVector3(lat: number, lon: number, R: number) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new window.THREE.Vector3(
    -(R * Math.sin(phi) * Math.cos(theta)),
    (R * Math.cos(phi)),
    (R * Math.sin(phi) * Math.sin(theta))
  );
}

/**
 * Unwrap longitudes so each step is within ±180°
 * Ensures continuous path without antimeridian jumps
 */
function unwrapLongitudes(ring: number[][]): number[][] {
  if (ring.length === 0) return ring;
  
  const unwrapped: number[][] = [];
  let prevLon = ring[0][0];
  
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    let adjustedLon = lon;
    
    // Adjust longitude to be within ±180° of previous longitude
    while (adjustedLon - prevLon > 180) adjustedLon -= 360;
    while (adjustedLon - prevLon < -180) adjustedLon += 360;
    
    unwrapped.push([adjustedLon, lat]);
    prevLon = adjustedLon;
  }
  
  return unwrapped;
}

/**
 * Drop closing duplicate point if present with EPS tolerance
 * Removes the last point if it's identical to the first within tolerance
 */
function dropClosingDuplicate(ring: number[][]): number[][] {
  if (ring.length < 2) return ring;
  
  const first = ring[0];
  const last = ring[ring.length - 1];
  
  // Check if first and last points are identical within EPS tolerance
  const lonDiff = Math.abs(first[0] - last[0]);
  const latDiff = Math.abs(first[1] - last[1]);
  
  if (lonDiff < EPS && latDiff < EPS) {
    return ring.slice(0, -1);
  }
  
  return ring;
}

/**
 * Ensure timezone overlay group exists and is properly parented to globe
 * Returns the group for adding timezone boundary meshes
 */
export function ensureTzGroupV2(globeMesh: any) {
  if (!window.THREE || !globeMesh) return null;
  let group = globeMesh.getObjectByName('tzOverlayGroup');
  if (!group) {
    group = new window.THREE.Group();
    group.name = 'tzOverlayGroup';
    group.renderOrder = 10;
    globeMesh.add(group); // inherit transforms automatically
    console.log(`[TZ] Created tzGroup with renderOrder = ${group.renderOrder}`);
  }
  return group;
}

/**
 * Get all timezone IDs for a given UTC offset with quarter-hour precision
 * Uses Intl API to calculate offsets dynamically (DST-aware)
 * Filters out "Etc/" zones
 */
export function getTzidsForOffset(tzData: any, utcOffset: number): string[] {
  if (!tzData || !tzData.features) {
    console.warn('[TZ OFFSET] No timezone data available');
    return [];
  }

  const tzids: string[] = [];
  const now = new Date();

  for (const feature of tzData.features) {
    const tzid = feature.properties.tzid;

    // Skip "Etc/" zones
    if (tzid.startsWith('Etc/')) continue;

    try {
      // Calculate UTC offset using Intl API (DST-aware)
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tzid }));
      const calculatedOffset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);

      // Round to nearest quarter hour
      const roundedOffset = roundToQuarterHour(calculatedOffset);

      // Compare with tolerance
      if (Math.abs(roundedOffset - utcOffset) < MATCH_TOL) {
        tzids.push(tzid);
      }
    } catch (error) {
      // Skip timezones that can't be processed
      console.warn(`[TZ OFFSET] Could not process timezone: ${tzid}`, error);
    }
  }

  console.log(`[TZ OFFSET] Found ${tzids.length} timezones for UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`);
  return tzids;
}

/**
 * Render timezone boundaries for a given UTC offset
 * Renders all timezones matching the specified offset using quarter-hour precision
 */
export function renderTimezoneByOffset(
  tzData: any,
  globeMesh: any,
  utcOffset: number
) {
  if (!window.THREE || !globeMesh || !tzData) return;

  const group = ensureTzGroupV2(globeMesh);
  if (!group) return;

  // Calculate overlay radius from globe mesh
  if (!globeMesh.geometry.boundingSphere) {
    globeMesh.geometry.computeBoundingSphere();
  }
  const baseR = globeMesh.geometry.boundingSphere.radius * globeMesh.scale.x;
  const overlayR = baseR * 1.0005;

  // Get all timezone IDs for the specified offset
  const tzids = getTzidsForOffset(tzData, utcOffset);

  // Render each timezone
  for (const tzid of tzids) {
    renderSingleTimezone(tzData, globeMesh, tzid);
  }

  console.log(`[TZ] Rendered ${tzids.length} timezones for UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`);
}

/**
 * Render a single timezone by finding its feature and rendering all polygons
 * Implements simplified rendering driven strictly by matched tzids list
 */
export function renderSingleTimezone(
  tzData: any,
  globeMesh: any,
  tzid: string
) {
  if (!window.THREE || !globeMesh || !tzData) return;

  const group = ensureTzGroupV2(globeMesh);
  if (!group) return;

  // Calculate overlay radius from globe mesh
  if (!globeMesh.geometry.boundingSphere) {
    globeMesh.geometry.computeBoundingSphere();
  }
  const baseR = globeMesh.geometry.boundingSphere.radius * globeMesh.scale.x;
  const overlayR = baseR * 1.0005;

  // Find the feature with matching tzid
  const feature = tzData.features.find((f: any) => f.properties.tzid === tzid);
  if (!feature) {
    console.warn(`[TZ] Feature not found for tzid: ${tzid}`);
    return;
  }

  const { geometry } = feature;

  if (geometry.type === 'Polygon') {
    // For Polygon, render each component
    renderPolygon(geometry.coordinates, group, overlayR, tzid, geometry.type);
  } else if (geometry.type === 'MultiPolygon') {
    // For MultiPolygon, render each polygon component
    geometry.coordinates.forEach((polygon: any) => {
      renderPolygon(polygon, group, overlayR, tzid, geometry.type);
    });
  }

  console.log(`[TZ] Rendered timezone: ${tzid}`);
}

/**
 * Render a single polygon with holes support
 * Process outer ring and each hole with unwrapLongitudes and dropClosingDuplicate
 */
function renderPolygon(
  rings: number[][][],
  group: any,
  radius: number,
  tzid: string,
  geometryType: string
) {
  if (!rings || rings.length === 0) return;

  const outerRing = rings[0];
  
  // Process outer ring: unwrap longitudes, then drop closing duplicate
  const processedOuterRing = dropClosingDuplicate(unwrapLongitudes(outerRing));
  
  // Build THREE.Shape from processed outer ring
  const shape = new window.THREE.Shape();
  
  if (processedOuterRing.length < 3) return;
  
  // Set first point
  shape.moveTo(processedOuterRing[0][0], processedOuterRing[0][1]);
  
  // Add remaining points
  for (let i = 1; i < processedOuterRing.length; i++) {
    shape.lineTo(processedOuterRing[i][0], processedOuterRing[i][1]);
  }
  
  // Close the path
  shape.closePath();
  
  // Process holes (if any)
  let holeCount = 0;
  for (let i = 1; i < rings.length; i++) {
    const hole = rings[i];
    const processedHole = dropClosingDuplicate(unwrapLongitudes(hole));
    
    if (processedHole.length < 3) continue;
    
    const holePath = new window.THREE.Path();
    holePath.moveTo(processedHole[0][0], processedHole[0][1]);
    
    for (let j = 1; j < processedHole.length; j++) {
      holePath.lineTo(processedHole[j][0], processedHole[j][1]);
    }
    
    holePath.closePath();
    shape.holes.push(holePath);
    holeCount++;
  }
  
  console.log(`[TZ] Polygon for ${tzid}: outer ring ${processedOuterRing.length} points, ${holeCount} holes`);
  
  // Render the processed polygon
  renderSinglePolygon(processedOuterRing, shape, group, radius, tzid, geometryType, holeCount);
}

/**
 * Render a single polygon border as LineLoop and a translucent fill
 * Always draws the magenta LineLoop border on top (renderOrder 2)
 * Always creates a translucent fill mesh for every polygon component (renderOrder 1)
 */
function renderSinglePolygon(
  outerRing: number[][],
  shape: any,
  group: any,
  radius: number,
  tzid: string,
  geometryType: string,
  holeCount: number
) {
  if (!window.THREE || outerRing.length < 3) return;

  // Build LineLoop border from the outer ring
  const borderPoints = outerRing.map(([lon, lat]) => tzLatLonToVector3(lat, lon, radius));
  const borderGeometry = new window.THREE.BufferGeometry().setFromPoints(borderPoints);
  
  // Create border material with magenta color
  const borderMaterial = new window.THREE.LineBasicMaterial({
    color: 0xff00ff, // magenta
    transparent: true,
    opacity: 0.9,
    linewidth: 2,
    depthTest: true,
    depthWrite: false
  });
  
  // Create LineLoop border (always visible on top)
  const border = new window.THREE.LineLoop(borderGeometry, borderMaterial);
  border.renderOrder = 2;
  border.frustumCulled = false;
  group.add(border);

  console.log(`[TZ] Drew border with renderOrder = ${border.renderOrder}`);

  // Create translucent fill mesh for every polygon component
  try {
    // Create ShapeGeometry from the THREE.Shape (includes holes)
    const shapeGeometry = new window.THREE.ShapeGeometry(shape);
    
    // Project each vertex to the sphere using tzLatLonToVector3
    const positions = shapeGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const lon = positions.getX(i);
      const lat = positions.getY(i);
      const projected = tzLatLonToVector3(lat, lon, radius);
      positions.setXYZ(i, projected.x, projected.y, projected.z);
    }
    positions.needsUpdate = true;
    
    // Compute bounding sphere to avoid culling issues
    shapeGeometry.computeBoundingSphere();
    
    // Create translucent material with updated properties
    const fillMaterial = new window.THREE.MeshBasicMaterial({
      color: 0xff00ff, // magenta
      transparent: true,
      opacity: 0.15,
      depthTest: true,
      depthWrite: false,
      blending: window.THREE.NormalBlending,
      side: window.THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    
    // Create fill mesh
    const fill = new window.THREE.Mesh(shapeGeometry, fillMaterial);
    fill.renderOrder = 1;
    group.add(fill);
    
    console.log(`[TZ] Created fill mesh with renderOrder = ${fill.renderOrder} for tzid=${tzid} (${geometryType}), holes=${holeCount}`);
  } catch (error) {
    console.error(`[TZ] Failed to create fill mesh for ${tzid}:`, error);
  }
}

/**
 * Clear all timezone overlays from the globe
 */
export function clearTimezoneOverlays(globeMesh: any) {
  if (!globeMesh) return;
  
  const group = globeMesh.getObjectByName('tzOverlayGroup');
  if (group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      group.remove(child);
    }
  }
}

/**
 * Get lat/lon from raycaster intersection point on globe
 * Normalize longitude by subtracting 180° and looping to keep it in [-180, 180)
 */
export function getLatLonFromIntersection(point: any): { lat: number; lon: number } | null {
  if (!point) return null;
  
  const { x, y, z } = point;
  const r = Math.sqrt(x * x + y * y + z * z);
  
  // Calculate latitude
  const lat = Math.asin(y / r) * (180 / Math.PI);
  
  // Calculate longitude
  let lon = Math.atan2(z, -x) * 180 / Math.PI;
  
  // Subtract 180° and normalize to [-180, 180) using a loop
  lon = lon - 180;
  while (lon >= 180) lon -= 360;
  while (lon < -180) lon += 360;
  
  return { lat, lon };
}

/**
 * Find timezone ID from GeoJSON at given lat/lon
 */
export function findTimezoneAtLatLon(
  tzData: any,
  lat: number,
  lon: number
): string | null {
  if (!tzData || !tzData.features) return null;
  
  // Normalize longitude to [-180, 180)
  let normalizedLon = lon;
  while (normalizedLon >= 180) normalizedLon -= 360;
  while (normalizedLon < -180) normalizedLon += 360;
  
  // Check each feature
  for (const feature of tzData.features) {
    if (pointInFeature(lat, normalizedLon, feature)) {
      return feature.properties.tzid || null;
    }
  }
  
  return null;
}

/**
 * Check if a point is inside a GeoJSON feature
 */
function pointInFeature(lat: number, lon: number, feature: any): boolean {
  const geometry = feature.geometry;
  
  if (geometry.type === 'Polygon') {
    return pointInPolygon(lat, lon, geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon: any) => 
      pointInPolygon(lat, lon, polygon)
    );
  }
  
  return false;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function pointInPolygon(lat: number, lon: number, rings: number[][][]): boolean {
  // Check outer ring
  const outerRing = rings[0];
  if (!pointInRing(lat, lon, outerRing)) {
    return false;
  }
  
  // Check holes (if point is in any hole, it's outside the polygon)
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lat, lon, rings[i])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Ray casting algorithm to check if point is inside a ring
 */
function pointInRing(lat: number, lon: number, ring: number[][]): boolean {
  let inside = false;
  
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}
