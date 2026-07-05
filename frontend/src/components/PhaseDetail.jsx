import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from 'lib/utils';
import { BookRow } from './BookRow';
import { ScrollArea } from 'components/ui/scroll-area';
import { ChevronUp, Skull } from 'lucide-react';

export const PhaseDetail = ({
  phase,
  bookData,
  getEntryProgress,
  onBookReadChange,
  onBookRatingChange,
  onBookNotesChange,
  onClose,
  activeFilters = [],
  className
}) => {
  const navigate = useNavigate();
  const books = phase.books || [];

  // Faction filter (FX-3): when activeFilters is non-empty, show only
  // books whose own grandAlliance is selected. Rule A — per-row, parents
  // match on their own alliance; children are not individually inspected.
  // Stats below intentionally use the FULL list, not this filtered view.
  const visibleBooks =
    activeFilters.length === 0
      ? books
      : books.filter((book) => activeFilters.includes(book.grandAlliance));

  // Calculate stats recursively
  const calculateStats = () => {
    let totalPages = 0;
    let readPages = 0;
    let totalItems = 0;
    let completedItems = 0;
    let ratingSum = 0;
    let ratedCount = 0;

    // Flat read check — status/isRead now live under bookData[entryId] for
    // both single books and sub-items (Commit-1 bridge).
    const isFlatRead = (p) => ((p?.status ?? (p?.isRead ? 'read' : 'unread')) === 'read');

    const processBook = (book, data) => {
      if (book.contents && book.contents.length > 0) {
        book.contents.forEach(subItem => {
          totalPages += subItem.pages || 0;
          totalItems++;
          const subP = bookData[subItem.entryId] || {};
          if (isFlatRead(subP)) {
            readPages += subItem.pages || 0;
            completedItems++;
          }
          // Count sub-item ratings
          if (subP.rating > 0) {
            ratingSum += subP.rating;
            ratedCount++;
          }
        });
      } else {
        totalPages += book.pages || 0;
        totalItems++;
        if (isFlatRead(data)) {
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
      const data = bookData[book.entryId] || {};
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
        <div className="flex items-center gap-2 pr-12">
          <span className={cn(
            "w-6 h-6 rounded flex items-center justify-center text-xs font-display font-bold border shrink-0",
            isPacified
              ? "bg-auspex/20 text-auspex border-auspex/50"
              : "bg-gold/20 text-gold border-gold/50"
          )}>
            {phase.id}
          </span>
          <h3 className={cn(
            "font-display text-xs tracking-wide truncate",
            isPacified ? "text-auspex" : "text-gold"
          )}>
            {phase.title}
          </h3>
          {stats.averageRating > 0 && (
            <span className="flex items-center gap-1 text-xs ml-auto shrink-0">
              <Skull className="w-3.5 h-3.5 text-gold/60" />
              <span className="font-bold text-gold">{stats.averageRating.toFixed(1)}</span>
            </span>
          )}
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
      <div className="overflow-y-auto max-h-[80vh]">
        <div className="p-3 pb-40 space-y-2">
          {visibleBooks.map((book) => (
            <BookRow
              key={book.entryId}
              book={book}
              entryProgress={getEntryProgress(book)}
              onOpen={(entryId) => navigate('/book/' + entryId)}
            />
          ))}
        </div>
      </div>

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
