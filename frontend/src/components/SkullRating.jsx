import React from 'react';
import { cn } from '@/lib/utils';
import { Skull } from 'lucide-react';

export const SkullRating = ({ 
  rating = 0, 
  onRatingChange,
  maxRating = 5,
  size = 'md',
  readonly = false,
  className 
}) => {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7'
  };

  const handleClick = (e, value) => {
    e.stopPropagation();
    if (readonly || !onRatingChange) return;
    onRatingChange(value === rating ? 0 : value);
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }, (_, i) => {
        const value = i + 1;
        const isFilled = value <= rating;
        
        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(value)}
            disabled={readonly}
            className={cn(
              "touch-checkbox p-1 transition-all duration-200 rounded",
              "focus:outline-none focus:ring-2 focus:ring-gold/50",
              !readonly && "active:scale-90 hover:bg-gold/10"
            )}
            aria-label={`Rate ${value} out of ${maxRating}`}
          >
            <Skull
              className={cn(
                sizes[size],
                "transition-all duration-200",
                isFilled 
                  ? "fill-gold text-gold drop-shadow-[0_0_8px_hsl(var(--gold))]" 
                  : "text-slate-600 hover:text-slate-400"
              )}
            />
          </button>
        );
      })}
      {rating > 0 && (
        <span className="ml-2 text-sm font-data text-gold font-bold">
          {rating}/{maxRating}
        </span>
      )}
    </div>
  );
};

export default SkullRating;
