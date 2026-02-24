# Specification

## Summary
**Goal:** Update timezone display format to show UTC offset within the date string and add local time display above UTC Offset Selection.

**Planned changes:**
- Modify WebsiteLayoutPanel to display local time in format "Month Day, Year (UTC +/-offset)" instead of showing UTC offset separately
- Add local time display above the "Select UTC Offset" button in LocationMapExplorer that shows current local time with UTC offset in the same format
- Ensure both displays update dynamically when location changes

**User-visible outcome:** Users will see a cleaner, more integrated timezone display format showing local time with its UTC offset in parentheses, and will have immediate visibility of the current local time when selecting UTC offsets on the map explorer.
