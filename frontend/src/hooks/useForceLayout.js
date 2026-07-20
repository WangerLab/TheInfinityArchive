import { useEffect, useRef, useState } from 'react';
import { forceSimulation, forceCollide, forceX, forceY } from 'd3-force';

const COLLIDE_PADDING = 4;
// Single dial between "fixed slots" and "gas waft", set once in code -- not a
// user setting (spec §4/§7). Mid-firm: nodes read as recognisable slots but
// yield when a neighbour is displaced (expansion, collision).
const ANCHOR_STRENGTH = 0.12;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
// anchored forceX/forceY pull each node back to its rest slot -- a real
// runtime simulation, not a static SVG (spec §4), that settles and stops on
// its own via d3's default alpha decay (no manual freeze needed for that).
//
// prefers-reduced-motion skips the simulation entirely: nodes render at their
// anchor position directly, snapped, no animation (spec §7).
export function useForceLayout(nodes, boxesByKey) {
  const [positions, setPositions] = useState(() => toPositionMap(nodes));
  const simRef = useRef(null);

  useEffect(() => {
    if (!nodes || nodes.length === 0) {
      setPositions({});
      return undefined;
    }

    if (prefersReducedMotion()) {
      setPositions(toPositionMap(nodes));
      return undefined;
    }

    const simNodes = nodes.map((n) => ({ ...n, x0: n.x, y0: n.y }));

    const sim = forceSimulation(simNodes)
      .force('collide', forceCollide((d) => d.r + COLLIDE_PADDING))
      .force('x', forceX((d) => d.x0).strength(ANCHOR_STRENGTH))
      .force('y', forceY((d) => d.y0).strength(ANCHOR_STRENGTH))
      .on('tick', () => {
        for (const n of simNodes) {
          const box = boxesByKey[n.boxKey];
          if (!box) continue;
          n.x = clamp(n.x, box.left + n.r, box.left + box.width - n.r);
          n.y = clamp(n.y, box.top + n.r, box.top + box.height - n.r);
        }
        setPositions(toPositionMap(simNodes));
      });

    simRef.current = sim;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [nodes, boxesByKey]);

  return positions;
}

export default useForceLayout;
