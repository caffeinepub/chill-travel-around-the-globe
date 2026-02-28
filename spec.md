# Specification

## Summary
**Goal:** Extract the time controls UI into a new standalone React component file without modifying the existing InteractiveGlobe.tsx.

**Planned changes:**
- Create `frontend/src/components/TimeControls.tsx` as a new file
- The component accepts props for time mode (Real/Hourly/Yearly), time mode change handler, current time, and time change handler
- The component renders the time button and Real/Hourly/Yearly toggle controls identically to the existing bottom-right panel in InteractiveGlobe.tsx
- `InteractiveGlobe.tsx` is not modified

**User-visible outcome:** No visible change to the app; the new TimeControls component exists as a standalone file ready for integration in a future step.
