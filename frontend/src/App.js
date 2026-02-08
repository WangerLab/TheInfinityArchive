import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GlobalHeader } from '@/components/GlobalHeader';
import { SectorCard } from '@/components/SectorCard';
import { PhaseDetail } from '@/components/PhaseDetail';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertTriangle, Database } from 'lucide-react';

function App() {
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Persist reading progress in localStorage
  // Structure: { [bookTitle]: { isRead, rating, notes, contents: { [storyTitle]: isRead } } }
  const [bookProgress, setBookProgress] = useLocalStorage('infinity-archive-progress-v2', {});

  // Load project data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/project_data.json');
        if (!response.ok) {
          throw new Error('Failed to load archive data');
        }
        const data = await response.json();
        setProjectData(data);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate global statistics (pages-based)
  const globalStats = useMemo(() => {
    if (!projectData) return { 
      totalPages: 0, readPages: 0, totalBooks: 0, completedBooks: 0, 
      totalRated: 0, averageRating: 0 
    };

    let totalPages = 0;
    let readPages = 0;
    let totalBooks = 0;
    let completedBooks = 0;
    let totalRated = 0;
    let totalRatingSum = 0;

    projectData.phases.forEach(phase => {
      phase.books.forEach(book => {
        totalBooks++;
        const progress = bookProgress[book.title];
        
        if (book.contents) {
          // Omnibus with sub-stories
          let subStoriesRead = 0;
          book.contents.forEach(story => {
            totalPages += story.pages || 0;
            if (progress?.contents?.[story.title]) {
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
          if (progress?.isRead) {
            readPages += book.pages || 0;
            completedBooks++;
          }
        }
        
        if (progress?.rating > 0) {
          totalRated++;
          totalRatingSum += progress.rating;
        }
      });
    });

    return {
      totalPages,
      readPages,
      totalBooks,
      completedBooks,
      totalRated,
      averageRating: totalRated > 0 ? totalRatingSum / totalRated : 0
    };
  }, [projectData, bookProgress]);

  // Calculate phase statistics
  const getPhaseStats = useCallback((phase) => {
    const books = phase.books || [];
    let totalPages = 0;
    let readPages = 0;
    let completedBooks = 0;

    books.forEach(book => {
      const progress = bookProgress[book.title];
      
      if (book.contents) {
        let subStoriesRead = 0;
        book.contents.forEach(story => {
          totalPages += story.pages || 0;
          if (progress?.contents?.[story.title]) {
            readPages += story.pages || 0;
            subStoriesRead++;
          }
        });
        if (subStoriesRead === book.contents.length) {
          completedBooks++;
        }
      } else {
        totalPages += book.pages || 0;
        if (progress?.isRead) {
          readPages += book.pages || 0;
          completedBooks++;
        }
      }
    });

    const pagesProgress = totalPages > 0 ? (readPages / totalPages) * 100 : 0;
    const bookProgress_calc = books.length > 0 ? (completedBooks / books.length) * 100 : 0;

    return { 
      completedBooks, 
      totalBooks: books.length, 
      totalPages,
      readPages,
      progress: bookProgress_calc,
      pagesProgress
    };
  }, [bookProgress]);

  // Handle book read status change
  const handleBookReadChange = useCallback((bookTitle, isRead) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        isRead,
        rating: isRead ? (prev[bookTitle]?.rating || 0) : 0
      }
    }));
  }, [setBookProgress]);

  // Handle sub-story read status change (for omnibus)
  const handleSubStoryReadChange = useCallback((bookTitle, storyTitle, isRead) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        contents: {
          ...prev[bookTitle]?.contents,
          [storyTitle]: isRead
        }
      }
    }));
  }, [setBookProgress]);

  // Handle book rating change
  const handleBookRatingChange = useCallback((bookTitle, rating) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        rating
      }
    }));
  }, [setBookProgress]);

  // Handle book notes change
  const handleBookNotesChange = useCallback((bookTitle, notes) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        notes
      }
    }));
  }, [setBookProgress]);

  // Toggle filter
  const handleFilterToggle = useCallback((faction) => {
    setActiveFilters(prev => {
      if (prev.length === 0) {
        // No filters active, activate only this one
        return [faction];
      } else if (prev.includes(faction)) {
        // Remove this filter
        const next = prev.filter(f => f !== faction);
        return next;
      } else {
        // Add this filter
        return [...prev, faction];
      }
    });
  }, []);

  // Toggle phase expansion
  const handlePhaseClick = useCallback((phaseId) => {
    setExpandedPhase(prev => prev === phaseId ? null : phaseId);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center crt-scanlines">
        <div className="text-center space-y-4">
          <motion.div 
            className="relative"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="h-16 w-16 mx-auto rounded-sm bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center animate-pulse-glow">
              <Database className="h-8 w-8 text-gold" />
            </div>
          </motion.div>
          <div className="space-y-2">
            <p className="font-display text-lg text-gold tracking-widest">INITIALIZING COGITATOR</p>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-terminal" />
              <p className="font-data text-xs text-muted-foreground">Loading archive data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 crt-scanlines">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-sm bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <p className="font-display text-lg text-destructive tracking-widest">COGITATOR ERROR</p>
            <p className="font-data text-sm text-muted-foreground">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gold/10 border border-gold/30 rounded-sm font-tactical text-xs text-gold tracking-wider hover:bg-gold/20 transition-colors"
          >
            RETRY INITIALIZATION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen crt-scanlines">
      {/* Scan line animation overlay */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        <motion.div 
          className="absolute left-0 right-0 h-32 bg-gradient-to-b from-gold/[0.02] to-transparent"
          animate={{ y: ['-100%', '100vh'] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Grid overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 grid-overlay opacity-20" />

      {/* Global Header - Now with page tracking and filters */}
      <GlobalHeader
        totalPages={globalStats.totalPages}
        readPages={globalStats.readPages}
        totalBooks={globalStats.totalBooks}
        completedBooks={globalStats.completedBooks}
        totalRated={globalStats.totalRated}
        averageRating={globalStats.averageRating}
        activeFilters={activeFilters}
        onFilterToggle={handleFilterToggle}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 relative z-10">
        {/* Project description */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-sm bg-gradient-to-r from-gold/5 via-transparent to-gold/5 border border-gold/20"
        >
          <p className="font-data text-sm text-muted-foreground text-center">
            <span className="text-gold">&gt;</span> {projectData.description}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="font-tactical text-[9px] text-muted-foreground/60 tracking-wider">
              {projectData.totalPhases} SECTORS
            </span>
            <span className="text-muted-foreground/30">|</span>
            <span className="font-tactical text-[9px] text-muted-foreground/60 tracking-wider">
              {globalStats.totalPages.toLocaleString()} TOTAL PAGES
            </span>
            <span className="text-muted-foreground/30">|</span>
            <span className="font-tactical text-[9px] text-muted-foreground/60 tracking-wider">
              LAST UPDATED: {projectData.lastUpdated}
            </span>
          </div>
        </motion.div>

        {/* Phase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {projectData.phases.map((phase) => {
              const stats = getPhaseStats(phase);
              const isExpanded = expandedPhase === phase.id;
              const isPacified = stats.pagesProgress === 100;

              return (
                <motion.div 
                  key={phase.id} 
                  layout
                  className={isExpanded ? 'md:col-span-2 xl:col-span-3 2xl:col-span-4' : ''}
                >
                  <SectorCard
                    phase={phase}
                    progress={stats.progress}
                    pagesProgress={stats.pagesProgress}
                    totalPages={stats.totalPages}
                    readPages={stats.readPages}
                    totalBooks={stats.totalBooks}
                    completedBooks={stats.completedBooks}
                    isExpanded={isExpanded}
                    isPacified={isPacified}
                    onClick={() => handlePhaseClick(phase.id)}
                  />

                  {/* Expanded Phase Detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <PhaseDetail
                        phase={phase}
                        bookData={bookProgress}
                        onBookReadChange={handleBookReadChange}
                        onBookRatingChange={handleBookRatingChange}
                        onBookNotesChange={handleBookNotesChange}
                        onSubStoryReadChange={handleSubStoryReadChange}
                        onClose={() => setExpandedPhase(null)}
                        activeFilters={activeFilters}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-terminal shadow-[0_0_6px_hsl(var(--terminal-green))] animate-pulse" />
              <span className="font-tactical text-[9px] text-muted-foreground tracking-widest">
                COGITATOR ONLINE
              </span>
            </div>
            
            <p className="font-data text-[10px] text-muted-foreground/60">
              THE INFINITY ARCHIVE • DATA PERSISTED IN LOCAL MEMORY BANKS • v.M41.2
            </p>
            
            <div className="flex items-center gap-2">
              <span className="font-tactical text-[9px] text-gold/60 tracking-wider">
                PRAISE THE OMNISSIAH
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
