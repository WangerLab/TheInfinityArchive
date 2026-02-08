import React from 'react';
import { cn } from '@/lib/utils';
import { Skull } from 'lucide-react';
import { motion } from 'framer-motion';

export const SkullRating = ({ 
  rating = 0, 
  onRatingChange,
  maxRating = 5,
  size = 'md',
  readonly = false,
  className 
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = (value) => {
    if (readonly || !onRatingChange) return;
    if (value === rating) {
      onRatingChange(0);
    } else {
      onRatingChange(value);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }, (_, i) => {
        const value = i + 1;
        const isFilled = value <= rating;
        
        return (
          <motion.button
            key={i}
            type="button"
            onClick={() => handleClick(value)}
            disabled={readonly}
            whileHover={!readonly ? { scale: 1.15 } : undefined}
            whileTap={!readonly ? { scale: 0.9 } : undefined}
            className={cn(
              "transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-gold/50 rounded-sm",
              !readonly && "cursor-pointer",
              readonly && "cursor-default"
            )}
            aria-label={`Rate ${value} out of ${maxRating}`}
          >
            <motion.div
              initial={false}
              animate={isFilled ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Skull
                className={cn(
                  sizes[size],
                  "transition-all duration-200",
                  isFilled 
                    ? "fill-gold text-gold drop-shadow-[0_0_8px_hsl(var(--gold)/0.7)]" 
                    : "text-muted-foreground/30 hover:text-muted-foreground/50"
                )}
              />
            </motion.div>
          </motion.button>
        );
      })}
      {rating > 0 && (
        <span className="ml-2 text-xs font-data text-gold/80">
          {rating}/{maxRating}
        </span>
      )}
    </div>
  );
};

export default SkullRating;
