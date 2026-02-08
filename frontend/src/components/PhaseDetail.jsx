import React from 'react';
import { cn } from '@/lib/utils';
import { RecursiveBookEntry } from './RecursiveBookEntry';
import { ProgressRing } from './ProgressRing';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronUp, Trophy, FileText, Zap, Skull } from 'lucide-react';

export const PhaseDetail = ({ 
  phase,
  bookData,
  onBookReadChange,
  onBookRatingChange,
  onBookNotesChange,
  onSubItemReadChange,
  onClose,
  activeFilters = [],
  className 
}) => {
  const books = phase.books || [];

  // Calculate stats recursively
  const calculateStats = () => {
    let totalPages = 0;
    let readPages = 0;
    let totalItems = 0;
    let completedItems = 0;
    let ratingSum = 0;
    let ratedCount = 0;

    const processBook = (book, data) => {
      if (book.contents && book.contents.length > 0) {
        book.contents.forEach(subItem => {
          totalPages += subItem.pages || 0;
          totalItems++;
          if (data?.contents?.[subItem.title]) {
            readPages += subItem.pages || 0;
            completedItems++;
          }
        });
      } else {
        totalPages += book.pages || 0;
        totalItems++;
        if (data?.isRead) {
          readPages += book.pages || 0;
          completedItems++;
        }
      }
      
      if (data?.rating > 0) {
        ratingSum += data.rating;
        ratedCount++;
      }
    };

    books.forEach(book => {
      const data = bookData[book.title] || {};
      processBook(book, data);
    });

    return {
      totalPages,
      readPages,
      totalItems,
      completedItems,
      progress: totalPages > 0 ? (readPages / totalPages) * 100 : 0,
      averageRating: ratedCount > 0 ? ratingSum / ratedCount : 0
    };
  };

  const stats = calculateStats();
  const isPacified = stats.progress >= 100;

  return (
    <div className={cn(
      "rounded-lg overflow-hidden mt-3",
      "grimdark-panel",
      isPacified && "grimdark-panel-pacified",
      className
    )}>
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-gold/20",
        isPacified && "bg-auspex/5"
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center text-sm font-display font-bold border",
                isPacified 
                  ? "bg-auspex/20 text-auspex border-auspex/50" 
                  : "bg-gold/20 text-gold border-gold/50"
              )}>
                {phase.id}
              </span>
              <h3 className={cn(
                "font-display text-sm tracking-wide",
                isPacified ? "text-auspex" : "text-gold"
              )}>
                {phase.title}
              </h3>
              {isPacified && (
                <span className="flex items-center gap-1 bg-auspex/20 text-auspex px-2 py-0.5 rounded text-[10px] font-bold border border-auspex/40">
                  <Trophy className="w-3 h-3" />
                  PACIFIED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">{phase.theme}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex flex-col items-end gap-1 text-xs">
              <div className="flex items-center gap-1.5">
                <FileText className={cn("w-3.5 h-3.5", isPacified ? "text-auspex/60" : "text-gold/60")} />
                <span className="font-data text-slate-200 font-bold">
                  {stats.readPages.toLocaleString()}/{stats.totalPages.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-auspex/60" />
                <span className="font-bold text-slate-300">
                  {stats.completedItems}/{stats.totalItems}
                </span>
              </div>
              {stats.averageRating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-gold/60" />
                  <span className="font-bold text-gold">
                    {stats.averageRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            <ProgressRing 
              progress={stats.progress}
              size={56}
              strokeWidth={4}
            />
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-3 right-3 w-9 h-9 rounded-lg flex items-center justify-center",
            "border transition-colors",
            isPacified 
              ? "bg-auspex/10 border-auspex/30 text-auspex hover:bg-auspex/20" 
              : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-gold hover:border-gold/40"
          )}
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      </div>

      {/* Book list */}
      <ScrollArea className="max-h-[60vh]">
        <div className="p-3 pb-8 space-y-2">
          {books.map((book, index) => (
            <RecursiveBookEntry
              key={book.title}
              book={book}
              index={index}
              bookData={bookData[book.title] || {}}
              onReadChange={(isRead) => onBookReadChange(book.title, isRead)}
              onRatingChange={(rating) => onBookRatingChange(book.title, rating)}
              onNotesChange={(notes) => onBookNotesChange(book.title, notes)}
              onSubItemReadChange={onSubItemReadChange}
              activeFilters={activeFilters}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={cn(
        "px-4 py-3 border-t border-gold/20",
        isPacified && "bg-auspex/5"
      )}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-2 h-2 rounded-full animate-pulse-glow",
              isPacified 
                ? "bg-auspex shadow-[0_0_8px_hsl(var(--auspex))]"
                : stats.progress > 0
                ? "bg-gold shadow-[0_0_8px_hsl(var(--gold))]"
                : "bg-slate-600"
            )} />
            <span className={cn(
              "font-tactical tracking-wider",
              isPacified ? "text-auspex" : "text-slate-400"
            )}>
              {isPacified ? 'SECTOR PACIFIED' : stats.progress > 0 ? 'IN PROGRESS' : 'AWAITING'}
            </span>
          </div>
          <span className="text-slate-500 font-data">SECTOR {phase.id}</span>
        </div>
      </div>
    </div>
  );
};

export default PhaseDetail;
