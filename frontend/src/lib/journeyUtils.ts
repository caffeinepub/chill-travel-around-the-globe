import type { Journey } from '../backend';

/**
 * Returns a unique key for a journey that can be used as the `journeyCity`
 * parameter in schedule backend calls. This ensures each journey has its own
 * independent set of schedule/travelogue items, even when multiple journeys
 * share the same city.
 */
export function getJourneyKey(journey: Journey): string {
  return `${journey.city}|${journey.createdAt.toString()}`;
}
