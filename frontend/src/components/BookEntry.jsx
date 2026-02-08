import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MechanicalSwitch } from './MechanicalSwitch';
import { SkullRating } from './SkullRating';
import { User, BookMarked } from 'lucide-react';

export const BookEntry = ({ 
  book, 
  index,
  isRead = false, 
  rating = 0,
  onReadChange,
  onRatingChange,
  className 
}) => {
  return (
    <div 
      className={cn(
        "group relative p-4 rounded-sm transition-all duration-300",
        "bg-gradient-to-r from-void/50 to-transparent",
        "border-l-2",
        isRead 
          ? "border-l-terminal bg-terminal/5" 
          : "border-l-border hover:border-l-gold/50",
        className
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Index number */}
      <div className="absolute -left-px top-0 bottom-0 flex items-center">
        <span className={cn(
          "font-tactical text-[10px] -ml-6 w-4 text-right",
          isRead ? "text-terminal/60" : "text-muted-foreground/40"
        )}>
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-start gap-2 mb-1">
            <BookMarked className={cn(
              "h-4 w-4 mt-0.5 shrink-0 transition-colors",
              isRead ? "text-terminal" : "text-gold/60"
            )} />
            <h4 className={cn(
              "font-data text-sm font-medium leading-tight transition-colors",
              isRead ? "text-terminal" : "text-foreground"
            )}>
              {book.title}
            </h4>
          </div>

          {/* Author */}
          <div className="flex items-center gap-1.5 ml-6 mb-2">
            <User className="h-3 w-3 text-muted-foreground/50" />
            <span className="font-data text-xs text-muted-foreground">
              {book.author}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 ml-6">
            {book.tags.map((tag, tagIndex) => (
              <Badge 
                key={tagIndex}
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5 font-data tracking-wide",
                  "border-border/50 bg-muted/30",
                  isRead && "border-terminal/30 text-terminal/80"
                )}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2 ml-6 sm:ml-0">
          {/* Read toggle */}
          <div className="flex items-center gap-2">
            <span className="font-tactical text-[10px] text-muted-foreground tracking-wider hidden sm:inline">
              {isRead ? 'LOGGED' : 'MARK READ'}
            </span>
            <MechanicalSwitch
              checked={isRead}
              onCheckedChange={onReadChange}
            />
          </div>

          {/* Rating - only shown when read */}
          <div className={cn(
            "transition-all duration-300 overflow-hidden",
            isRead ? "opacity-100 max-h-20" : "opacity-0 max-h-0 pointer-events-none"
          )}>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="font-tactical text-[10px] text-muted-foreground tracking-wider">
                RATING
              </span>
              <SkullRating
                rating={rating}
                onRatingChange={onRatingChange}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Completion glow effect */}
      {isRead && (
        <div className="absolute inset-0 rounded-sm pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-terminal/5 to-transparent" />
        </div>
      )}
    </div>
  );
};

export default BookEntry;
