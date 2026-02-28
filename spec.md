# Specification

## Summary
**Goal:** Insert the TimeControls component directly below the Global Control button in the left panel of LocationMapExplorer, with full solar terminator animation functionality, without changing any other part of the UI.

**Planned changes:**
- In the left panel of `LocationMapExplorer.tsx`, insert the `TimeControls` component directly below the Global Control button section (which sits below the Day/Night Terminator and Twilight Zone controls)
- Wire up time state from `LocationMapExplorer` so the solar terminator on `InteractiveGlobe` updates in response to TimeControls
- Ensure TimeControls supports Real, Hourly, and Yearly animation modes with play/pause controls that animate the terminator across the 3D globe
- No other layout, styling, ordering, or component positions anywhere in the UI are changed

**User-visible outcome:** Users can see and interact with Time Controls (Real, Hourly, Yearly modes with play/pause) below the Global Control button in the left panel, and the solar terminator on the 3D globe animates accordingly. Everything else in the UI remains identical to before.
