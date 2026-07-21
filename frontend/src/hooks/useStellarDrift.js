import { useEffect, useRef, useState } from 'react';

// Replaces the old useForceLayout d3-force simulation entirely -- not a
// rewrite, a different mechanism, sharing zero logic with it. That hook
// existed to resolve collisions a search-based packer couldn't guarantee up
// front; layoutConstellations (strategiumLayout.js) now proves every node's
// footprint has real slack beyond its neighbours' BEFORE this hook ever
// runs, so there is nothing left to resolve at runtime -- only a small,
// bounded, deterministic wobble to spend out of that already-proven slack.
//
// A collide force is deliberately NOT used here: it actively pushes nodes
// AWAY from their anchors once they get close, which would deform every
// curated constellation shape the moment two stars approached each other --
// the opposite of what curated placement exists for. Overlap stays
// impossible by construction because |dx| and |dy| never exceed
// `amplitude`, and layoutConstellations already reserves 2*amplitude of
// clearance on every axis for exactly this.

const FRAME_MS = 33; // ~30fps; a few px of drift needs no more, halves setState churn
const PERIOD_X_MS = 15000;
const PERIOD_Y_MS = 21500; // deliberately NOT a multiple of PERIOD_X -- x/y never re-sync
const TAU = Math.PI * 2;

// Deterministic per-node phase from a hash of the faction key + an axis
// salt -- no Math.random(), stable across renders/resizes, so a resize
// never makes a star's wobble visibly jump or restart out of sync.
function fnv1aUnit(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296; // [0, 1)
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Coarse-pointer devices (phones, most tablets) freeze at rest positions --
// stronger than the old hook's "settle then stop" (a compromise, since its
// anchors were only a STARTING point needing collide resolution). Here the
// anchors already ARE the finished layout, so freezing is lossless.
function isCoarsePointer() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

function toPositionMap(anchors) {
  const map = {};
  for (const a of anchors) map[a.key] = { x: a.x, y: a.y, r: a.r };
  return map;
}

// `anchors`: [{ key, x, y, r }] in global canvas pixels (layout rest
// positions). Returns { [key]: { x, y, r } } -- byte-identical shape to the
// old useForceLayout, so resolvedVectors/renderNode need no changes.
export function useStellarDrift(anchors, amplitude) {
  const [positions, setPositions] = useState(() => toPositionMap(anchors));
  const rafRef = useRef(null);

  useEffect(() => {
    if (!anchors || anchors.length === 0) {
      setPositions({});
      return undefined;
    }

    if (prefersReducedMotion() || isCoarsePointer()) {
      setPositions(toPositionMap(anchors));
      return undefined;
    }

    const phases = anchors.map((a) => ({
      key: a.key,
      x: a.x,
      y: a.y,
      r: a.r,
      px: fnv1aUnit(`${a.key}|x`) * TAU,
      py: fnv1aUnit(`${a.key}|y`) * TAU,
    }));

    const start = performance.now();
    let lastFlush = 0;

    const tick = (now) => {
      if (now - lastFlush >= FRAME_MS) {
        lastFlush = now;
        const t = now - start;
        const map = {};
        for (const p of phases) {
          map[p.key] = {
            x: p.x + amplitude * Math.sin((TAU * t) / PERIOD_X_MS + p.px),
            y: p.y + amplitude * Math.cos((TAU * t) / PERIOD_Y_MS + p.py),
            r: p.r,
          };
        }
        setPositions(map);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [anchors, amplitude]);

  return positions;
}

export default useStellarDrift;
