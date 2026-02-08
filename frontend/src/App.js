import React, { useState, useEffect, useMemo } from 'react';
import { GlobalHeader } from '@/components/GlobalHeader';
import { SectorCard } from '@/components/SectorCard';
import { PhaseDetail } from '@/components/PhaseDetail';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Loader2, AlertTriangle, Database } from 'lucide-react';

function App() {
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);
  
  // Persist reading progress in localStorage
  const [bookProgress, setBookProgress] = useLocalStorage('infinity-archive-progress', {});

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

  // Calculate global statistics
  const globalStats = useMemo(() => {
    if (!projectData) return { totalBooks: 0, completedBooks: 0, totalRated: 0, averageRating: 0 };

    let totalBooks = 0;
    let completedBooks = 0;
    let totalRated = 0;
    let totalRatingSum = 0;

    projectData.phases.forEach(phase => {
      phase.books.forEach(book => {
        totalBooks++;
        const progress = bookProgress[book.title];
        if (progress?.isRead) {
          completedBooks++;
        }
        if (progress?.rating > 0) {
          totalRated++;
          totalRatingSum += progress.rating;
        }
      });
    });

    return {
      totalBooks,
      completedBooks,
      totalRated,
      averageRating: totalRated > 0 ? totalRatingSum / totalRated : 0
    };
  }, [projectData, bookProgress]);

  // Calculate phase statistics
  const getPhaseStats = (phase) => {
    const books = phase.books || [];
    const completedBooks = books.filter(book => bookProgress[book.title]?.isRead).length;
    const progress = books.length > 0 ? (completedBooks / books.length) * 100 : 0;
    return { completedBooks, totalBooks: books.length, progress };
  };

  // Handle book read status change
  const handleBookReadChange = (bookTitle, isRead) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        isRead,
        // Clear rating if marking as unread
        rating: isRead ? (prev[bookTitle]?.rating || 0) : 0
      }
    }));
  };

  // Handle book rating change
  const handleBookRatingChange = (bookTitle, rating) => {
    setBookProgress(prev => ({
      ...prev,
      [bookTitle]: {
        ...prev[bookTitle],
        rating
      }
    }));
  };

  // Toggle phase expansion
  const handlePhaseClick = (phaseId) => {
    setExpandedPhase(prev => prev === phaseId ? null : phaseId);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 mx-auto rounded-sm bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center animate-pulse-glow">
              <Database className="h-8 w-8 text-gold animate-pulse" />
            </div>
          </div>
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
      <div className="min-h-screen flex items-center justify-center p-4">
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
    <div className="min-h-screen">
      {/* Scan line overlay effect */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div className="absolute left-0 right-0 h-32 bg-gradient-to-b from-gold/[0.02] to-transparent animate-scan opacity-50" />
      </div>

      {/* Grid overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 grid-overlay opacity-30" />

      {/* Global Header */}
      <GlobalHeader
        totalBooks={globalStats.totalBooks}
        completedBooks={globalStats.completedBooks}
        totalRated={globalStats.totalRated}
        averageRating={globalStats.averageRating}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 relative z-10">
        {/* Project description */}
        <div className="mb-8 p-4 rounded-sm bg-gradient-to-r from-gold/5 via-transparent to-gold/5 border border-gold/20">
          <p className="font-data text-sm text-muted-foreground text-center">
            <span className="text-gold">&gt;</span> {projectData.description}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="font-tactical text-[10px] text-muted-foreground/60 tracking-wider">
              {projectData.totalPhases} SECTORS
            </span>
            <span className="text-muted-foreground/30">|</span>
            <span className="font-tactical text-[10px] text-muted-foreground/60 tracking-wider">
              LAST UPDATED: {projectData.lastUpdated}
            </span>
          </div>
        </div>

        {/* Phase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {projectData.phases.map((phase) => {
            const stats = getPhaseStats(phase);
            const isExpanded = expandedPhase === phase.id;

            return (
              <div 
                key={phase.id} 
                className={isExpanded ? 'md:col-span-2 xl:col-span-3 2xl:col-span-4' : ''}
              >
                <SectorCard
                  phase={phase}
                  progress={stats.progress}
                  totalBooks={stats.totalBooks}
                  completedBooks={stats.completedBooks}
                  isExpanded={isExpanded}
                  onClick={() => handlePhaseClick(phase.id)}
                />

                {/* Expanded Phase Detail */}
                {isExpanded && (
                  <PhaseDetail
                    phase={phase}
                    bookData={bookProgress}
                    onBookReadChange={handleBookReadChange}
                    onBookRatingChange={handleBookRatingChange}
                    onClose={() => setExpandedPhase(null)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-terminal shadow-[0_0_6px_hsl(var(--terminal-green))] animate-pulse" />
              <span className="font-tactical text-[10px] text-muted-foreground tracking-widest">
                COGITATOR ONLINE
              </span>
            </div>
            
            <p className="font-data text-xs text-muted-foreground/60">
              THE INFINITY ARCHIVE • DATA PERSISTED IN LOCAL MEMORY BANKS
            </p>
            
            <div className="flex items-center gap-2">
              <span className="font-tactical text-[10px] text-gold/60 tracking-wider">
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
