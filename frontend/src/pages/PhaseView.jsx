import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobalHeader } from 'components/GlobalHeader';
import { PhaseCard } from 'components/PhaseCard';
import { PhaseDetail } from 'components/PhaseDetail';
import { CurrentAssignment } from 'components/CurrentAssignment';
import { useArchiveData } from 'context/ArchiveDataContext';
import { ViewBackdrop } from 'components/ViewBackdrop';

export function PhaseView() {
  const {
    projectData,
    bookProgress,
    globalStats,
    currentReading,
    getPhaseStats,
    getEntryProgress,
    handleBookReadChange,
    handleBookRatingChange,
    handleBookNotesChange,
  } = useArchiveData();

  const navigate = useNavigate();
  const initialPhaseId = currentReading?.phase?.id ?? projectData.phases[0]?.id ?? null;
  const [selectedPhaseId, setSelectedPhaseId] = useState(initialPhaseId);

  const handlePhaseSelect = useCallback((phaseId) => {
    setSelectedPhaseId(phaseId);
  }, []);

  const selectedPhase = projectData.phases.find(p => p.id === selectedPhaseId) ?? null;

  const pacifiedSectors = projectData.phases.filter(
    (p) => getPhaseStats(p).progress >= 100
  ).length;

  return (
    <ViewBackdrop art="/Chart-console_with_skull-beacon2K_202607041801.jpeg" accent="campaign">
      <GlobalHeader
        totalPages={globalStats.totalPages}
        readPages={globalStats.readPages}
        totalItems={globalStats.totalItems}
        completedItems={globalStats.completedItems}
        totalRated={globalStats.totalRated}
        averageRating={globalStats.averageRating}
        pacifiedSectors={pacifiedSectors}
        totalSectors={projectData.totalPhases}
      >
        <CurrentAssignment
          current={currentReading}
          onOpen={(entryId) => navigate('/book/' + entryId)}
        />

        <div className="grimdark-panel rounded-lg p-4">
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
      </GlobalHeader>

      <main className="px-4 py-4">
        <div className="lg:grid lg:grid-cols-[minmax(300px,360px)_1fr] lg:gap-5 lg:items-start">

          {/* LINKS: Phasenliste, sticky */}
          <div className="space-y-3 lg:sticky lg:top-[220px] lg:self-start">
            {projectData.phases.map((phase) => {
              const stats = getPhaseStats(phase);
              const isSelected = selectedPhaseId === phase.id;
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
                    isSelected={isSelected}
                    isPacified={isPacified}
                    onClick={() => handlePhaseSelect(phase.id)}
                  />
                </div>
              );
            })}
          </div>

          {/* RECHTS: Detail der gewählten Phase */}
          <div className="mt-3 lg:mt-0">
            {selectedPhase && (
              <PhaseDetail
                phase={selectedPhase}
                bookData={bookProgress}
                getEntryProgress={getEntryProgress}
                onBookReadChange={handleBookReadChange}
                onBookRatingChange={handleBookRatingChange}
                onBookNotesChange={handleBookNotesChange}
              />
            )}
          </div>

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
    </ViewBackdrop>
  );
}
