import React from 'react';
import { Archive as ArchiveIcon } from 'lucide-react';
import { useArchiveData } from 'context/ArchiveDataContext';

export function Archive() {
  const { projectData, globalStats } = useArchiveData();
  const totalBooks = projectData.phases.reduce(
    (n, phase) => n + phase.books.length,
    0
  );

  return (
    <div className="min-h-screen bg-slate-950 safe-bottom scanlines">
      <main className="px-4 py-4 pb-32">
        <div className="grimdark-panel rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ArchiveIcon className="w-5 h-5 text-gold" />
            <h1 className="font-display text-lg text-gold tracking-wider text-glow-gold">
              THE ARCHIVE
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-2 font-data">
            {totalBooks} ENTRIES • {globalStats.totalItems} ITEMS • CATALOG-WIDE BROWSE
          </p>
        </div>
      </main>
    </div>
  );
}
