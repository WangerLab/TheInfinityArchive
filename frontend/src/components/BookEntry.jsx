import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { TouchCheckbox } from './TouchCheckbox';
import { SkullRating } from './SkullRating';
import { NotesModal } from './NotesModal';
import { 
  Book, ScrollText, Library, Layers, 
  ChevronRight, PenLine, User, FileText,
  Shield, Swords, Bug
} from 'lucide-react';

// Type icon mapping
const typeIcons = {
  novel: Book,
  short: ScrollText,
  omnibus: Library,
  anthology: Layers
};

// Faction icon mapping
const factionIcons = {
  imperium: Shield,
  chaos: Swords,
  xenos: Bug
};

export const BookEntry = ({ 
  book, 
  index,
  isRead = false, 
  rating = 0,
  notes = '',
  childProgress = null,
  onReadChange,
  onRatingChange,
  onNotesChange,
  hasContents = false,
  isExpanded = false,
  onToggleExpand,
  activeFilters = [],
  isSubItem = false,
  className 
}) => {
  const [showNotes, setShowNotes] = useState(false);
  
  const isDimmed = activeFilters.length > 0 && book.faction && !activeFilters.includes(book.faction);
  
  const TypeIcon = typeIcons[book.type] || Book;
  const FactionIcon = factionIcons[book.faction] || Shield;

  const typeColors = {
    novel: 'text-primary',
    short: 'text-accent',
    omnibus: 'text-omnibus',
    anthology: 'text-success'
  };

  return (
    <>
      <div 
        className={cn(
          "oled-surface rounded-lg p-3 transition-all duration-200",
          "border-l-3",
          isRead ? "border-l-success bg-success/5" : `type-${book.type}`,
          isSubItem && "ml-4 border-l-2",
          isSubItem && book.type === 'short' && "bg-white/[0.02]",
          isDimmed && "faction-dimmed",
          className
        )}
      >
        <div className="flex items-start gap-3">
          {/* Expand button for omnibus/anthology OR checkbox */}
          {hasContents ? (
            <button
              onClick={onToggleExpand}
              className="touch-target flex items-center justify-center shrink-0"
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isExpanded 
                  ? "bg-primary/20 text-primary" 
                  : "bg-white/5 text-slate-400"
              )}>
                <ChevronRight className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isExpanded && "rotate-90"
                )} />
              </div>
            </button>
          ) : (
            <TouchCheckbox
              checked={isRead}
              onCheckedChange={onReadChange}
              type={book.type}
            />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start gap-2">
              <TypeIcon className={cn(
                "w-4 h-4 mt-0.5 shrink-0",
                isRead ? "text-success" : typeColors[book.type]
              )} />
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "font-semibold leading-tight",
                  isSubItem && book.type === 'short' ? "text-sm" : "text-base",
                  isRead ? "text-success" : "text-white"
                )}>
                  {book.title}
                </h4>
                
                {/* Author + Pages + Faction */}
                {book.author && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <User className="w-3 h-3" />
                      {book.author}
                    </span>
                    {book.pages && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <FileText className="w-3 h-3" />
                        {book.pages.toLocaleString()}p
                      </span>
                    )}
                    {book.faction && (
                      <FactionIcon className={cn(
                        "w-3.5 h-3.5",
                        book.faction === 'imperium' && "text-imperium",
                        book.faction === 'chaos' && "text-chaos",
                        book.faction === 'xenos' && "text-xenos"
                      )} />
                    )}
                  </div>
                )}

                {/* Type badge for omnibus/anthology */}
                {hasContents && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={cn(
                      "text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full",
                      book.type === 'omnibus' && "bg-omnibus/20 text-omnibus",
                      book.type === 'anthology' && "bg-success/20 text-success"
                    )}>
                      {book.type?.toUpperCase()}
                    </span>
                    {childProgress && (
                      <span className={cn(
                        "text-xs font-semibold",
                        childProgress.read === childProgress.total 
                          ? "text-success" 
                          : "text-slate-400"
                      )}>
                        {childProgress.read}/{childProgress.total} COMPLETE
                      </span>
                    )}
                  </div>
                )}

                {/* Tags */}
                {book.tags && book.tags.length > 0 && !isSubItem && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {book.tags.map((tag, i) => (
                      <span 
                        key={i}
                        className="text-[10px] px-2 py-0.5 bg-white/5 text-slate-400 rounded-full font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rating - only when read */}
            {isRead && !hasContents && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <SkullRating
                  rating={rating}
                  onRatingChange={onRatingChange}
                  size="sm"
                />
              </div>
            )}
          </div>

          {/* Notes button */}
          {!isSubItem && (
            <button
              onClick={() => setShowNotes(true)}
              className={cn(
                "touch-target flex items-center justify-center shrink-0",
                "transition-colors duration-200"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                notes 
                  ? "bg-primary/20 text-primary" 
                  : "bg-white/5 text-slate-500 hover:text-slate-300"
              )}>
                <PenLine className="w-4 h-4" />
              </div>
            </button>
          )}
        </div>
      </div>

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

// Sub-story entry component
export const SubStoryEntry = ({
  story,
  index,
  isRead = false,
  onReadChange,
  className
}) => {
  const TypeIcon = typeIcons[story.type] || ScrollText;
  const isShort = story.type === 'short';

  return (
    <div
      className={cn(
        "oled-surface rounded-lg p-3 ml-6 border-l-2",
        isRead ? "border-l-success bg-success/5" : "border-l-white/20",
        isShort && "bg-white/[0.02]",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <TouchCheckbox
          checked={isRead}
          onCheckedChange={onReadChange}
          type={story.type}
        />
        
        <TypeIcon className={cn(
          "w-4 h-4 shrink-0",
          isRead ? "text-success" : isShort ? "text-accent" : "text-primary"
        )} />
        
        <div className="flex-1 min-w-0">
          <h5 className={cn(
            "leading-tight",
            isShort ? "text-sm font-medium" : "text-base font-semibold",
            isRead ? "text-success" : "text-slate-200"
          )}>
            {story.title}
          </h5>
          {story.pages && (
            <span className="text-xs text-slate-500 font-mono">
              {story.pages}p
            </span>
          )}
        </div>

        {/* Type indicator */}
        <span className={cn(
          "text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded",
          isShort 
            ? "bg-accent/20 text-accent" 
            : "bg-primary/20 text-primary"
        )}>
          {story.type === 'short' ? 'SHORT' : 'NOVEL'}
        </span>
      </div>
    </div>
  );
};

export default BookEntry;
