# Specification

## Summary
**Goal:** Ensure the 2D map correctly and immediately shows the selected journey’s schedule markers/routes from the Travelogue, improve route arrow visibility, and enrich schedule marker popup details.

**Planned changes:**
- Fix the 2D map schedule overlay so schedule markers and route lines render immediately after clicking the Travelogue “Map (2D)” button, and re-render when the selected journey/city filter or schedule query results change.
- Increase the strength of the route arrow effect on 2D map route lines by making arrows more frequent and slightly larger while preserving correct travel direction.
- Update the schedule marker popup content to include 12-hour time with AM/PM, day context (day label and/or weekday + date), and clearer subject/title display (activity as primary title, location as secondary when available), with English user-facing text.

**User-visible outcome:** Clicking “Map (2D)” in the Travelogue immediately shows the correct journey’s schedule markers and route (no refresh needed); route direction arrows are easier to see; and schedule marker popups display clearer time/day/title information.
