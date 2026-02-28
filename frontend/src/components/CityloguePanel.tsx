import React from 'react';

interface CityloguePanelProps {
  onSpotFocus?: (coordinates: [number, number], spotName: string) => void;
}

export default function CityloguePanel({ onSpotFocus }: CityloguePanelProps) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-foreground mb-2">Citylogue</h2>
      <p className="text-sm text-muted-foreground">City ratings and travel spots overview.</p>
    </div>
  );
}
