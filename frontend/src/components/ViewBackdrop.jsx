import React from 'react';

// ViewBackdrop — per-view station backdrop shell.
// Locked test-values from the ViewBackdrop design spec (2026-07-07):
// minimal blur + 30% overlay. Single source of truth — tune here.
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
        style={{ zIndex: -10 }}
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
      {children}
    </div>
  );
}
