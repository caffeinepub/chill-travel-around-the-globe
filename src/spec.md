# Specification

## Summary
**Goal:** Change the Travelogue “Map” button to navigate to the existing 2D map view and automatically focus the selected journey city and (when applicable) the originating schedule item, without showing a popup.

**Planned changes:**
- Update the Travelogue header “Map” button so it navigates to the existing 2D map view (LocationMapExplorer) instead of opening a dialog/popup, and triggers the existing search/centering flow for the selected journey city.
- When the Map action originates from a specific schedule item, pass enough context so the 2D map view highlights/focuses that schedule item (e.g., opening/spotlighting its marker/popup).
- Implement URL/state handoff via existing URL param utilities so the 2D view can restore the selected journey city and schedule item after a page refresh.
- Limit the behavior change to only the identified Map button control and its current popup container, ensuring other dialogs continue to work unchanged.

**User-visible outcome:** Clicking “Map” takes the user to the 2D map view centered on the selected journey city; if launched from a schedule item, that item is automatically highlighted on the map, and the selection persists on refresh.
