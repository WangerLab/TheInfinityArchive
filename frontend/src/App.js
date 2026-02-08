import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GlobalHeader } from '@/components/GlobalHeader';
import { PhaseCard } from '@/components/PhaseCard';
import { PhaseDetail } from '@/components/PhaseDetail';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Loader2, AlertTriangle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

function App() {
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  
  const [bookProgress, setBookProgress] = useLocalStorage('infinity-archive-mobile-v1', {});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/project_data.json');
        if (!response.ok) throw new Error('Failed to load archive data');
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

  // Global stats calculation
  const globalStats = useMemo(() => {
    if (!projectData) return { 
      totalPages: 0, readPages: 0, totalBooks: 0, completedBooks: 0, 
      totalRated: 0, averageRating: 0 
    };

    let totalPages = 0;
    let readPages = 0;
    let totalItems = 0;
    let completedItems = 0;
    let totalRated = 0;
    let totalRatingSum = 0;

    projectData.phases.forEach(phase => {
      phase.books.forEach(book => {
        const progress = bookProgress[book.title];
        
        if (book.contents) {
          book.contents.forEach(story => {
            totalPages += story.pages || 0;
            totalItems++;
            if (progress?.contents?.[story.title]) {
              readPages += story.pages || 0;
              completedItems++;
            }
          });
        } else {
          totalPages += book.pages || 0;
          totalItems++;
          if (progress?.isRead) {
            readPages += book.pages || 0;
            completedItems++;
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
      totalBooks: totalItems,
      completedBooks: completedItems,
      totalRated,
      averageRating: totalRated > 0 ? totalRatingSum / totalRated : 0
    };
  }, [projectData, bookProgress]);

  // Phase stats
  const getPhaseStats = useCallback((phase) => {
    const books = phase.books || [];
    let totalPages = 0;
    let readPages = 0;
    let completedItems = 0;
    let totalItems = 0;

    books.forEach(book => {
      const progress = bookProgress[book.title];
      
      if (book.contents) {
        book.contents.forEach(story => {
          totalPages += story.pages || 0;
          totalItems++;
          if (progress?.contents?.[story.title]) {
            readPages += story.pages || 0;
            completedItems++;
          }
        });
      } else {
        totalPages += book.pages || 0;
        totalItems++;
        if (progress?.isRead) {
          readPages += book.pages || 0;
          completedItems++;
        }
      }
    });

    return { 
      completedBooks: completedItems, 
      totalBooks: totalItems, 
      totalPages,
      readPages,
      progress: totalPages > 0 ? (readPages / totalPages) * 100 : 0
    };
  }, [bookProgress]);

  // Handlers
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

  const handleBookRatingChange = useCallback((bookTitle, rating) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        rating
      }
    }));
  }, [setBookProgress]);

  const handleBookNotesChange = useCallback((bookTitle, notes) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        notes
      }
    }));
  }, [setBookProgress]);

  const handleFilterToggle = useCallback((faction) => {
    setActiveFilters(prev => {
      if (prev.length === 0) return [faction];
      if (prev.includes(faction)) {
        return prev.filter(f => f !== faction);
      }
      return [...prev, faction];
    });
  }, []);

  const handlePhaseClick = useCallback((phaseId) => {
    setExpandedPhase(prev => prev === phaseId ? null : phaseId);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <div className="w-16 h-16 mx-auto rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center animate-pulse">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-display text-lg text-primary tracking-wider">INITIALIZING</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <p className="text-sm text-slate-400">Loading archive data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <p className="font-display text-lg text-destructive tracking-wider">ERROR</p>
            <p className="text-sm text-slate-400 mt-2">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary/10 border border-primary/30 rounded-lg font-semibold text-primary tracking-wider"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black safe-bottom">
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

      <main className="px-4 py-4 pb-8">
        {/* Description */}
        <div className="oled-surface rounded-lg p-3 mb-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            <span className="text-primary font-semibold">{'>'}</span> {projectData.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span className="font-mono">{projectData.totalPhases} SECTORS</span>
            <span>•</span>
            <span className="font-mono">{globalStats.totalPages.toLocaleString()} PAGES</span>
          </div>
        </div>

        {/* Phase cards */}
        <div className="space-y-3">
          {projectData.phases.map((phase) => {
            const stats = getPhaseStats(phase);
            const isExpanded = expandedPhase === phase.id;
            const isPacified = stats.progress === 100;

            return (
              <div 
                key={phase.id}
                className="animate-slide-up"
                style={{ animationDelay: `${phase.id * 50}ms` }}
              >
                <PhaseCard
                  phase={phase}
                  progress={stats.progress}
                  totalPages={stats.totalPages}
                  readPages={stats.readPages}
                  totalBooks={stats.totalBooks}
                  completedBooks={stats.completedBooks}
                  isExpanded={isExpanded}
                  isPacified={isPacified}
                  onClick={() => handlePhaseClick(phase.id)}
                />

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
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
              <span className="font-semibold tracking-wider">ONLINE</span>
            </div>
            <span className="font-mono">v.M41 • LOCAL STORAGE</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
