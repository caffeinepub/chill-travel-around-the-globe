import React from 'react';
import { useGetScheduleItems } from '../../hooks/useQueries';
import type { ScheduleItem } from '../../backend';

interface DoodleItineraryDialogContentProps {
  journeyKey: string;
  journeyCity: string;
}

const DOODLE_COLORS = [
  'bg-yellow-100 border-yellow-300',
  'bg-pink-100 border-pink-300',
  'bg-blue-100 border-blue-300',
  'bg-green-100 border-green-300',
  'bg-purple-100 border-purple-300',
  'bg-orange-100 border-orange-300',
];

const DOODLE_ROTATIONS = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2', 'rotate-0'];

function formatTime(time: string): string {
  return time || '';
}

function formatDate(dateNs: bigint): string {
  const ms = Number(dateNs) / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function DoodleItineraryDialogContent({
  journeyKey,
  journeyCity,
}: DoodleItineraryDialogContentProps) {
  const { data: scheduleItems, isLoading } = useGetScheduleItems(journeyKey);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400" />
      </div>
    );
  }

  if (!scheduleItems || scheduleItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">✏️</div>
        <p className="text-lg font-semibold text-gray-500">No travelogue entries yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Add schedule items for <span className="font-medium">{journeyCity}</span> in the Admin Panel
        </p>
      </div>
    );
  }

  // Group by date
  const grouped = scheduleItems.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const dateKey = formatDate(item.date);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    const aMs = Number(scheduleItems.find(i => formatDate(i.date) === a)?.date ?? 0n) / 1_000_000;
    const bMs = Number(scheduleItems.find(i => formatDate(i.date) === b)?.date ?? 0n) / 1_000_000;
    return aMs - bMs;
  });

  let cardIndex = 0;

  return (
    <div className="p-4 space-y-6 font-['Patrick_Hand',_cursive,_sans-serif]">
      {sortedDates.map((dateKey, dayIdx) => (
        <div key={dateKey}>
          {/* Day header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-red-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              Day {dayIdx + 1}
            </div>
            <span className="text-sm text-gray-500 font-medium">{dateKey}</span>
            <div className="flex-1 border-b-2 border-dashed border-gray-200" />
          </div>

          {/* Cards */}
          <div className="flex flex-wrap gap-3">
            {grouped[dateKey]
              .slice()
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((item) => {
                const colorClass = DOODLE_COLORS[cardIndex % DOODLE_COLORS.length];
                const rotClass = DOODLE_ROTATIONS[cardIndex % DOODLE_ROTATIONS.length];
                cardIndex++;
                return (
                  <div
                    key={`${item.date}-${item.time}-${item.location}`}
                    className={`relative border-2 rounded-lg p-3 shadow-md w-44 ${colorClass} ${rotClass} transition-transform hover:rotate-0 hover:scale-105`}
                  >
                    {/* Pin decoration */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full shadow border-2 border-white" />
                    <div className="mt-1">
                      <p className="text-xs font-bold text-gray-600 mb-1">{item.time}</p>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{item.activity}</p>
                      <p className="text-xs text-gray-500 mt-1 italic">📍 {item.location}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
