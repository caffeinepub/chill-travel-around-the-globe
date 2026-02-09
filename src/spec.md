# Specification

## Summary
**Goal:** Enhance the selected “Day N” labels in Doodle and Retro itinerary views to also show the corresponding date and weekday beneath the day number.

**Planned changes:**
- Update the selected Day label span in **ScrapbookItineraryView (Doodle)** to render three lines: “Day N”, the day’s date formatted as “DD Mon” (e.g., “11 Feb”), and the weekday formatted as “Wed”, using the actual date for that rendered day group.
- Update the selected Day label span in **RetroPostcardItineraryView (Retro)** to render the same three-line content (Day, date, weekday) for the corresponding rendered day group.
- Keep all surrounding structure/layout unchanged, modifying only the text content within the two specified span elements.

**User-visible outcome:** In both Doodle and Retro itinerary views, the Day label for each day section shows “Day N” plus the correct date and weekday on separate lines (e.g., “Day 1 / 11 Feb / Wed”), without any other UI changes.
