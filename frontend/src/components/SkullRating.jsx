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
    lg: 'w-8 h-8'
  };

  const handleClick = (value) => {
    if (readonly || !onRatingChange) return;
    onRatingChange(value === rating ? 0 : value);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
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
              "touch-target transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-md",
              !readonly && "active:scale-90"
            )}
            aria-label={`Rate ${value} out of ${maxRating}`}
          >
            <Skull
              className={cn(
                sizes[size],
                "transition-all duration-200",
                isFilled 
                  ? "fill-primary text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" 
                  : "text-slate-600 hover:text-slate-400"
              )}
            />
          </button>
        );
      })}
      {rating > 0 && (
        <span className="ml-2 text-sm font-mono text-primary font-semibold">
          {rating}/{maxRating}
        </span>
      )}
    </div>
  );
};

export default SkullRating;
