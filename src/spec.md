# Specification

## Summary
**Goal:** Improve the itinerary header’s journey period formatting/placement and make the schedule layout wrap cleanly with between-row dotted connectors.

**Planned changes:**
- Update the journey period text in the itinerary header to render as `DD MMM YY (ddd) ~ DD MMM YY (ddd)` using the existing `startDate`/`endDate` values (no hard-coded dates).
- Adjust the header layout so the journey period displays immediately next to the selected heading element on the same line (wrapping allowed on narrow screens while keeping the association).
- Update the selected schedule row containers so schedule items wrap onto additional lines/rows when they exceed available width (no truncation and no horizontal scrolling), preserving chronological order and the doodle/retro styling.
- Change the selected connector/arrow area so dotted arrow connectors render only between rows (including wrap-induced rows), connecting the end of the previous row to the start of the next row.
- Reduce the between-row dotted arrow connector length by approximately 50% while maintaining the same dotted stroke style.
- Remove truncation/line-clamping from the selected schedule text elements and allow multi-line wrapping with appropriate word-breaking to prevent overflow.

**User-visible outcome:** The header shows a properly formatted date range next to the heading, and the schedule remains fully readable on different screen sizes with wrapped rows and shorter dotted connectors between rows only.
