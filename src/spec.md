# Specification

## Summary
**Goal:** Add a “Map” action in Travelogue journeys that switches to the existing 2D map and shows the selected journey’s schedule items as map markers based on their saved locations.

**Planned changes:**
- Add a new “Map” button (with a 2D/map-style icon) to each journey card’s action row in Travelogue, positioned next to the existing “Flying” button.
- Wire TraveloguePanel to LocationMapExplorer via a new callback (e.g., `onMapJourney(...)`) so clicking “Map” switches the main explorer into the existing 2D map mode.
- Pass the selected journey identifier and its schedule items (or derived map points) into MapComponent so it renders those items as markers using each item’s `location` input (via existing location lookup/geocoding logic).
- Handle unmappable schedule item locations gracefully by showing a user-visible error/toast while keeping the app stable.

**User-visible outcome:** Users can click “Map” on a journey to immediately view that journey’s schedule items plotted on the existing 2D map, with a notification if some locations cannot be displayed.
