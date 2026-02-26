# Specification

## Summary
**Goal:** Filter travelogue entries in TraveloguePanel by the selected journey's unique ID so that each journey displays only its own independent travelogue entries.

**Planned changes:**
- In `TraveloguePanel.tsx`, filter displayed schedule items by matching their `journeyId` to the currently selected journey's ID
- Ensure two journeys to the same city each show completely separate travelogue entries
- Schedule items without a `journeyId` are excluded or handled gracefully without mixing into any journey's travelogue
- Travelogue display updates correctly when switching between journeys

**User-visible outcome:** Each journey's travelogue panel shows only its own entries, so two trips to the same city no longer share or mix travelogue items.
