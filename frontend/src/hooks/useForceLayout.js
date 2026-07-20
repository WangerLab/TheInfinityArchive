import { useEffect, useRef, useState } from 'react';
import { forceSimulation, forceCollide, forceX, forceY } from 'd3-force';

const COLLIDE_PADDING = 4;
// Single dial between "fixed slots" and "gas waft", set once in code -- not a
// user setting (spec §4/§7). Mid-firm: nodes read as recognisable slots but
// yield when a neighbour is displaced (expansion, collision).
const ANCHOR_STRENGTH = 0.12;

// Desktop runs forever at this held alpha (never decays -- see below) so the
// anchor/collide forces stay gently active instead of settling to a stop.
// Low relative to d3's normal starting alpha (1) so the anchor pull stays
// soft enough for the jitter force to actually show as motion, not get
// overpowered back to dead-center every tick.
const AMBIENT_ALPHA = 0.06;
// Per-tick random velocity nudge -- the "thermal noise" that keeps desktop
// nodes gently wobbling around their anchor forever, like molecules in a
// bounded volume, instead of a physics demo that visibly settles once.
const JITTER_STRENGTH = 0.35;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Coarse-pointer devices (phones, most tablets) get the old settle-then-stop
// behavior instead of perpetual jitter (spec §4: "freeze after settle on
// mobile") -- continuous ticking has a real battery/perf cost worth avoiding
// on that class of device, and the spec explicitly carves it out.
function isCoarsePointer() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toPositionMap(nodes) {
  const map = {};
  for (const n of nodes) map[n.key] = { x: n.x, y: n.y, r: n.r };
  return map;
}

// Runs a live d3-force simulation over `nodes` (each { key, x, y, r, boxKey },
// x/y being the rest-anchor position in canvas coordinates) and clamps every
// node to its own alliance box's rectangle on every tick (spec §4:
// "per-tick bounding-box clamp"). forceCollide keeps nodes from overlapping;
// anchored forceX/forceY pull each node back to its rest slot.
//
// On desktop this runs FOREVER at a low held alpha (alphaDecay(0) means d3
// never decays it, so the sim never crosses alphaMin and never auto-stops)
// plus a small per-tick jitter force -- a continuous gentle wobble around
// each anchor, not a settle-once physics demo. On coarse-pointer (mobile)
// devices and under prefers-reduced-motion, the sim behaves like a one-shot
// settle: default alpha decay (or skipped entirely for reduced-motion,
// snapping straight to the anchor position).
export function useForceLayout(nodes, boxesByKey) {
  const [positions, setPositions] = useState(() => toPositionMap(nodes));
  const simRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!nodes || nodes.length === 0) {
      setPositions({});
      return undefined;
    }

    if (prefersReducedMotion()) {
      setPositions(toPositionMap(nodes));
      return undefined;
    }

    const ambient = !isCoarsePointer();
    const simNodes = nodes.map((n) => ({ ...n, x0: n.x, y0: n.y }));

    const sim = forceSimulation(simNodes)
      .force('collide', forceCollide((d) => d.r + COLLIDE_PADDING))
      .force('x', forceX((d) => d.x0).strength(ANCHOR_STRENGTH))
      .force('y', forceY((d) => d.y0).strength(ANCHOR_STRENGTH));

    if (ambient) {
      sim.alphaDecay(0).alpha(AMBIENT_ALPHA);
    }

    let rafScheduled = false;
    const flush = () => {
      rafScheduled = false;
      setPositions(toPositionMap(simNodes));
    };

    sim.on('tick', () => {
      for (const n of simNodes) {
        if (ambient) {
          n.vx += (Math.random() - 0.5) * JITTER_STRENGTH;
          n.vy += (Math.random() - 0.5) * JITTER_STRENGTH;
        }
        const box = boxesByKey[n.boxKey];
        if (!box) continue;
        n.x = clamp(n.x, box.left + n.r, box.left + box.width - n.r);
        n.y = clamp(n.y, box.top + n.r, box.top + box.height - n.r);
      }
      if (!rafScheduled) {
        rafScheduled = true;
        rafRef.current = requestAnimationFrame(flush);
      }
    });

    simRef.current = sim;
    return () => {
      sim.stop();
      simRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [nodes, boxesByKey]);

  return positions;
}

export default useForceLayout;
