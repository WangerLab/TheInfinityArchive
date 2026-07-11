import React, { useState } from 'react';
import { cn } from 'lib/utils';
import { FactionMark } from './FactionMark';

// Per-faction sigil: a white silhouette PNG (public/sigils/<sigil>.png) tinted
// to its grand-alliance colour via a CSS mask, so the SHAPE reads "which
// faction" (the POV-bearer, faction_sigil) while the TINT echoes FactionMark's
// alliance semantics (grandAlliance, NOT NULL). Falls back to the alliance-level
// FactionMark when no sigil is mapped (faction_sigil NULL) or the asset 404s.

// Alliance -> background-colour class the mask reveals. Mirrors FactionMark's
// four tints, expressed as bg-* against the same palette tokens as its text-*.
const TINT_BG = {
  imperium:  'bg-gold',
  chaos:     'bg-purple-400',
  xenos:     'bg-plasma',
  unaligned: 'bg-slate-400',
};

// Box sizes mirror FactionMark.SIZES so sigil and fallback share a footprint.
const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

export function FactionSigil({ sigil, alliance, size = 'sm', className, title }) {
  const [failed, setFailed] = useState(false);

  // No mapped sigil, or the asset failed to load: degrade to the alliance mark.
  if (!sigil || failed) {
    return (
      <FactionMark alliance={alliance} size={size} className={className} title={title} />
    );
  }

  const url = `/sigils/${sigil}.png`;
  const box = SIZES[size] || SIZES.sm;
  const tint = TINT_BG[alliance] || TINT_BG.unaligned;

  return (
    <>
      {/* Tinted silhouette: the bg colour shows through the PNG's alpha mask. */}
      <span
        role="img"
        aria-label={title || alliance || sigil}
        className={cn(box, tint, 'shrink-0 inline-block', className)}
        style={{
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
      {/* Invisible load-probe: the only reliable onError signal for a mask URL.
          Same URL as the mask, so the browser fetches it once. */}
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

export default FactionSigil;
