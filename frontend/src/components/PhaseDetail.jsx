import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { BookEntry, SubStoryEntry } from './BookEntry';
import { ProgressRing } from './ProgressRing';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Target, BookOpen, Skull, FileText, Trophy } from 'lucide-react';

export const PhaseDetail = ({ 
  phase,
  bookData, // { [bookTitle]: { isRead, rating, notes, contents: { [storyTitle]: isRead } } }
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
    let completedBooks = 0;
    let ratingSum = 0;
    let ratedCount = 0;

    books.forEach(book => {
      const data = bookData[book.title] || {};
      
      if (book.contents) {
        // Omnibus with sub-stories
        let subStoriesRead = 0;
        book.contents.forEach(story => {
          totalPages += story.pages || 0;
          if (data.contents?.[story.title]) {
            readPages += story.pages || 0;
            subStoriesRead++;
          }
        });
        if (subStoriesRead === book.contents.length) {
          completedBooks++;
        }
      } else {
        // Single book
        totalPages += book.pages || 0;
        if (data.isRead) {
          readPages += book.pages || 0;
          completedBooks++;
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
      completedBooks,
      totalBooks: books.length,
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

  // Get child progress for omnibus books
  const getChildProgress = (book, data) => {
    if (!book.contents) return null;
    const readCount = book.contents.filter(s => data?.contents?.[s.title]).length;
    return { read: readCount, total: book.contents.length };
  };

  // Check if omnibus is fully read
  const isOmnibusRead = (book, data) => {
    if (!book.contents) return data?.isRead || false;
    return book.contents.every(s => data?.contents?.[s.title]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "mt-2 rounded-sm overflow-hidden",
        "bg-gradient-to-b from-card to-void/80",
        "border",
        isPacified ? "border-terminal/50" : "border-gold/30",
        "shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-border/30",
        isPacified 
          ? "bg-gradient-to-r from-terminal/10 via-transparent to-terminal/10" 
          : "bg-gradient-to-r from-gold/5 via-transparent to-gold/5"
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "inline-flex items-center justify-center h-5 w-5 rounded-sm border",
                isPacified 
                  ? "bg-terminal/20 border-terminal/50" 
                  : "bg-gold/10 border-gold/30"
              )}>
                <span className={cn(
                  "font-tactical text-[10px] font-bold",
                  isPacified ? "text-terminal" : "text-gold"
                )}>{phase.id}</span>
              </span>
              <h3 className={cn(
                "font-display text-sm tracking-wide",
                isPacified ? "text-terminal" : "text-gold"
              )}>
                {phase.title}
              </h3>
              {isPacified && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-2 py-0.5 bg-terminal/20 border border-terminal/40 rounded-sm"
                >
                  <Trophy className="h-3 w-3 text-terminal" />
                  <span className="font-tactical text-[8px] text-terminal tracking-wider">PACIFIED</span>
                </motion.div>
              )}
            </div>
            
            <p className="font-data text-[10px] text-muted-foreground ml-7">
              {phase.subtitle}
            </p>
            
            <div className="flex items-center gap-2 mt-1.5 ml-7">
              <Target className="h-3 w-3 text-terminal/70" />
              <span className="font-data text-[10px] text-terminal/80">
                {phase.theme}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="hidden sm:flex flex-col items-end gap-1 text-[10px]">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3 w-3 text-gold/60" />
                <span className="font-data">
                  <span className={isPacified ? "text-terminal" : "text-terminal"}>{stats.completedBooks}</span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-foreground/80">{stats.totalBooks}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-gold/60" />
                <span className="font-data">
                  <span className={isPacified ? "text-terminal" : "text-gold"}>{stats.readPages.toLocaleString()}</span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-foreground/80">{stats.totalPages.toLocaleString()}</span>
                  <span className="text-muted-foreground/30">p</span>
                </span>
              </div>
              {stats.averageRating > 0 && (
                <div className="flex items-center gap-2">
                  <Skull className="h-3 w-3 text-gold/60" />
                  <span className="font-data text-gold">
                    {stats.averageRating.toFixed(1)} avg
                  </span>
                </div>
              )}
            </div>

            <ProgressRing 
              progress={stats.progress}
              size={56}
              strokeWidth={4}
              variant={isPacified ? 'green' : 'gold'}
            />
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-sm border transition-colors",
            isPacified 
              ? "bg-terminal/10 border-terminal/30 hover:bg-terminal/20" 
              : "bg-muted/50 border-border/50 hover:border-gold/30"
          )}
        >
          <ChevronUp className={cn(
            "h-4 w-4",
            isPacified ? "text-terminal" : "text-gold/70"
          )} />
        </button>
      </div>

      {/* Book list */}
      <ScrollArea className="max-h-[60vh]">
        <div className="p-4 space-y-1">
          {/* Column headers */}
          <div className="flex items-center justify-between px-3 py-2 mb-2 border-b border-border/20">
            <span className="font-tactical text-[9px] text-muted-foreground tracking-widest">
              TOME INDEX
            </span>
            <span className="font-tactical text-[9px] text-muted-foreground tracking-widest">
              STATUS / NOTES / RATING
            </span>
          </div>

          {books.map((book, index) => {
            const data = bookData[book.title] || {};
            const hasContents = !!book.contents;
            const isExpanded = expandedBooks.has(book.title);
            const childProgress = getChildProgress(book, data);
            const isRead = isOmnibusRead(book, data);

            return (
              <div key={book.title}>
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
                      // Toggle all sub-stories
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

                {/* Sub-stories for omnibus */}
                <AnimatePresence>
                  {hasContents && isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 mt-1 mb-2"
                    >
                      {book.contents.map((story, storyIndex) => (
                        <SubStoryEntry
                          key={story.title}
                          story={story}
                          index={storyIndex}
                          isRead={data.contents?.[story.title] || false}
                          onReadChange={(isRead) => onSubStoryReadChange(book.title, story.title, isRead)}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={cn(
        "px-4 py-3 border-t border-border/30",
        isPacified 
          ? "bg-gradient-to-r from-transparent via-terminal/5 to-transparent" 
          : "bg-gradient-to-r from-transparent via-gold/5 to-transparent"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full",
              isPacified 
                ? "bg-terminal shadow-[0_0_6px_hsl(var(--terminal-green))]"
                : stats.progress > 0
                ? "bg-gold shadow-[0_0_6px_hsl(var(--gold)/0.5)]"
                : "bg-muted-foreground/30"
            )} />
            <span className="font-tactical text-[9px] tracking-widest text-muted-foreground uppercase">
              {isPacified ? 'SECTOR FULLY PROCESSED' : stats.progress > 0 ? 'PROCESSING IN PROGRESS' : 'AWAITING PROCESSING'}
            </span>
          </div>
          
          <span className="font-data text-[10px] text-muted-foreground">
            SECTOR {phase.id}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PhaseDetail;
