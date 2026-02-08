import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { BookEntry, SubStoryEntry } from './BookEntry';
import { ProgressCircle } from './ProgressCircle';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronUp, Trophy, FileText, Zap, Skull } from 'lucide-react';

export const PhaseDetail = ({ 
  phase,
  bookData,
  onBookReadChange,
  onBookRatingChange,
  onBookNotesChange,
  onSubStoryReadChange,
  onClose,
  activeFilters = [],
  className 
}) => {
  const [expandedBooks, setExpandedBooks] = useState(new Set());
  
  const books = phase.books || [];

  // Calculate stats
  const calculateStats = () => {
    let totalPages = 0;
    let readPages = 0;
    let completedItems = 0;
    let totalItems = 0;
    let ratingSum = 0;
    let ratedCount = 0;

    books.forEach(book => {
      const data = bookData[book.title] || {};
      
      if (book.contents) {
        book.contents.forEach(story => {
          totalPages += story.pages || 0;
          totalItems++;
          if (data.contents?.[story.title]) {
            readPages += story.pages || 0;
            completedItems++;
          }
        });
      } else {
        totalPages += book.pages || 0;
        totalItems++;
        if (data.isRead) {
          readPages += book.pages || 0;
          completedItems++;
        }
      }
      
      if (data.rating > 0) {
        ratingSum += data.rating;
        ratedCount++;
      }
    });

    return {
      totalPages,
      readPages,
      completedItems,
      totalItems,
      progress: totalPages > 0 ? (readPages / totalPages) * 100 : 0,
      averageRating: ratedCount > 0 ? ratingSum / ratedCount : 0
    };
  };

  const stats = calculateStats();
  const isPacified = stats.progress === 100;

  const toggleBookExpand = (bookTitle) => {
    setExpandedBooks(prev => {
      const next = new Set(prev);
      if (next.has(bookTitle)) {
        next.delete(bookTitle);
      } else {
        next.add(bookTitle);
      }
      return next;
    });
  };

  const getChildProgress = (book, data) => {
    if (!book.contents) return null;
    const readCount = book.contents.filter(s => data?.contents?.[s.title]).length;
    return { read: readCount, total: book.contents.length };
  };

  const isOmnibusRead = (book, data) => {
    if (!book.contents) return data?.isRead || false;
    return book.contents.every(s => data?.contents?.[s.title]);
  };

  return (
    <div className={cn(
      "oled-panel rounded-xl overflow-hidden mt-3",
      isPacified && "border-success/30",
      className
    )}>
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-white/10",
        isPacified && "bg-success/5"
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center text-xs font-display font-bold",
                isPacified 
                  ? "bg-success/20 text-success" 
                  : "bg-primary/20 text-primary"
              )}>
                {phase.id}
              </span>
              <h3 className={cn(
                "font-display text-sm tracking-wide",
                isPacified ? "text-success" : "text-primary"
              )}>
                {phase.title}
              </h3>
              {isPacified && (
                <span className="flex items-center gap-1 bg-success/20 text-success px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <Trophy className="w-3 h-3" />
                  PACIFIED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{phase.theme}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex flex-col items-end gap-1 text-xs">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary/60" />
                <span className="font-mono text-slate-300 font-semibold">
                  {stats.readPages.toLocaleString()}/{stats.totalPages.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-success/60" />
                <span className="font-semibold text-slate-300">
                  {stats.completedItems}/{stats.totalItems}
                </span>
              </div>
              {stats.averageRating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-primary/60" />
                  <span className="font-semibold text-primary">
                    {stats.averageRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            <ProgressCircle 
              progress={stats.progress}
              size={52}
              strokeWidth={4}
            />
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      </div>

      {/* Book list */}
      <ScrollArea className="max-h-[60vh]">
        <div className="p-3 space-y-2">
          {books.map((book, index) => {
            const data = bookData[book.title] || {};
            const hasContents = !!book.contents;
            const isExpanded = expandedBooks.has(book.title);
            const childProgress = getChildProgress(book, data);
            const isRead = isOmnibusRead(book, data);

            return (
              <div key={book.title} className="animate-slide-up" style={{ animationDelay: `${index * 30}ms` }}>
                <BookEntry
                  book={book}
                  index={index}
                  isRead={isRead}
                  rating={data.rating || 0}
                  notes={data.notes || ''}
                  childProgress={childProgress}
                  hasContents={hasContents}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleBookExpand(book.title)}
                  onReadChange={(isRead) => {
                    if (hasContents) {
                      book.contents.forEach(story => {
                        onSubStoryReadChange(book.title, story.title, isRead);
                      });
                    } else {
                      onBookReadChange(book.title, isRead);
                    }
                  }}
                  onRatingChange={(rating) => onBookRatingChange(book.title, rating)}
                  onNotesChange={(notes) => onBookNotesChange(book.title, notes)}
                  activeFilters={activeFilters}
                />

                {/* Sub-stories */}
                {hasContents && isExpanded && (
                  <div className="space-y-2 mt-2">
                    {book.contents.map((story, storyIndex) => (
                      <SubStoryEntry
                        key={story.title}
                        story={story}
                        index={storyIndex}
                        isRead={data.contents?.[story.title] || false}
                        onReadChange={(isRead) => onSubStoryReadChange(book.title, story.title, isRead)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={cn(
        "px-4 py-3 border-t border-white/10",
        isPacified && "bg-success/5"
      )}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-2 h-2 rounded-full",
              isPacified 
                ? "bg-success shadow-[0_0_8px_hsl(var(--success))]"
                : stats.progress > 0
                ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                : "bg-slate-600"
            )} />
            <span className="text-slate-400 font-semibold tracking-wider">
              {isPacified ? 'SECTOR PACIFIED' : stats.progress > 0 ? 'IN PROGRESS' : 'AWAITING'}
            </span>
          </div>
          <span className="text-slate-500 font-mono">SECTOR {phase.id}</span>
        </div>
      </div>
    </div>
  );
};

export default PhaseDetail;
