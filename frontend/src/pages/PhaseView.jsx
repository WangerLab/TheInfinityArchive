import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobalHeader } from 'components/GlobalHeader';
import { PhaseCard } from 'components/PhaseCard';
import { PhaseDetail } from 'components/PhaseDetail';
import { CurrentAssignment } from 'components/CurrentAssignment';
import { CurrentBookDossier } from 'components/CurrentBookDossier';
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
      <div className="flex flex-col min-h-screen">
        <GlobalHeader
          totalPages={globalStats.totalPages}
          readPages={globalStats.readPages}
          totalItems={globalStats.totalItems}
          completedItems={globalStats.completedItems}
          totalRated={globalStats.totalRated}
          averageRating={globalStats.averageRating}
          pacifiedSectors={pacifiedSectors}
          totalSectors={projectData.totalPhases}
          description={projectData.description}
          assignmentSlot={
            <CurrentAssignment
              current={currentReading}
              onOpen={(entryId) => navigate('/book/' + entryId)}
              className="h-full"
            />
          }
          dossierSlot={
            <CurrentBookDossier book={currentReading?.book} className="h-full" />
          }
        />

        <main className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 py-4">
          <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[minmax(300px,360px)_1fr] lg:gap-5">

            {/* LINKS: Phasenliste (eigener Scroll-Container) */}
            <div className="space-y-3 pt-2 lg:h-full lg:overflow-y-auto lg:pr-2 lg:pl-1">
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
            <div className="mt-3 lg:mt-0 lg:h-full lg:overflow-y-auto lg:pr-2">
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
          <footer className="shrink-0 mt-4 pt-4 border-t border-gold/20">
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
    </ViewBackdrop>
  );
}
