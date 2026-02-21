# Specification

## Summary
**Goal:** Enable full date and time editing in the journey edit modal with validation to ensure schedule items remain within the journey period.

**Planned changes:**
- Replace read-only date displays with interactive calendar popovers matching the Add New Journey form
- Add time selection controls (hour and minute dropdowns) for both start and end times
- Implement validation to ensure all schedule items fall within the updated journey date/time range
- Update the backend mutation to persist modified journey dates and times

**User-visible outcome:** Users can fully edit journey start and end dates/times in the edit modal, with clear validation feedback if changes would invalidate existing schedule items.
