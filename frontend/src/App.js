import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GlobalHeader } from 'components/GlobalHeader';
import { AuthGate } from 'components/AuthGate';
import { PhaseCard } from 'components/PhaseCard';
import { PhaseDetail } from 'components/PhaseDetail';
import { ArchiveDataProvider, useArchiveData } from 'context/ArchiveDataContext';

function ArchiveApp() {
  const {
    projectData,
    bookProgress,
    globalStats,
    getPhaseStats,
    handleBookReadChange,
    handleBookRatingChange,
    handleBookNotesChange,
    handleSubItemReadChange,
    handleSubItemRatingChange,
    handleSubItemNotesChange,
  } = useArchiveData();

  const [expandedPhase, setExpandedPhase] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);

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
                    onSubItemRatingChange={handleSubItemRatingChange}
                    onSubItemNotesChange={handleSubItemNotesChange}
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

function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <ArchiveDataProvider>
          <Routes>
            <Route path="*" element={<ArchiveApp />} />
          </Routes>
        </ArchiveDataProvider>
      </AuthGate>
    </BrowserRouter>
  );
}

export default App;
