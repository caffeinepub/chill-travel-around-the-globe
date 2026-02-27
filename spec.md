# Specification

## Summary
**Goal:** Update the travelogue fetch/read logic to query travelogue entries by `journeyId` instead of by city name or a global key.

**Planned changes:**
- Update the travelogue fetch function/hook to accept and use `journeyId` as the lookup key when querying the backend
- Ensure each journey fetches its own independent travelogue entries, so two journeys sharing the same city return separate data

**User-visible outcome:** Each journey displays its own travelogue entries independently, without mixing data from other journeys that share the same city.
