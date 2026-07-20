import React, { useState } from 'react';
import { cn } from 'lib/utils';
import { useArchiveData } from 'context/ArchiveDataContext';
import { Textarea } from 'components/ui/textarea';
import { ScrollText, Loader2, ChevronRight, AlertTriangle, Sparkles, Music, Star, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';

// Context Drop — dictate a raw reflection (via Wispr Flow at the OS level), have
// Sonnet 4.6 structure it into Block A (chronicle, human-facing) and Block B
// (auspex_reading, machine-facing, collapsed). Persisted through the direct,
// non-debounced handleContextDropSave.
export function ContextDrop({ book }) {
  const { bookProgress, handleContextDropSave } = useArchiveData();
  const saved = bookProgress[book.entryId] || {};
  const chronicle = saved.chronicle || null;
  const auspex = saved.auspexReading || null;
  const musicScenes = Array.isArray(saved.musicScenes) ? saved.musicScenes : [];
  const standoutMoments = Array.isArray(chronicle?.standout_moments)
    ? chronicle.standout_moments
    : chronicle?.standout_moment
      ? [chronicle.standout_moment]
      : [];
  const hasDrop = Boolean(chronicle);

  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [auspexOpen, setAuspexOpen] = useState(false);
  const [redrafting, setRedrafting] = useState(false);
  const [appending, setAppending] = useState(false);

  // Floating interview state: when structure() returns open_questions, the
  // result is held here UNSAVED and the modal opens. Completing saves it;
  // cancelling discards it — nothing is persisted until the reader completes.
  const [pending, setPending] = useState(null); // { data, mergedRaw } or null
  const [answers, setAnswers] = useState({});
  const [finishing, setFinishing] = useState(false);

  const structure = async (mode = 'new') => {
    if (!raw.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const isAppend = mode === 'append' && Boolean(chronicle);
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
          existing: isAppend ? { chronicle } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      // On append, preserve the full dictation history: prepend the prior raw.
      const priorRaw = saved.contextDropRaw || '';
      const mergedRaw = isAppend && priorRaw
        ? `${priorRaw}\n\n--- ADDITION ---\n\n${raw}`
        : raw;

      const questions = Array.isArray(data.open_questions) ? data.open_questions : [];
      if (questions.length > 0) {
        // Hold the result unsaved; open the modal to resolve questions first.
        setPending({ data, mergedRaw });
        setAnswers({});
      } else {
        // No questions: save immediately, as before.
        await handleContextDropSave(book.entryId, { ...data, raw: mergedRaw });
        setRaw('');
        setRedrafting(false);
        setAppending(false);
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  // Complete the interview: save the held result. In this commit answers are
  // not yet woven in (that is commit 4) — completing saves the pending result
  // as-is, with open_questions cleared.
  const finishInterview = async () => {
    if (!pending || finishing) return;
    setFinishing(true);
    setError(null);
    try {
      const questions = Array.isArray(pending.data.open_questions)
        ? pending.data.open_questions
        : [];
      // Collect only answered questions (non-empty answer field).
      const answered = questions
        .map((q, i) => ({ ...q, answer: (answers[i] || '').trim() }))
        .filter((q) => q.answer.length > 0);

      let result = pending.data;
      if (answered.length > 0) {
        // Second call: weave the answers into the held Chronicle.
        const res = await fetch('/api/context-drop', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            book: {
              title: book.title,
              author: book.author,
              factionPrimary: book.factionPrimary,
              subFaction: book.subFaction,
            },
            existing: {
              chronicle: pending.data.chronicle,
              music_scenes: pending.data.music_scenes,
            },
            answers: answered,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `Request failed (${res.status})`);
        }
        result = data;

        // Deterministic preservation: the model reliably edits the resonance
        // prose (name substitution + deepening weave-in) but keeps dropping
        // standout_moments and verdict_line on the resolve call. So we do NOT
        // trust the model for those two structured fields — we take them from
        // the ORIGINAL chronicle and apply the same correction substitutions in
        // code. Corrections are verbatim string replaces; deepenings never
        // touch standouts/verdict. This guarantees the Standouts survive.
        const origChron = pending.data.chronicle || {};
        const applyCorrections = (text) => {
          if (typeof text !== 'string' || !text) return text;
          let out = text;
          for (const a of answered) {
            if (a.type === 'correction' && a.context && a.answer) {
              // Replace every occurrence of the flagged term with the answer.
              out = out.split(a.context).join(a.answer);
            }
          }
          return out;
        };
        const origStandouts = Array.isArray(origChron.standout_moments)
          ? origChron.standout_moments
          : origChron.standout_moment
            ? [origChron.standout_moment]
            : [];
        result = {
          ...result,
          chronicle: {
            ...result.chronicle,
            // resonance: keep the model's edited prose.
            // standouts + verdict: preserve from original, apply corrections.
            standout_moments: origStandouts.map(applyCorrections),
            verdict_line: applyCorrections(
              origChron.verdict_line ?? result.chronicle?.verdict_line ?? ''
            ),
          },
        };
      }

      await handleContextDropSave(book.entryId, {
        ...result,
        open_questions: [],
        raw: pending.mergedRaw,
      });
      setPending(null);
      setAnswers({});
      setRaw('');
      setRedrafting(false);
      setAppending(false);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setFinishing(false);
    }
  };

  // Cancel the interview: discard the held result entirely. Nothing is saved.
  const cancelInterview = () => {
    setPending(null);
    setAnswers({});
  };

  const questionsModal = (
    <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) cancelInterview(); }}>
      <DialogContent
        className="bg-slate-950 border-amber-500/40 max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-tactical text-sm tracking-[0.15em] text-amber-400/90">
            <HelpCircle className="w-4 h-4" />
            THE COGITATOR ASKS
          </DialogTitle>
        </DialogHeader>
        {pending && (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-400 font-data leading-relaxed">
              A few points before this Chronicle is committed. Answer what you like,
              leave the rest blank, then complete — or cancel to discard.
            </p>
            <ul className="space-y-3">
              {(Array.isArray(pending.data.open_questions) ? pending.data.open_questions : []).map((q, i) => (
                <li key={i} className="space-y-1.5">
                  <div className="flex gap-2">
                    {q.type === 'correction' ? (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400/70" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400/50" />
                    )}
                    <span className="text-sm text-slate-200 leading-relaxed font-data">
                      {q.question}
                    </span>
                  </div>
                  <Textarea
                    value={answers[i] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                    placeholder={
                      q.type === 'correction'
                        ? 'Correct it, or leave blank to keep as is…'
                        : 'Add a thought, or leave blank to skip…'
                    }
                    className={cn(
                      'min-h-[52px] font-data text-sm resize-none ml-5',
                      'bg-black/40 border-amber-500/20 focus:border-amber-500/50',
                      'placeholder:text-slate-600 text-slate-100'
                    )}
                  />
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={cancelInterview}
                disabled={finishing}
                className="text-[10px] font-tactical tracking-[0.2em] text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
              >
                ABBRECHEN
              </button>
              <button
                type="button"
                onClick={finishInterview}
                disabled={finishing}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold tracking-wider transition-all text-[11px]',
                  'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {finishing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> ABSCHLIESSEN…</>
                ) : (
                  'ABSCHLIESSEN'
                )}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Existing drop, not redrafting: show the chronicle + collapsed auspex.
  if (hasDrop && !redrafting && !appending) {
    return (
      <>
        {questionsModal}
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
            <div className="space-y-3">
              {String(chronicle.resonance)
                .split(/\n{2,}/)
                .map((para) => para.trim())
                .filter(Boolean)
                .map((para, i) => (
                  <p
                    key={i}
                    className="text-sm text-slate-300 leading-relaxed font-data"
                  >
                    {para}
                  </p>
                ))}
            </div>
          )}
        </div>

        {standoutMoments.length > 0 && (
          <div className="mt-5 rounded-md bg-gold/5 border border-gold/20 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <Star className="w-3.5 h-3.5 text-gold/70" />
              <h3 className="font-tactical text-[10px] tracking-[0.2em] text-gold/70">
                {standoutMoments.length > 1 ? 'STANDOUTS' : 'STANDOUT'}
              </h3>
            </div>
            <ul className="space-y-2">
              {standoutMoments.map((m, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-300 leading-relaxed font-data flex gap-2"
                >
                  <span className="text-gold/50 select-none">›</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {musicScenes.length > 0 && (
          <div className="mt-5 rounded-md bg-plasma/5 border border-plasma/20 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <Music className="w-3.5 h-3.5 text-plasma/70" />
              <h3 className="font-tactical text-[10px] tracking-[0.2em] text-plasma/70">
                RESONANT SCENES
              </h3>
            </div>
            <ul className="space-y-2.5">
              {musicScenes.map((s, i) => (
                <li key={i}>
                  <p className="text-sm text-slate-300 leading-relaxed font-data">
                    {s.scene}
                  </p>
                  {s.note && (
                    <p className="text-[12px] text-plasma/60 leading-relaxed font-data italic mt-0.5">
                      {s.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

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

        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setAppending(true)}
            className="text-[10px] font-tactical tracking-[0.2em] text-plasma/60 hover:text-plasma transition-colors"
          >
            + APPEND
          </button>
          <button
            type="button"
            onClick={() => setRedrafting(true)}
            className="text-[10px] font-tactical tracking-[0.2em] text-slate-500 hover:text-gold transition-colors"
          >
            RE-DRAFT
          </button>
        </div>
        </div>
      </>
    );
  }

  // No drop yet, redrafting, or appending: show the input.
  return (
    <>
      {questionsModal}
      <div className="mt-6 border-t border-gold/15 pt-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-gold/70" />
        <h2 className="font-tactical text-[11px] tracking-[0.2em] text-gold/70">
          CONTEXT DROP
        </h2>
      </div>
      <p className="text-[11px] text-slate-500 font-data mb-3 leading-relaxed">
        {appending
          ? 'Dictate what you want to add. The cogitator weaves it into your existing Chronicle, keeping what is already there.'
          : 'Dictate your raw reflection — unstructured, stream of thought. The cogitator distils it into your Chronicle.'}
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
          onClick={() => structure(appending ? 'append' : 'new')}
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
              {appending ? 'WEAVE IN' : 'STRUCTURE'}
            </>
          )}
        </button>
        {(redrafting || appending) && (
          <button
            type="button"
            onClick={() => {
              setRedrafting(false);
              setAppending(false);
              setError(null);
              setRaw('');
            }}
            className="text-[10px] font-tactical tracking-[0.2em] text-slate-500 hover:text-slate-300 transition-colors"
          >
            CANCEL
          </button>
        )}
      </div>
      </div>
    </>
  );
}

export default ContextDrop;
