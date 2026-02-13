# Specification

## Summary
**Goal:** Wire the Travelogue journey “Map” button to open the existing 2D map in the context of the selected journey and show only that journey’s schedule items by location.

**Planned changes:**
- Update the Travelogue journey card “Map” button to navigate to the existing Leaflet-based 2D Map view while passing/setting the clicked journey as the active map context.
- Adjust the 2D Map view to fetch and render schedule markers/popups only for schedule items belonging to the selected journey, based on each item’s saved location input (handling empty/invalid locations without crashing).
- Add backend query support and a corresponding React Query hook to retrieve schedule items (including location input and coordinates) filtered by a single journey identifier, avoiding fetching schedule items for all journeys.

**User-visible outcome:** Clicking “Map” on a specific journey opens the existing 2D map and displays only that journey’s schedule items at their saved locations (with items that can’t be placed handled gracefully).
