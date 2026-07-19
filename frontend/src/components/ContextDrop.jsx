import React, { useState } from 'react';
import { cn } from 'lib/utils';
import { useArchiveData } from 'context/ArchiveDataContext';
import { Textarea } from 'components/ui/textarea';
import { ScrollText, Loader2, ChevronRight, AlertTriangle, Sparkles } from 'lucide-react';

// Context Drop — dictate a raw reflection (via Wispr Flow at the OS level), have
// Sonnet 4.6 structure it into Block A (chronicle, human-facing) and Block B
// (auspex_reading, machine-facing, collapsed). Persisted through the direct,
// non-debounced handleContextDropSave.
export function ContextDrop({ book }) {
  const { bookProgress, handleContextDropSave } = useArchiveData();
  const saved = bookProgress[book.entryId] || {};
  const chronicle = saved.chronicle || null;
  const auspex = saved.auspexReading || null;
  const hasDrop = Boolean(chronicle);

  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [auspexOpen, setAuspexOpen] = useState(false);
  const [redrafting, setRedrafting] = useState(false);

  const structure = async () => {
    if (!raw.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/context-drop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          raw,
          book: {
            title: book.title,
            author: book.author,
            factionPrimary: book.factionPrimary,
            subFaction: book.subFaction,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      await handleContextDropSave(book.entryId, { ...data, raw });
      setRaw('');
      setRedrafting(false);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  // Existing drop, not redrafting: show the chronicle + collapsed auspex.
  if (hasDrop && !redrafting) {
    return (
      <div className="mt-6 border-t border-gold/15 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <ScrollText className="w-3.5 h-3.5 text-gold/70" />
          <h2 className="font-tactical text-[11px] tracking-[0.2em] text-gold/70">
            THE CHRONICLE
          </h2>
        </div>

        <div className="space-y-3">
          {chronicle.verdict_line && (
            <p className="font-display text-lg text-gold/90 leading-snug text-glow-gold">
              {chronicle.verdict_line}
            </p>
          )}
          {chronicle.resonance && (
            <p className="text-sm text-slate-300 leading-relaxed font-data">
              {chronicle.resonance}
            </p>
          )}
          {chronicle.standout_moment && (
            <div>
              <p className="text-[10px] font-tactical tracking-[0.2em] text-slate-500 mb-1">
                STANDOUT
              </p>
              <p className="text-sm text-slate-400 leading-relaxed font-data italic">
                {chronicle.standout_moment}
              </p>
            </div>
          )}
        </div>

        {auspex && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setAuspexOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 text-[10px] font-tactical tracking-[0.2em] text-plasma/60 hover:text-plasma transition-colors"
            >
              <ChevronRight
                className={cn('w-3 h-3 transition-transform', auspexOpen && 'rotate-90')}
              />
              AUSPEX READING
            </button>
            {auspexOpen && (
              <div className="mt-3 rounded-md bg-black/40 border border-plasma/20 p-3 space-y-2">
                {Array.isArray(auspex.emotional_register) && auspex.emotional_register.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {auspex.emotional_register.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] px-2 py-0.5 bg-plasma/15 text-plasma/90 rounded border border-plasma/30 font-tactical tracking-wider"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] font-data">
                  {typeof auspex.intensity === 'number' && (
                    <>
                      <dt className="text-slate-500">Intensity</dt>
                      <dd className="text-slate-300">{auspex.intensity} / 5</dd>
                    </>
                  )}
                  {auspex.appetite_direction && (
                    <>
                      <dt className="text-slate-500">Appetite</dt>
                      <dd className="text-slate-300">{auspex.appetite_direction}</dd>
                    </>
                  )}
                  {auspex.fatigue_signals && (
                    <>
                      <dt className="text-slate-500">Fatigue</dt>
                      <dd className="text-slate-300">{auspex.fatigue_signals}</dd>
                    </>
                  )}
                  {auspex.faction_resonance && (
                    <>
                      <dt className="text-slate-500">Factions</dt>
                      <dd className="text-slate-300">{auspex.faction_resonance}</dd>
                    </>
                  )}
                  {auspex.thematic_hooks && (
                    <>
                      <dt className="text-slate-500">Hooks</dt>
                      <dd className="text-slate-300">{auspex.thematic_hooks}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setRedrafting(true)}
          className="mt-4 text-[10px] font-tactical tracking-[0.2em] text-slate-500 hover:text-gold transition-colors"
        >
          RE-DRAFT
        </button>
      </div>
    );
  }

  // No drop yet, or redrafting: show the input.
  return (
    <div className="mt-6 border-t border-gold/15 pt-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-gold/70" />
        <h2 className="font-tactical text-[11px] tracking-[0.2em] text-gold/70">
          CONTEXT DROP
        </h2>
      </div>
      <p className="text-[11px] text-slate-500 font-data mb-3 leading-relaxed">
        Dictate your raw reflection — unstructured, stream of thought. The
        cogitator distils it into your Chronicle.
      </p>
      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Speak freely — what this book did to you, what stayed, what you want next…"
        disabled={busy}
        className={cn(
          'min-h-[120px] font-data text-sm resize-none',
          'bg-black/50 border-gold/20 focus:border-gold/50',
          'placeholder:text-slate-600 text-slate-100'
        )}
      />
      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive font-data">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={structure}
          disabled={!raw.trim() || busy}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold tracking-wider transition-all',
            raw.trim() && !busy
              ? 'bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25'
              : 'bg-slate-800/40 text-slate-600 border border-slate-700 cursor-not-allowed'
          )}
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              STRUCTURING…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              STRUCTURE
            </>
          )}
        </button>
        {redrafting && (
          <button
            type="button"
            onClick={() => { setRedrafting(false); setError(null); setRaw(''); }}
            className="text-[10px] font-tactical tracking-[0.2em] text-slate-500 hover:text-slate-300 transition-colors"
          >
            CANCEL
          </button>
        )}
      </div>
    </div>
  );
}

export default ContextDrop;
