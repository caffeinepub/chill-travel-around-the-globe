import React from 'react';
import { useGetScheduleItems } from '../../hooks/useQueries';
import type { ScheduleItem } from '../../backend';

interface RetroItineraryDialogContentProps {
  journeyKey: string;
  journeyCity: string;
}

function formatDate(dateNs: bigint): string {
  const ms = Number(dateNs) / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(dateNs: bigint): string {
  const ms = Number(dateNs) / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RetroItineraryDialogContent({
  journeyKey,
  journeyCity,
}: RetroItineraryDialogContentProps) {
  const { data: scheduleItems, isLoading } = useGetScheduleItems(journeyKey);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!scheduleItems || scheduleItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">📮</div>
        <p className="text-lg font-semibold text-amber-800 dark:text-amber-300">No postcards yet</p>
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
          Add schedule items for <span className="font-medium">{journeyCity}</span> in the Admin Panel
        </p>
      </div>
    );
  }

  // Group by date
  const grouped = scheduleItems.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const ms = Number(item.date) / 1_000_000;
    const dateKey = new Date(ms).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  const sortedDateKeys = Object.keys(grouped).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div className="p-4 space-y-6">
      {sortedDateKeys.map((dateKey, dayIdx) => {
        const items = grouped[dateKey]
          .slice()
          .sort((a, b) => a.time.localeCompare(b.time));
        const firstItem = items[0];

        return (
          <div
            key={dateKey}
            className="border-2 border-amber-700 dark:border-amber-500 rounded-sm shadow-lg overflow-hidden"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {/* Postcard header */}
            <div className="bg-amber-700 dark:bg-amber-800 text-white px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">✉️</span>
                <span className="font-bold text-sm tracking-widest uppercase">
                  Day {dayIdx + 1} — {formatDateShort(firstItem.date)}
                </span>
              </div>
              {/* Postage stamp decoration */}
              <div className="border-2 border-white px-2 py-1 text-xs font-bold tracking-wider">
                {journeyCity.toUpperCase()}
              </div>
            </div>

            {/* Postmark decoration */}
            <div className="bg-amber-50 dark:bg-amber-950 px-4 pt-2 pb-1 border-b border-amber-200 dark:border-amber-700">
              <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                {formatDate(firstItem.date)}
              </p>
            </div>

            {/* Schedule items */}
            <div className="bg-amber-50 dark:bg-amber-950 divide-y divide-amber-200 dark:divide-amber-800">
              {items.map((item, idx) => (
                <div key={`${item.date}-${item.time}-${idx}`} className="px-4 py-3 flex gap-4">
                  {/* Time column */}
                  <div className="w-16 shrink-0 text-center">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">
                      {item.time}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                      {item.activity}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      📍 {item.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
