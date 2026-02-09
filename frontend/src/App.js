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
  
  const [bookProgress, setBookProgress] = useLocalStorage('infinity-archive-v3', {});

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

  // Calculate global stats recursively - sum all pages
  const globalStats = useMemo(() => {
    if (!projectData) return { 
      totalPages: 0, readPages: 0, totalItems: 0, completedItems: 0, 
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
        
        if (book.contents && book.contents.length > 0) {
          // Omnibus/Anthology - count sub-items
          book.contents.forEach(subItem => {
            totalPages += subItem.pages || 0;
            totalItems++;
            if (progress?.contents?.[subItem.title]) {
              readPages += subItem.pages || 0;
              completedItems++;
            }
          });
        } else {
          // Single book
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
      totalItems,
      completedItems,
      totalRated,
      averageRating: totalRated > 0 ? totalRatingSum / totalRated : 0
    };
  }, [projectData, bookProgress]);

  // Phase stats
  const getPhaseStats = useCallback((phase) => {
    const books = phase.books || [];
    let totalPages = 0;
    let readPages = 0;
    let totalItems = 0;
    let completedItems = 0;

    books.forEach(book => {
      const progress = bookProgress[book.title];
      
      if (book.contents && book.contents.length > 0) {
        book.contents.forEach(subItem => {
          totalPages += subItem.pages || 0;
          totalItems++;
          if (progress?.contents?.[subItem.title]) {
            readPages += subItem.pages || 0;
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
      completedItems, 
      totalItems, 
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

  const handleSubItemReadChange = useCallback((bookTitle, subItemTitle, isRead) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        contents: {
          ...prev[bookTitle]?.contents,
          [subItemTitle]: { ...(prev[bookTitle]?.contents?.[subItemTitle] || {}), isRead }
        }
      }
    }));
  }, [setBookProgress]);

  const handleSubItemRatingChange = useCallback((bookTitle, subItemTitle, rating) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        contents: {
          ...prev[bookTitle]?.contents,
          [subItemTitle]: { ...(prev[bookTitle]?.contents?.[subItemTitle] || {}), rating }
        }
      }
    }));
  }, [setBookProgress]);

  const handleSubItemNotesChange = useCallback((bookTitle, subItemTitle, notes) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        contents: {
          ...prev[bookTitle]?.contents,
          [subItemTitle]: { ...(prev[bookTitle]?.contents?.[subItemTitle] || {}), notes }
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center scanlines">
        <div className="text-center space-y-4 px-6">
          <div className="w-16 h-16 mx-auto rounded-xl grimdark-panel flex items-center justify-center animate-pulse">
            <Database className="w-8 h-8 text-gold" />
          </div>
          <div>
            <p className="font-display text-xl text-gold tracking-wider text-glow-gold">INITIALIZING COGITATOR</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Loader2 className="w-5 h-5 animate-spin text-auspex" />
              <p className="text-sm text-slate-300 font-semibold">Loading archive data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 scanlines">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-xl grimdark-panel flex items-center justify-center border-destructive/50">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <p className="font-display text-xl text-destructive tracking-wider">COGITATOR ERROR</p>
            <p className="text-sm text-slate-300 mt-2 font-medium">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 grimdark-panel rounded-lg font-bold text-gold tracking-wider hover:glow-gold transition-all"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 safe-bottom scanlines">
      <GlobalHeader
        totalPages={globalStats.totalPages}
        readPages={globalStats.readPages}
        totalItems={globalStats.totalItems}
        completedItems={globalStats.completedItems}
        totalRated={globalStats.totalRated}
        averageRating={globalStats.averageRating}
        activeFilters={activeFilters}
        onFilterToggle={handleFilterToggle}
      />

      <main className="px-4 py-4 pb-32">
        {/* Description */}
        <div className="grimdark-panel rounded-lg p-4 mb-4">
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            <span className="text-gold font-bold">{'>'}</span> {projectData.description}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-data">
            <span>{projectData.totalPhases} SECTORS</span>
            <span className="text-gold">•</span>
            <span>{globalStats.totalPages.toLocaleString()} TOTAL PAGES</span>
            <span className="text-gold">•</span>
            <span>{globalStats.totalItems} ITEMS</span>
          </div>
        </div>

        {/* Phase cards */}
        <div className="space-y-3">
          {projectData.phases.map((phase) => {
            const stats = getPhaseStats(phase);
            const isExpanded = expandedPhase === phase.id;
            const isPacified = stats.progress >= 100;

            return (
              <div 
                key={phase.id}
                className="animate-slide-in"
                style={{ animationDelay: `${phase.id * 50}ms` }}
              >
                <PhaseCard
                  phase={phase}
                  progress={stats.progress}
                  totalPages={stats.totalPages}
                  readPages={stats.readPages}
                  totalItems={stats.totalItems}
                  completedItems={stats.completedItems}
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
                    onSubItemReadChange={handleSubItemReadChange}
                    onClose={() => setExpandedPhase(null)}
                    activeFilters={activeFilters}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-gold/20">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-auspex animate-pulse-glow shadow-[0_0_8px_hsl(var(--auspex))]" />
              <span className="font-tactical tracking-widest text-auspex">COGITATOR ONLINE</span>
            </div>
            <span className="font-data">v.M41.3 • {globalStats.totalPages.toLocaleString()} PAGES</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
