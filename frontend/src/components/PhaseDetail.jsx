import React from 'react';
import { cn } from '@/lib/utils';
import { BookEntry } from './BookEntry';
import { ProgressRing } from './ProgressRing';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronUp, Target, BookOpen, Skull } from 'lucide-react';

export const PhaseDetail = ({ 
  phase,
  bookData, // { [bookTitle]: { isRead, rating } }
  onBookReadChange,
  onBookRatingChange,
  onClose,
  className 
}) => {
  const books = phase.books || [];
  const completedBooks = books.filter(book => bookData[book.title]?.isRead).length;
  const totalBooks = books.length;
  const progress = totalBooks > 0 ? (completedBooks / totalBooks) * 100 : 0;

  const ratedBooks = books.filter(book => bookData[book.title]?.rating > 0);
  const averageRating = ratedBooks.length > 0 
    ? ratedBooks.reduce((sum, book) => sum + (bookData[book.title]?.rating || 0), 0) / ratedBooks.length
    : 0;

  return (
    <div className={cn(
      "mt-2 rounded-sm overflow-hidden",
      "bg-gradient-to-b from-card to-void/80",
      "border border-gold/30",
      "shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
      "animate-cogitator-boot",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border/30 bg-gradient-to-r from-gold/5 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-sm bg-gold/10 border border-gold/30">
                <span className="font-tactical text-[10px] text-gold font-bold">{phase.id}</span>
              </span>
              <h3 className="font-display text-base text-gold tracking-wide">
                {phase.title}
              </h3>
            </div>
            
            <p className="font-data text-xs text-muted-foreground ml-7">
              {phase.subtitle}
            </p>
            
            <div className="flex items-center gap-2 mt-2 ml-7">
              <Target className="h-3 w-3 text-terminal/70" />
              <span className="font-data text-[11px] text-terminal/80">
                {phase.theme}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="hidden sm:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3 w-3 text-gold/60" />
                <span className="font-data text-xs">
                  <span className="text-terminal">{completedBooks}</span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-foreground/80">{totalBooks}</span>
                </span>
              </div>
              {averageRating > 0 && (
                <div className="flex items-center gap-2">
                  <Skull className="h-3 w-3 text-gold/60" />
                  <span className="font-data text-xs text-gold">
                    {averageRating.toFixed(1)} avg
                  </span>
                </div>
              )}
            </div>

            <ProgressRing 
              progress={progress}
              size={56}
              strokeWidth={4}
              variant={progress === 100 ? 'green' : 'gold'}
            />
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-sm bg-muted/50 hover:bg-muted border border-border/50 hover:border-gold/30 transition-colors"
        >
          <ChevronUp className="h-4 w-4 text-gold/70" />
        </button>
      </div>

      {/* Book list */}
      <ScrollArea className="max-h-[60vh]">
        <div className="p-4 space-y-2">
          {/* Column headers */}
          <div className="flex items-center justify-between px-4 py-2 mb-2 border-b border-border/20">
            <span className="font-tactical text-[10px] text-muted-foreground tracking-widest">
              TOME INDEX
            </span>
            <span className="font-tactical text-[10px] text-muted-foreground tracking-widest">
              STATUS / RATING
            </span>
          </div>

          {books.map((book, index) => (
            <BookEntry
              key={book.title}
              book={book}
              index={index}
              isRead={bookData[book.title]?.isRead || false}
              rating={bookData[book.title]?.rating || 0}
              onReadChange={(isRead) => onBookReadChange(book.title, isRead)}
              onRatingChange={(rating) => onBookRatingChange(book.title, rating)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/30 bg-gradient-to-r from-transparent via-gold/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full",
              progress === 100 
                ? "bg-terminal shadow-[0_0_6px_hsl(var(--terminal-green))]"
                : progress > 0
                ? "bg-gold shadow-[0_0_6px_hsl(var(--gold)/0.5)]"
                : "bg-muted-foreground/30"
            )} />
            <span className="font-tactical text-[10px] tracking-widest text-muted-foreground uppercase">
              {progress === 100 ? 'SECTOR FULLY PROCESSED' : progress > 0 ? 'PROCESSING IN PROGRESS' : 'AWAITING PROCESSING'}
            </span>
          </div>
          
          <span className="font-data text-xs text-muted-foreground">
            {phase.id === 0 ? 'FOUNDATION SECTOR' : `SECTOR ${phase.id}`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PhaseDetail;
