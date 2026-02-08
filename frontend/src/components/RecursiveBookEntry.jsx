import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { GrimdarkCheckbox } from './GrimdarkCheckbox';
import { SkullRating } from './SkullRating';
import { NotesModal } from './NotesModal';
import { 
  Book, ScrollText, Library, Layers, 
  ChevronRight, Feather, User, FileText,
  Sparkles, Crown
} from 'lucide-react';

// Type icon mapping
const typeIcons = {
  novel: Book,
  short: ScrollText,
  omnibus: Library,
  anthology: Layers
};

// Type colors
const typeStyles = {
  novel: {
    border: 'border-l-gold',
    badge: 'bg-gold/20 text-gold border-gold/40',
    icon: 'text-gold'
  },
  short: {
    border: 'border-l-plasma',
    badge: 'bg-plasma/20 text-plasma border-plasma/40',
    icon: 'text-plasma'
  },
  omnibus: {
    border: 'border-l-purple-500',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    icon: 'text-purple-400'
  },
  anthology: {
    border: 'border-l-auspex',
    badge: 'bg-auspex/20 text-auspex border-auspex/40',
    icon: 'text-auspex'
  }
};

export const RecursiveBookEntry = ({ 
  book, 
  index,
  depth = 0,
  bookData = {},
  onReadChange,
  onRatingChange,
  onNotesChange,
  onSubItemReadChange,
  activeFilters = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(book.tags?.includes('Completed') || false);
  const [showNotes, setShowNotes] = useState(false);
  
  const hasContents = book.contents && book.contents.length > 0;
  const TypeIcon = typeIcons[book.type] || Book;
  const style = typeStyles[book.type] || typeStyles.novel;
  
  const isLegendary = book.tags?.includes('Legendary');
  const isCompleted = book.tags?.includes('Completed');
  
  // Calculate read status
  const getReadStatus = () => {
    if (hasContents) {
      const contentData = bookData.contents || {};
      const readCount = book.contents.filter(c => contentData[c.title]).length;
      return readCount === book.contents.length;
    }
    return bookData.isRead || false;
  };
  
  const isRead = getReadStatus();
  
  // Get child progress
  const getChildProgress = () => {
    if (!hasContents) return null;
    const contentData = bookData.contents || {};
    const readCount = book.contents.filter(c => contentData[c.title]).length;
    return { read: readCount, total: book.contents.length };
  };
  
  const childProgress = getChildProgress();

  return (
    <>
      <div 
        className={cn(
          "rounded-lg p-3 transition-all duration-200",
          "bg-gradient-to-r from-slate-900/80 to-transparent",
          "border-l-3",
          isRead ? "border-l-auspex bg-auspex/5" : style.border,
          isLegendary && "grimdark-panel-legendary",
          depth > 0 && "ml-4"
        )}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        <div className="flex items-start gap-2">
          {/* Expand/Checkbox area */}
          {hasContents ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="touch-checkbox flex items-center justify-center shrink-0"
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-all border",
                isExpanded 
                  ? "bg-gold/20 text-gold border-gold/40" 
                  : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-gold/40"
              )}>
                <ChevronRight className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isExpanded && "rotate-90"
                )} />
              </div>
            </button>
          ) : (
            <GrimdarkCheckbox
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
                isRead ? "text-auspex" : style.icon
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={cn(
                    "font-semibold leading-tight",
                    book.type === 'short' ? "text-sm italic" : "text-base",
                    isRead ? "text-auspex" : "text-slate-100"
                  )}>
                    {book.title}
                  </h4>
                  
                  {/* Legendary badge */}
                  {isLegendary && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gold/20 border border-gold/40 rounded text-[9px] font-bold text-gold">
                      <Crown className="w-3 h-3" />
                      LEGENDARY
                    </span>
                  )}
                  
                  {/* Completed badge */}
                  {isCompleted && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-auspex/20 border border-auspex/40 rounded text-[9px] font-bold text-auspex">
                      <Sparkles className="w-3 h-3" />
                      COMPLETED
                    </span>
                  )}
                </div>

                {/* Author & Pages */}
                {book.author && (
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
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
                  </div>
                )}

                {/* Type badge + child progress */}
                {hasContents && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={cn(
                      "text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border",
                      style.badge
                    )}>
                      {book.type?.toUpperCase()}
                    </span>
                    {childProgress && (
                      <span className={cn(
                        "text-xs font-bold",
                        childProgress.read === childProgress.total 
                          ? "text-auspex" 
                          : "text-slate-400"
                      )}>
                        {childProgress.read}/{childProgress.total} COMPLETE
                      </span>
                    )}
                  </div>
                )}

                {/* Tags for non-omnibus */}
                {!hasContents && book.tags && book.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {book.tags.filter(t => !['Legendary', 'Completed'].includes(t)).map((tag, i) => (
                      <span 
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 bg-slate-800/80 text-slate-400 rounded border border-slate-700/50 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Rating - only when read and not omnibus */}
                {isRead && !hasContents && (
                  <div className="mt-3 pt-3 border-t border-slate-700/30">
                    <SkullRating
                      rating={bookData.rating || 0}
                      onRatingChange={onRatingChange}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes button */}
          {depth === 0 && (
            <button
              onClick={() => setShowNotes(true)}
              className={cn(
                "touch-checkbox flex items-center justify-center shrink-0",
                "transition-colors duration-200"
              )}
              title="Remembrancer's Log"
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center border",
                bookData.notes 
                  ? "bg-gold/20 text-gold border-gold/40" 
                  : "bg-slate-800/50 text-slate-500 border-slate-700 hover:text-gold hover:border-gold/40"
              )}>
                <Feather className="w-4 h-4" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Expanded contents (sub-items) */}
      {hasContents && isExpanded && (
        <div className="space-y-2 mt-2 ml-4 pl-4 border-l-2 border-gold/20">
          {book.contents.map((subItem, subIndex) => {
            const SubIcon = typeIcons[subItem.type] || ScrollText;
            const subStyle = typeStyles[subItem.type] || typeStyles.short;
            const subIsRead = bookData.contents?.[subItem.title] || false;
            
            return (
              <div
                key={subItem.title}
                className={cn(
                  "rounded-lg p-3 transition-all duration-200 animate-slide-in",
                  "bg-gradient-to-r from-slate-900/60 to-transparent",
                  "border-l-2",
                  subIsRead ? "border-l-auspex bg-auspex/5" : subStyle.border
                )}
                style={{ animationDelay: `${subIndex * 50}ms` }}
              >
                <div className="flex items-center gap-2">
                  <GrimdarkCheckbox
                    checked={subIsRead}
                    onCheckedChange={(checked) => onSubItemReadChange(book.title, subItem.title, checked)}
                    type={subItem.type}
                  />
                  
                  <SubIcon className={cn(
                    "w-4 h-4 shrink-0",
                    subIsRead ? "text-auspex" : subStyle.icon
                  )} />
                  
                  <div className="flex-1 min-w-0">
                    <h5 className={cn(
                      "leading-tight",
                      subItem.type === 'short' ? "text-sm italic font-medium" : "text-base font-semibold",
                      subIsRead ? "text-auspex" : "text-slate-200"
                    )}>
                      {subItem.title}
                    </h5>
                    {subItem.pages && (
                      <span className="text-xs text-slate-500 font-data">
                        {subItem.pages}p
                      </span>
                    )}
                  </div>

                  {/* Type badge */}
                  <span className={cn(
                    "text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border shrink-0",
                    subItem.type === 'short' 
                      ? "bg-plasma/20 text-plasma border-plasma/40" 
                      : "bg-gold/20 text-gold border-gold/40"
                  )}>
                    {subItem.type === 'short' ? 'SHORT' : 'NOVEL'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes Modal */}
      <NotesModal
        isOpen={showNotes}
        onClose={() => setShowNotes(false)}
        bookTitle={book.title}
        notes={bookData.notes || ''}
        onNotesChange={onNotesChange}
      />
    </>
  );
};

export default RecursiveBookEntry;
