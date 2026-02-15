# Specification

## Summary
**Goal:** Make the Travelogue journey “2D Map” button switch to the existing 2D map view, center on the journey’s primary location, and show only that journey’s schedule items as map markers.

**Planned changes:**
- Wire the Travelogue journey “2D Map” button to toggle the main explorer into the existing Leaflet 2D map view (replacing the 3D globe while active).
- On click, center the 2D map using the selected journey’s city/primary location as the existing search query input.
- Pass journey context from TraveloguePanel to LocationMapExplorer via an explicit callback/event (parent-to-child plumbing) without modifying the listed immutable frontend paths.
- When opened via a journey’s 2D Map button, render markers for that journey’s schedule items only, using each item’s location field for placement; handle unlocatable items gracefully without breaking the map.

**User-visible outcome:** Clicking a journey’s “2D Map” button in Travelogue switches the explorer to the existing 2D map, centers on that journey’s area, and displays markers for that journey’s schedule items (and not others).
