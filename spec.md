# Specification

## Summary
**Goal:** Add a duplicate of the time button to the left-side controls panel in InteractiveGlobe.tsx, positioned directly below the Day/Night Terminator and Twilight Zone toggle controls.

**Planned changes:**
- In `InteractiveGlobe.tsx`, render a duplicate of the time button in the left-side controls panel, placed directly below the Day/Night Terminator and Twilight Zone controls.
- The duplicated button shares the same `onClick` handler and state bindings as the original.
- The original time button in the right bottom panel remains unchanged.

**User-visible outcome:** The time button appears in both the left-side controls panel (below the Day/Night Terminator and Twilight Zone toggles) and the original right bottom panel, and both buttons work identically.
