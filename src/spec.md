# Specification

## Summary
**Goal:** Visually connect same-day schedule items on the 2D map with route lines, ordered chronologically and styled consistently with each day’s existing color.

**Planned changes:**
- Group schedule-item map markers by calendar day and draw a continuous route line for each day connecting that day’s schedule items.
- Sort each day’s schedule items by time (earliest to latest) to determine the connection order of the route line.
- Style each day’s route line stroke color to match the existing day-based schedule item logo/label color logic.
- Ensure route lines update/replace correctly when schedule items change, and draw no line for days with fewer than two schedule items with valid coordinates.

**User-visible outcome:** On the 2D map, schedule items that occur on the same date are connected by a clearly visible line in that day’s color, following the day’s timeline from earliest to latest, without affecting other map layers.
