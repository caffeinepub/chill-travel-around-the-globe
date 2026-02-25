import React from 'react';
import { Calendar, MapPin, Clock, Plane } from 'lucide-react';
import { useGetJourneyScheduleWithDays } from '@/hooks/useQueries';
import { Journey } from '@/backend';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RetroItineraryDialogContentProps {
  journey: Journey;
  formatDate: (timestamp: bigint) => string;
  formatDateRange: (startTimestamp: bigint, endTimestamp: bigint) => string;
  formatScheduleDate: (timestamp: bigint) => string;
  formatTime: (timeString: string) => string;
}

export default function RetroItineraryDialogContent({
  journey,
  formatDate,
  formatDateRange,
  formatScheduleDate,
  formatTime,
}: RetroItineraryDialogContentProps) {
  const { data: scheduleWithDays = [] } = useGetJourneyScheduleWithDays(journey.city);

  return (
    <div className="relative w-full h-[85vh] overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Vintage Postcard Header */}
      <div className="relative p-8 bg-gradient-to-r from-amber-100 to-orange-100 border-b-8 border-double border-amber-600">
        <div className="max-w-4xl mx-auto">
          {/* Postage Stamp Effect */}
          <div className="absolute top-4 right-4 w-24 h-24 bg-red-600 border-4 border-white shadow-lg flex items-center justify-center transform rotate-12">
            <Plane className="h-12 w-12 text-white" />
          </div>

          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-orange-600 rounded-sm flex items-center justify-center shadow-2xl border-4 border-white">
              <Calendar className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-5xl font-bold text-amber-900 mb-2" style={{ fontFamily: 'Georgia, serif', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
                Greetings from {journey.city}
              </h2>
              <p className="text-xl text-amber-800 font-serif italic">
                {formatDateRange(journey.startDate, journey.endDate)}
              </p>
            </div>
          </div>

          {/* Postmark Effect */}
          <div className="absolute bottom-4 left-4 w-32 h-32 border-4 border-red-800 rounded-full opacity-30 flex items-center justify-center">
            <span className="text-red-800 font-bold text-xs transform -rotate-12">TRAVEL</span>
          </div>
        </div>
      </div>

      {/* Vintage Content */}
      <ScrollArea className="h-[calc(85vh-200px)]">
        <div className="max-w-4xl mx-auto p-8 space-y-10">
          {scheduleWithDays.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-40 h-40 mx-auto mb-8 bg-gradient-to-br from-amber-300 to-orange-400 rounded-sm flex items-center justify-center shadow-2xl border-8 border-white transform rotate-3">
                <MapPin className="h-20 w-20 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-amber-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                Your Journey Awaits
              </h3>
              <p className="text-xl text-amber-700 font-serif italic">
                Add activities to create your vintage travel itinerary
              </p>
            </div>
          ) : (
            scheduleWithDays.map(([dayLabel, items], dayIndex) => (
              <div key={dayIndex} className="relative">
                {/* Day Header - Vintage Ribbon */}
                <div className="relative mb-8">
                  <div className="inline-block bg-gradient-to-r from-red-700 to-orange-600 text-white px-8 py-4 shadow-2xl border-4 border-white">
                    <h3 className="text-3xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>
                      {dayLabel}
                    </h3>
                  </div>
                  {items.length > 0 && (
                    <p className="mt-3 text-lg text-amber-800 font-serif italic ml-2">
                      {formatScheduleDate(items[0].date)}
                    </p>
                  )}
                </div>

                {/* Schedule Items - Vintage Cards */}
                <div className="space-y-6 ml-12">
                  {items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="relative bg-gradient-to-br from-amber-50 to-orange-50 p-8 shadow-2xl border-8 border-double border-amber-600"
                    >
                      {/* Corner Decorations */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-800"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-800"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-800"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-800"></div>

                      <div className="flex items-start gap-6">
                        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-700 rounded-sm flex items-center justify-center shadow-lg border-4 border-white">
                          <Clock className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <span className="text-2xl font-bold text-red-700" style={{ fontFamily: 'Georgia, serif' }}>
                              {formatTime(item.time)}
                            </span>
                            <span className="text-xl text-amber-600">•</span>
                            <span className="text-xl font-bold text-amber-900" style={{ fontFamily: 'Georgia, serif' }}>
                              {item.location}
                            </span>
                          </div>
                          <p className="text-lg text-gray-800 leading-relaxed font-serif">
                            {item.activity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Vintage Footer */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-red-700 via-orange-600 to-amber-600"></div>
    </div>
  );
}
