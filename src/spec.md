# Specification

## Summary
**Goal:** Refine the itinerary header date range formatting and improve schedule row readability on narrow screens while shortening a specific connector arrow.

**Planned changes:**
- Update the selected journey period header text to the format `DD Mon YY (Ddd) ~ DD Mon YY (Ddd)` (e.g., `18 Feb 26 (Wed) ~ 20 Feb 26 (Fri)`), using ` ~ ` as the separator.
- Adjust the selected schedule row container so schedule items wrap onto additional line(s) when the viewport is too narrow, avoiding horizontal scrolling while keeping the day label on the left and content on the right.
- Reduce the length of the selected dotted curved connector arrow SVG by ~50% while preserving its existing style and arrowhead.

**User-visible outcome:** The itinerary date range displays in the requested compact format, schedule items wrap cleanly on smaller windows without horizontal scrolling, and the specified connector arrow appears noticeably shorter.
