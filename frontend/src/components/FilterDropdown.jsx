import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from 'lib/utils';
import { ChevronDown, X } from 'lucide-react';

// Multi-select filter dropdown. Generic over what it filters: the caller passes
// options and owns the selection state.
//
// options: [{ value, label, count, group?, leading? }]
//   value   — stable key, also what onToggle reports back
//   count   — entries behind this option, shown right-aligned
//   group   — optional; options carrying one are printed under a group header
//   leading — optional node rendered before the label (a sigil, an icon)
//
// Selection is OR within a dropdown: picking two factions widens the result.
// AND across dropdowns is the caller's business — this component neither knows
// nor cares about the other filters.
//
// No Radix: components/ui has no Select or Popover primitive and three filters
// do not justify pulling one in. Close-on-outside-click is a pointerdown
// listener on document, registered only while open.

export function FilterDropdown({ label, options, selected, onToggle, onClear, className }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Close when a pointer goes down anywhere outside this dropdown. Bound only
  // while open, so a closed dropdown costs nothing.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Preserve the caller's option order; collect groups in first-seen order.
  const groups = useMemo(() => {
    const out = [];
    const index = new Map();
    options.forEach((opt) => {
      const key = opt.group ?? '';
      if (!index.has(key)) {
        index.set(key, out.length);
        out.push({ key, items: [] });
      }
      out[index.get(key)].items.push(opt);
    });
    return out;
  }, [options]);

  const count = selected.length;
  const isActive = count > 0;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'touch-target flex items-center gap-2 px-3 py-1.5 rounded-md',
          'border transition-all duration-200 active:scale-95',
          'text-[10px] font-tactical tracking-[0.15em]',
          isActive
            ? 'bg-[var(--acc)]/20 text-[var(--acc)] border-[var(--acc)]'
            : 'bg-slate-900/40 text-slate-400 border-slate-600/60 hover:text-slate-200 hover:border-slate-500'
        )}
      >
        <span>{label}</span>
        {isActive && (
          <span className="font-data text-[10px] px-1 rounded bg-[var(--acc)]/30">
            {count}
          </span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 top-full mt-1.5 z-50 w-64 max-h-80 overflow-y-auto',
            'grimdark-panel rounded-lg p-1.5'
          )}
        >
          {isActive && (
            <button
              type="button"
              onClick={onClear}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 mb-1 rounded
                         text-[10px] font-tactical tracking-[0.1em]
                         text-slate-400 hover:text-slate-100 hover:bg-slate-700/40"
            >
              <X className="w-3 h-3" />
              <span>CLEAR</span>
            </button>
          )}

          {groups.map((group) => (
            <div key={group.key}>
              {group.key && (
                <div className="px-2 pt-2 pb-1 text-[9px] font-tactical tracking-[0.2em] text-slate-500">
                  {group.key.toUpperCase()}
                </div>
              )}
              {group.items.map((opt) => {
                const isSelected = selected.includes(opt.value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => onToggle(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left',
                      'transition-colors duration-150',
                      isSelected
                        ? 'bg-[var(--acc)]/20 text-[var(--acc)]'
                        : 'text-slate-300 hover:bg-slate-700/40 hover:text-slate-100'
                    )}
                  >
                    <span
                      className={cn(
                        'w-3 h-3 shrink-0 rounded-sm border',
                        isSelected
                          ? 'bg-[var(--acc)] border-[var(--acc)]'
                          : 'border-slate-600'
                      )}
                    />
                    {opt.leading}
                    <span className="text-xs truncate flex-1">{opt.label}</span>
                    <span className="text-[10px] font-data text-slate-500 shrink-0">
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FilterDropdown;
