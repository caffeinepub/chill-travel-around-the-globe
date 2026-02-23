# Specification

## Summary
**Goal:** Add local time and UTC offset time displays below the UTC offset selector.

**Planned changes:**
- Display current local time below the UTC offset selector using the existing date-time format
- Display UTC offset time directly below local time that dynamically updates when clicking different UTC offset buttons
- Calculate and show adjusted time based on selected offset relative to local time (e.g., UTC+8 10:19 AM becomes UTC+9 11:19 AM)
- Position both time displays within the specified container element below the UTC offset selector
- Ensure both times update in real-time

**User-visible outcome:** Users can see their local time and a dynamically calculated UTC offset time below the UTC offset selector. When they click different UTC offset buttons, the offset time adjusts accordingly to show what time it would be in that timezone.
