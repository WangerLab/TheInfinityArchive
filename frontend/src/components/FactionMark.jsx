import React, { useState } from 'react';
import { cn } from 'lib/utils';
import { Skull } from 'lucide-react';

// Single source of truth for grand-alliance iconography + tint. Three of the
// four alliances render as a tinted white-silhouette PNG mask (same technique
// as FactionSigil); `unaligned` stays a lucide glyph. Tint semantics are shared
// so list rows, the dossier header, and filters all read the same visual code.
//
// Asset-backed alliances map to a PNG in public/sigils/; the mask reveals a
// bg-<tint> fill. lucide-backed alliances render the glyph directly.
const MARKS = {
  imperium:  { asset: 'imperium',      bgTint: 'bg-gold',       textTint: 'text-gold',       label: 'Imperium'  },
  chaos:     { asset: 'chaos_generic', bgTint: 'bg-purple-400', textTint: 'text-purple-400', label: 'Chaos'     },
  xenos:     { asset: 'xenos',         bgTint: 'bg-plasma',     textTint: 'text-plasma',     label: 'Xenos'     },
  unaligned: { icon: Skull,            bgTint: 'bg-slate-400',  textTint: 'text-slate-400',  label: 'Unaligned' },
};

const SIZES = {
  sm: 'w-4 h-4',   // dense list rows
  md: 'w-5 h-5',
  lg: 'w-6 h-6',   // dossier header, full silhouette
  xl: 'w-8 h-8',   // enlarged leading sigil in list rows
  xxl: 'w-10 h-10', // 40px hero sigil in phase book rows
};

// public/ assets aren't fingerprinted — bump when any alliance PNG is replaced
// so browser/CDN cache keys change. Kept in sync with FactionSigil.ASSET_VERSION.
const ASSET_VERSION = 2;

// grandAlliance is NOT NULL across the catalog, but guard anyway: an unknown
// value renders nothing rather than crashing.
export function FactionMark({ alliance, size = 'sm', sizePx, className, title }) {
  const [failed, setFailed] = useState(false);
  const mark = MARKS[alliance];
  if (!mark) return null;

  // sizePx is an escape hatch for a runtime-computed size (a Tailwind
  // arbitrary class can't see a value that only exists at render time) --
  // sets the box via inline style instead and skips the token class.
  const box = sizePx ? undefined : (SIZES[size] || SIZES.sm);
  const sizeStyle = sizePx ? { width: sizePx, height: sizePx } : undefined;

  // lucide-backed (unaligned) or asset failed to load: render the glyph.
  if (mark.icon || (mark.asset && failed)) {
    const Icon = mark.icon || Skull;
    return (
      <Icon
        className={cn(box, mark.textTint, 'shrink-0', className)}
        style={sizeStyle}
        aria-label={title || mark.label}
      />
    );
  }

  // Asset-backed: tinted silhouette via CSS mask (mirrors FactionSigil).
  const url = `/sigils/${mark.asset}.png?v=${ASSET_VERSION}`;
  return (
    <>
      <span
        role="img"
        aria-label={title || mark.label}
        className={cn(box, mark.bgTint, 'shrink-0 inline-block', className)}
        style={{
          ...sizeStyle,
          WebkitMaskImage: `url(${url})`,
          maskImage: `url(${url})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className="hidden"
        onError={() => setFailed(true)}
      />
    </>
  );
}

// Human-readable alliance label from the same MARKS source. Returns '' for
// unknown/empty, so callers can conditionally render.
export function factionLabel(alliance) {
  return MARKS[alliance]?.label ?? '';
}

export default FactionMark;
