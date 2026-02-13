# Specification

## Summary
**Goal:** Add a placeholder “Map” button with a visible “2D” icon next to the existing “Flying” button in the Travelogue journey cards.

**Planned changes:**
- In the Travelogue UI, render a new “Map” button immediately to the right of the “Flying” button wherever the Flying button appears within each journey card’s action controls.
- Include a clear visible “2D” mark/icon alongside the “Map” label on the new button (text-based is acceptable).
- Make the Map button a no-op placeholder: it should not navigate, open dialogs, show toasts, call APIs, or otherwise change app state/UI beyond normal press visuals.

**User-visible outcome:** In Travelogue, journey cards that have a “Flying” button will also show a “Map” button with a “2D” icon next to it, and clicking “Map” does nothing.
