import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { useGetJourneyScheduleWithDays } from '@/hooks/useQueries';
import { Journey } from '@/backend';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DoodleItineraryDialogContentProps {
  journey: Journey;
  formatDate: (timestamp: bigint) => string;
  formatDateRange: (startTimestamp: bigint, endTimestamp: bigint) => string;
  formatScheduleDate: (timestamp: bigint) => string;
  formatTime: (timeString: string) => string;
}

export default function DoodleItineraryDialogContent({
  journey,
  formatDate,
  formatDateRange,
  formatScheduleDate,
  formatTime,
}: DoodleItineraryDialogContentProps) {
  const { data: scheduleWithDays = [] } = useGetJourneyScheduleWithDays(journey.city);

  return (
    <div className="relative w-full h-[85vh] overflow-hidden bg-[#fef9f3]">
      {/* Scrapbook Header */}
      <div className="relative p-8 bg-gradient-to-br from-amber-50 to-orange-50 border-b-4 border-dashed border-amber-300">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg transform -rotate-6">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-amber-900 mb-1" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                {journey.city} Adventure! ✈️
              </h2>
              <p className="text-lg text-amber-700 font-medium">
                {formatDateRange(journey.startDate, journey.endDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrapbook Content */}
      <ScrollArea className="h-[calc(85vh-180px)]">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {scheduleWithDays.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-amber-200 to-orange-300 rounded-full flex items-center justify-center shadow-lg">
                <MapPin className="h-16 w-16 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-amber-900 mb-2" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                No Schedule Yet!
              </h3>
              <p className="text-amber-700">
                Add some activities to your journey to see them here in your travel scrapbook!
              </p>
            </div>
          ) : (
            scheduleWithDays.map(([dayLabel, items], dayIndex) => (
              <div key={dayIndex} className="relative">
                {/* Day Header - Scrapbook Style */}
                <div className="relative mb-6">
                  <div className="inline-block bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-lg shadow-lg transform -rotate-2">
                    <h3 className="text-2xl font-bold" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                      {dayLabel} 🎉
                    </h3>
                  </div>
                  {items.length > 0 && (
                    <p className="mt-2 text-sm text-amber-700 font-medium ml-2">
                      {formatScheduleDate(items[0].date)}
                    </p>
                  )}
                </div>

                {/* Schedule Items - Polaroid Style */}
                <div className="space-y-6 ml-8">
                  {items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="relative bg-white p-6 rounded-lg shadow-xl border-4 border-white transform hover:scale-105 transition-transform"
                      style={{
                        transform: `rotate(${itemIndex % 2 === 0 ? '-1deg' : '1deg'})`,
                      }}
                    >
                      {/* Tape Effect */}
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-amber-200 opacity-60 rounded-sm"></div>
                      
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center shadow-md">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-blue-600">
                              {formatTime(item.time)}
                            </span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm font-semibold text-gray-700">
                              {item.location}
                            </span>
                          </div>
                          <p className="text-gray-800 leading-relaxed">
                            {item.activity}
                          </p>
                        </div>
                      </div>

                      {/* Decorative Corner */}
                      <div className="absolute bottom-2 right-2 w-8 h-8 border-r-4 border-b-4 border-amber-300 rounded-br-lg"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
