import React from 'react';
import { cn } from 'lib/utils';
import { Shield, Swords, Bug, Skull } from 'lucide-react';

// Single source of truth for grand-alliance iconography + tint.
// Mirrors pages/Archive.jsx allianceFilters (icon + colour semantics) so
// list rows, the dossier header, and filters all read the same visual code.
const MARKS = {
  imperium:  { icon: Shield, tint: 'text-gold',        label: 'Imperium'  },
  chaos:     { icon: Swords, tint: 'text-purple-400',  label: 'Chaos'     },
  xenos:     { icon: Bug,    tint: 'text-plasma',      label: 'Xenos'     },
  unaligned: { icon: Skull,  tint: 'text-slate-400',   label: 'Unaligned' },
};

const SIZES = {
  sm: 'w-4 h-4',   // dense list rows (~18-24px box incl. padding)
  md: 'w-5 h-5',
  lg: 'w-6 h-6',   // dossier header, full silhouette
  xl: 'w-8 h-8',   // enlarged leading sigil in list rows
};

// grandAlliance is NOT NULL across the catalog, but guard anyway: an unknown
// value renders nothing rather than crashing.
export function FactionMark({ alliance, size = 'sm', className, title }) {
  const mark = MARKS[alliance];
  if (!mark) return null;
  const Icon = mark.icon;
  return (
    <Icon
      className={cn(SIZES[size] || SIZES.sm, mark.tint, 'shrink-0', className)}
      aria-label={title || mark.label}
    />
  );
}

// Human-readable alliance label from the same MARKS source. Returns '' for
// unknown/empty, so callers can conditionally render.
export function factionLabel(alliance) {
  return MARKS[alliance]?.label ?? '';
}

export default FactionMark;
