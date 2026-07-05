import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useCatalog } from 'hooks/useCatalog';
import { useSupabaseProgress } from 'hooks/useSupabaseProgress';
import { Loader2, AlertTriangle, Database } from 'lucide-react';

const ArchiveDataContext = createContext(null);

export function useArchiveData() {
  const ctx = useContext(ArchiveDataContext);
  if (ctx === null) {
    throw new Error('useArchiveData must be used within an ArchiveDataProvider');
  }
  return ctx;
}

export function ArchiveDataProvider({ children }) {
  const { data: projectData, loading, error } = useCatalog();
  const [bookProgress, setBookProgress, { loading: progressLoading, error: progressError }] = useSupabaseProgress();

  // Global stats — sum all pages recursively
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

    const isSubItemRead = (data) => {
      if (typeof data === 'boolean') return data;
      return data?.isRead || false;
    };

    projectData.phases.forEach(phase => {
      phase.books.forEach(book => {
        const progress = bookProgress[book.entryId];

        if (book.contents && book.contents.length > 0) {
          book.contents.forEach(subItem => {
            totalPages += subItem.pages || 0;
            totalItems++;
            const subData = progress?.contents?.[subItem.entryId];
            if (isSubItemRead(subData)) {
              readPages += subItem.pages || 0;
              completedItems++;
            }
            if (typeof subData === 'object' && subData?.rating > 0) {
              totalRated++;
              totalRatingSum += subData.rating;
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
      totalItems,
      completedItems,
      totalRated,
      averageRating: totalRated > 0 ? totalRatingSum / totalRated : 0
    };
  }, [projectData, bookProgress]);

  // The single "current assignment" — the entry-level book with status='reading'.
  // The user reads one book at a time; if multiple are reading (invariant not yet
  // enforced), pick the most recently started. Returns { book, phase } | null.
  const currentReading = useMemo(() => {
    if (!projectData) return null;
    let best = null;
    let bestStarted = -Infinity;
    for (const phase of projectData.phases) {
      for (const book of phase.books) {
        const p = bookProgress[book.entryId];
        if (p?.status !== 'reading') continue;
        const t = p.startedAt ? Date.parse(p.startedAt) : 0;
        if (t >= bestStarted) { bestStarted = t; best = { book, phase }; }
      }
    }
    return best;
  }, [projectData, bookProgress]);

  // A read book with no personal_take yet is PENDING reflection. Derived, never
  // stored — same principle as is_read: a marker must not diverge from its source.
  // Entry-level only (reflection is entry-level, like reading status).
  const isReflectionPending = useCallback((entryId) => {
    const p = bookProgress[entryId];
    if (!p) return false;
    const take = (p.personalTake ?? '').trim();
    return p.status === 'read' && take.length === 0;
  }, [bookProgress]);

  // Per-phase stats
  const getPhaseStats = useCallback((phase) => {
    const books = phase.books || [];
    let totalPages = 0;
    let readPages = 0;
    let totalItems = 0;
    let completedItems = 0;

    const isSubItemRead = (data) => {
      if (typeof data === 'boolean') return data;
      return data?.isRead || false;
    };

    books.forEach(book => {
      const progress = bookProgress[book.entryId];

      if (book.contents && book.contents.length > 0) {
        book.contents.forEach(subItem => {
          totalPages += subItem.pages || 0;
          totalItems++;
          if (isSubItemRead(progress?.contents?.[subItem.entryId])) {
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

  // Progress handlers
  const handleBookStatusChange = useCallback((entryId, status) => {
    setBookProgress(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        status,
        isRead: status === 'read',
        rating: status === 'read' ? (prev[entryId]?.rating || 0) : 0,
      },
    }));
  }, [setBookProgress]);

  // Atomically start reading `entryId`, optionally transitioning a previously
  // reading book in the SAME update so the "one book reading" invariant never
  // breaks mid-flight. prevEntryId/prevStatus are null when nothing else was reading.
  const handleStartReading = useCallback((entryId, prevEntryId = null, prevStatus = null) => {
    setBookProgress(prev => {
      const next = { ...prev };
      if (prevEntryId && prevEntryId !== entryId && prevStatus) {
        next[prevEntryId] = {
          ...prev[prevEntryId],
          status: prevStatus,
          isRead: prevStatus === 'read',
          rating: prevStatus === 'read' ? (prev[prevEntryId]?.rating || 0) : 0,
        };
      }
      next[entryId] = {
        ...prev[entryId],
        status: 'reading',
        isRead: false,
      };
      return next;
    });
  }, [setBookProgress]);

  const handleBookReadChange = useCallback((entryId, isRead) => {
    setBookProgress(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        status: isRead ? 'read' : 'unread',
        isRead,
        rating: isRead ? (prev[entryId]?.rating || 0) : 0,
      },
    }));
  }, [setBookProgress]);

  const handleSubItemReadChange = useCallback((entryId, subEntryId, isRead) => {
    setBookProgress(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        contents: {
          ...prev[entryId]?.contents,
          [subEntryId]: { ...(prev[entryId]?.contents?.[subEntryId] || {}), isRead }
        }
      }
    }));
  }, [setBookProgress]);

  const handleSubItemRatingChange = useCallback((entryId, subEntryId, rating) => {
    setBookProgress(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        contents: {
          ...prev[entryId]?.contents,
          [subEntryId]: { ...(prev[entryId]?.contents?.[subEntryId] || {}), rating }
        }
      }
    }));
  }, [setBookProgress]);

  const handleSubItemNotesChange = useCallback((entryId, subEntryId, notes) => {
    setBookProgress(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        contents: {
          ...prev[entryId]?.contents,
          [subEntryId]: { ...(prev[entryId]?.contents?.[subEntryId] || {}), notes }
        }
      }
    }));
  }, [setBookProgress]);

  const handleBookRatingChange = useCallback((entryId, rating) => {
    setBookProgress(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        rating
      }
    }));
  }, [setBookProgress]);

  const handleBookNotesChange = useCallback((entryId, notes) => {
    setBookProgress(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        notes
      }
    }));
  }, [setBookProgress]);

  const handleBookPersonalTakeChange = useCallback((entryId, personalTake) => {
    setBookProgress(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        personalTake
      }
    }));
  }, [setBookProgress]);

  // Loading state — Cogitator boot
  if (loading || progressLoading) {
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
  if (error || progressError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 scanlines">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-xl grimdark-panel flex items-center justify-center border-destructive/50">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <p className="font-display text-xl text-destructive tracking-wider">COGITATOR ERROR</p>
            <p className="text-sm text-slate-300 mt-2 font-medium">{error || progressError}</p>
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

  const value = {
    projectData,
    bookProgress,
    globalStats,
    currentReading,
    getPhaseStats,
    handleBookReadChange,
    handleBookStatusChange,
    handleStartReading,
    handleBookRatingChange,
    handleBookNotesChange,
    handleBookPersonalTakeChange,
    isReflectionPending,
    handleSubItemReadChange,
    handleSubItemRatingChange,
    handleSubItemNotesChange,
  };

  return (
    <ArchiveDataContext.Provider value={value}>
      {children}
    </ArchiveDataContext.Provider>
  );
}
