import React from 'react';

// ViewBackdrop — per-view station backdrop shell.
// Locked test-values from the ViewBackdrop design spec (2026-07-07):
// minimal blur + 30% overlay. Single source of truth — tune here.
//
// The art layer sits at z-index 0, NOT at a negative value: body carries an
// opaque background-color plus a fixed noise/grunge layer, and a negative
// z-index would push the art behind it — visible only where a .grimdark-panel
// spawns its own stacking context via backdrop-filter. Content rides above the
// art on z-index 10.
const BACKDROP_BLUR = '2px';
const OVERLAY_OPACITY = 0.3;

export function ViewBackdrop({ art, accent = 'gold', children }) {
  return (
    <div
      className="relative min-h-screen safe-bottom scanlines"
      style={{
        '--acc': `hsl(var(--${accent}))`,
        '--glow': `hsl(var(--${accent}) / 0.5)`,
      }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("${art}")`,
            filter: `blur(${BACKDROP_BLUR})`,
            transform: 'scale(1.04)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `hsl(var(--void) / ${OVERLAY_OPACITY})` }}
        />
      </div>
      <div className="relative" style={{ zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}
