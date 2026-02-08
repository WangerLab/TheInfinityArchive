import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MechanicalSwitch } from './MechanicalSwitch';
import { SkullRating } from './SkullRating';
import { NotesModal } from './NotesModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, BookMarked, ChevronRight, FileText, 
  PenTool, FolderOpen, Shield, Swords, Bug 
} from 'lucide-react';

export const BookEntry = ({ 
  book, 
  index,
  isRead = false, 
  rating = 0,
  notes = '',
  childProgress = null, // For omnibus: { read: 2, total: 3 }
  onReadChange,
  onRatingChange,
  onNotesChange,
  hasContents = false,
  isExpanded = false,
  onToggleExpand,
  activeFilters = [],
  className 
}) => {
  const [showNotes, setShowNotes] = useState(false);
  
  // Check if this book should be dimmed based on filters
  const isDimmed = activeFilters.length > 0 && book.faction && !activeFilters.includes(book.faction);

  const factionColors = {
    imperium: { border: 'border-l-gold', icon: Shield, color: 'text-gold' },
    chaos: { border: 'border-l-chaos', icon: Swords, color: 'text-chaos' },
    xenos: { border: 'border-l-xenos', icon: Bug, color: 'text-xenos' }
  };

  const factionStyle = factionColors[book.faction] || factionColors.imperium;
  const FactionIcon = factionStyle.icon;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
        className={cn(
          "group relative p-3 rounded-sm transition-all duration-300",
          "bg-gradient-to-r from-void/50 to-transparent",
          "border-l-2",
          isRead 
            ? "border-l-terminal bg-terminal/5" 
            : factionStyle.border,
          isDimmed && "faction-dimmed",
          className
        )}
      >
        {/* Index number */}
        <div className="absolute -left-px top-0 bottom-0 flex items-center">
          <span className={cn(
            "font-tactical text-[9px] -ml-5 w-4 text-right",
            isRead ? "text-terminal/60" : "text-muted-foreground/30"
          )}>
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start gap-2 mb-1">
              {hasContents ? (
                <button 
                  onClick={onToggleExpand}
                  className="mt-0.5 shrink-0 transition-colors hover:text-gold"
                >
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isExpanded && "rotate-90",
                    isRead ? "text-terminal" : "text-gold/60"
                  )} />
                </button>
              ) : (
                <BookMarked className={cn(
                  "h-4 w-4 mt-0.5 shrink-0 transition-colors",
                  isRead ? "text-terminal" : "text-gold/60"
                )} />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "font-data text-sm font-medium leading-tight transition-colors",
                    isRead ? "text-terminal" : "text-foreground"
                  )}>
                    {book.title}
                  </h4>
                  {hasContents && (
                    <span className="shrink-0 px-1.5 py-0.5 bg-gold/10 border border-gold/30 rounded-sm">
                      <FolderOpen className="h-3 w-3 text-gold" />
                    </span>
                  )}
                </div>

                {/* Author & Pages */}
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground/50" />
                    <span className="font-data text-[10px] text-muted-foreground">
                      {book.author}
                    </span>
                  </div>
                  {book.pages && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground/50" />
                      <span className="font-data text-[10px] text-muted-foreground">
                        {book.pages.toLocaleString()} pages
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <FactionIcon className={cn("h-3 w-3", factionStyle.color)} />
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {book.tags?.map((tag, tagIndex) => (
                    <Badge 
                      key={tagIndex}
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-4 font-data tracking-wide",
                        "border-border/40 bg-muted/20",
                        isRead && "border-terminal/30 text-terminal/80"
                      )}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Child progress for omnibus */}
                {childProgress && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="font-tactical text-[9px] text-muted-foreground tracking-wider">
                      CONTENTS:
                    </span>
                    <span className={cn(
                      "font-data text-[10px]",
                      childProgress.read === childProgress.total ? "text-terminal" : "text-gold"
                    )}>
                      {childProgress.read}/{childProgress.total} complete
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2 ml-6 sm:ml-0">
            {/* Notes button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowNotes(true)}
              className={cn(
                "p-1.5 rounded-sm border transition-all duration-200",
                notes 
                  ? "border-gold/50 bg-gold/10 text-gold" 
                  : "border-border/30 bg-muted/20 text-muted-foreground/50 hover:text-gold/70 hover:border-gold/30"
              )}
              title="Remembrancer's Log"
            >
              <PenTool className="h-3.5 w-3.5" />
            </motion.button>

            {/* Read toggle */}
            <div className="flex items-center gap-2">
              <span className="font-tactical text-[8px] text-muted-foreground tracking-wider hidden sm:inline">
                {isRead ? 'LOGGED' : 'MARK'}
              </span>
              <MechanicalSwitch
                checked={isRead}
                onCheckedChange={onReadChange}
                size="sm"
              />
            </div>

            {/* Rating - only shown when read */}
            <AnimatePresence>
              {isRead && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-start sm:items-end gap-0.5"
                >
                  <span className="font-tactical text-[8px] text-muted-foreground tracking-wider">
                    RATING
                  </span>
                  <SkullRating
                    rating={rating}
                    onRatingChange={onRatingChange}
                    size="sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Completion glow effect */}
        {isRead && (
          <div className="absolute inset-0 rounded-sm pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-terminal/5 to-transparent" />
          </div>
        )}
      </motion.div>

      {/* Notes Modal */}
      <NotesModal
        isOpen={showNotes}
        onClose={() => setShowNotes(false)}
        bookTitle={book.title}
        notes={notes}
        onNotesChange={onNotesChange}
      />
    </>
  );
};

// Sub-story entry for omnibus contents
export const SubStoryEntry = ({
  story,
  index,
  isRead = false,
  onReadChange,
  className
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={cn(
        "flex items-center justify-between p-2 ml-6 rounded-sm",
        "bg-void/30 border-l border-gold/20",
        isRead && "border-l-terminal/50 bg-terminal/5",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-tactical text-[8px] text-muted-foreground/40 w-4">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className={cn(
          "font-data text-xs",
          isRead ? "text-terminal" : "text-foreground/80"
        )}>
          {story.title}
        </span>
        {story.pages && (
          <span className="font-data text-[9px] text-muted-foreground/50">
            ({story.pages}p)
          </span>
        )}
      </div>
      
      <MechanicalSwitch
        checked={isRead}
        onCheckedChange={onReadChange}
        size="sm"
      />
    </motion.div>
  );
};

export default BookEntry;
