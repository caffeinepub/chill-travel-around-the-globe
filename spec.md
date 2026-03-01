# Specification

## Summary
**Goal:** Fix two bugs in the 2D map within the Travelogue panel: the map not rendering on first click, and markers from multiple journeys sharing the same city not all appearing.

**Planned changes:**
- Ensure the Leaflet map initializes only after its container is fully mounted and visible, and calls `invalidateSize` so tiles and markers render correctly on the first button click without requiring a hard refresh.
- Fix marker deduplication/keying logic so that when multiple journeys share the same city, markers from all journeys are shown — keyed per schedule item (e.g., by schedule item ID or journey+item combination) rather than by city name alone.

**User-visible outcome:** Clicking the 2D map button in the Travelogue panel immediately displays the map with all markers on the first click, and all journey markers appear correctly even when multiple journeys share the same city.
