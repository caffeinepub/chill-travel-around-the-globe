# Specification

## Summary
**Goal:** Allow multiple journeys per the same city, each with an optional custom title, and display them grouped by city in the journey panel.

**Planned changes:**
- Remove the uniqueness constraint on city in the backend Journey data type and add an optional `customTitle` field; fall back to journey date when no title is provided
- Update add-journey and edit-journey mutation hooks to include the optional `customTitle` field
- Add an optional "Journey Title" text input to the add and edit journey forms in the TraveloguePanel
- Group journeys by city name in the TraveloguePanel, with each city group collapsible and listing all journeys under it showing their custom title or date as fallback

**User-visible outcome:** Users can create multiple journeys for the same city (each with an optional custom title), and the journey list panel groups all journeys for the same city under a single collapsible city header.
