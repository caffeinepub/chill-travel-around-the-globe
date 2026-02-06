import { useState } from 'react';
import { Heart } from 'lucide-react';

interface HeartRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function HeartRating({ rating, onRatingChange, readonly = false, size = 'md' }: HeartRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  const heartSize = sizeClasses[size];
  
  const getHeartState = (index: number) => {
    const currentRating = hoverRating || rating;
    const heartValue = index + 1;
    
    if (currentRating >= heartValue) {
      return 'full';
    } else if (currentRating >= heartValue - 0.9) {
      // Calculate partial fill based on decimal portion
      const decimal = currentRating - Math.floor(currentRating);
      if (decimal >= 0.1) {
        return 'partial';
      }
    }
    return 'empty';
  };
  
  const handleClick = (index: number, event: React.MouseEvent) => {
    if (readonly || !onRatingChange) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const heartWidth = rect.width;
    
    // Calculate rating based on click position within the heart
    // Left 10% = 0.1, 20% = 0.2, etc.
    const clickRatio = Math.max(0.1, Math.min(1.0, Math.ceil((clickX / heartWidth) * 10) / 10));
    const newRating = index + clickRatio;
    
    // Round to nearest 0.1
    const roundedRating = Math.round(newRating * 10) / 10;
    onRatingChange(Math.min(10.0, roundedRating));
  };
  
  const handleMouseEnter = (index: number) => {
    if (readonly) return;
    setHoverRating(index + 1);
  };
  
  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };
  
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, index) => {
        const heartState = getHeartState(index);
        const currentRating = hoverRating || rating;
        const heartValue = index + 1;
        
        // Calculate fill percentage for partial hearts
        let fillPercentage = 0;
        if (currentRating >= heartValue) {
          fillPercentage = 100;
        } else if (currentRating > heartValue - 1) {
          const decimal = currentRating - (heartValue - 1);
          fillPercentage = Math.max(0, Math.min(100, decimal * 100));
        }
        
        return (
          <button
            key={index}
            type="button"
            className={`${heartSize} transition-all duration-200 relative ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            }`}
            onClick={(e) => handleClick(index, e)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            title={readonly ? undefined : `Rate ${index + 1}.0`}
          >
            {/* Background heart (empty) */}
            <Heart className={`${heartSize} absolute inset-0 text-gray-300`} />
            
            {/* Filled heart with gradient for partial fills */}
            {fillPercentage > 0 && (
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
              >
                <Heart className={`${heartSize} fill-red-500 text-red-500`} />
              </div>
            )}
          </button>
        );
      })}
      <span className="ml-2 text-sm font-medium">
        {rating > 0 ? `${rating.toFixed(1)}/10` : '-/10'}
      </span>
    </div>
  );
}
