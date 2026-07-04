import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Layers, Archive, Cpu, Award } from 'lucide-react';

// TEMPORARY — step 5 calibration flag. true while dialling station/masthead
// positions via CalibHarness; C2 flips this to false and removes the harness.
const CALIB = true;

// Backdrop asset lives in frontend/public/ and is referenced from web root.
const BACKDROP_SRC = '/Imperial_void-ship_command_bridge_2K_202607041950.jpeg';

// Six-station bridge manifest (STATE.md, locked). Five navigable stations
// overlay the bridge art; the Command Cogitator is the parked centre hero
// (no route). Accent follows the locked colour-logic: plasma = hololith poles
// (Oculus, Strategium), gold = warm framing (Campaign, Service Record),
// auspex-green = working terminal (Auspex).
//
// pos = absolute placement over the backdrop, as % (top/left/width) via inline
// style. These are PLACEHOLDER coordinates for S1 — rough edge positions so the
// stage reads and every link is reachable. Exact per-station calibration is a
// later step; the Cogitator screen gets calibrated in S2. Do not treat these
// numbers as final.
const stations = [
  { id: 'oculus',     label: 'OCULUS',         sub: 'HOLOLITHIC VIEWER', to: '/map',        icon: Globe,   accent: 'text-plasma', pos: { top: 6,  left: 34, width: 32 } },
  { id: 'campaign',   label: 'CAMPAIGN',       sub: 'THE PLAN',          to: '/phases',     icon: Layers,  accent: 'text-gold',   pos: { top: 40, left: 4,  width: 22 } },
  { id: 'auspex',     label: 'AUSPEX',         sub: 'THE LIBRARY',       to: '/archive',    icon: Archive, accent: 'text-auspex', pos: { top: 68, left: 4,  width: 22 } },
  { id: 'strategium', label: 'STRATEGIUM',     sub: 'THE ADVISOR',       to: '/strategium', icon: Cpu,     accent: 'text-plasma', pos: { top: 40, left: 74, width: 22 } },
  { id: 'record',     label: 'SERVICE RECORD', sub: 'HONOURS VITRINE',   to: '/record',     icon: Award,   accent: 'text-gold',   pos: { top: 68, left: 74, width: 22 } },
];

// Masthead placeholder position (pre-calibration), same % shape as a station.
const DEFAULT_MASTHEAD_POS = { top: 1, left: 25, width: 50 };

export function Landing() {
  // TEMPORARY — shared calibration state (step 5). Seeded from the current
  // station pos / masthead default so CALIB-mode renders start identical to
  // the static layout, then drift as Tim drags the CalibHarness boxes.
  const [positions, setPositions] = React.useState(() => {
    const seeded = {};
    stations.forEach((s) => { seeded[s.id] = { ...s.pos }; });
    seeded.masthead = { ...DEFAULT_MASTHEAD_POS };
    return seeded;
  });

  const masthead = CALIB ? positions.masthead : DEFAULT_MASTHEAD_POS;

  return (
    <div className="relative min-h-screen bg-slate-950 scanlines safe-top safe-bottom overflow-hidden">
      {/* Stage — sized by the backdrop image itself (img-as-sizer). Absolute
          overlays resolve as % of THIS box, so they scale with the art and
          never drift off their painted feature on resize. */}
      <div className="relative w-full max-w-6xl mx-auto" data-bridge-stage>
        <img
          src={BACKDROP_SRC}
          alt=""
          aria-hidden="true"
          className="block w-full h-auto select-none pointer-events-none"
          data-bridge-backdrop
        />

        {/* Masthead — overlaid on the upper backdrop */}
        <header
          className="absolute text-center pt-4 pointer-events-none"
          style={{ top: `${masthead.top}%`, left: `${masthead.left}%`, width: `${masthead.width}%` }}
        >
          <h1 className="font-display text-2xl md:text-4xl text-gold tracking-wider text-glow-gold">
            THE INFINITY ARCHIVE
          </h1>
          <p className="text-[10px] md:text-[11px] text-slate-400 font-tactical tracking-[0.3em] mt-1">
            COMMAND BRIDGE — COGITATOR INTERFACE v.M41
          </p>
        </header>

        {/* Five navigable stations */}
        {stations.map((s) => (
          <StationBox key={s.id} station={s} pos={CALIB ? positions[s.id] : s.pos} />
        ))}

        {/* Command Cogitator screen — live text sits directly IN the painted
            black screen of the backdrop console. No panel, no frame, no icon:
            the backdrop already paints the brass gear-frame. Green phosphor
            on pure black = a real cogitator readout. NOT a Link (parked).
            Coordinates are CALIBRATION START VALUES — Tim dials them via the
            harness below, S2b bakes the final numbers and removes the harness. */}
        <div
          data-cogitator-screen
          className="absolute flex flex-col items-center justify-center text-center gap-1 text-auspex font-tactical text-glow-auspex pointer-events-none"
          style={{ top: '57.4%', left: '38.4%', width: '23.1%', height: '27.4%' }}
        >
          <p className="text-[10px] tracking-[0.3em] text-auspex/70">CURRENT ASSIGNMENT</p>
          <p className="text-sm md:text-base tracking-widest">STANDBY</p>
          <p className="text-[11px] tracking-widest text-auspex/80">NO SIGNAL</p>
        </div>

        {/* === TEMPORARY CALIBRATION HARNESS — removed in C2 === */}
        {CALIB && <CalibHarness positions={positions} setPositions={setPositions} />}
      </div>
    </div>
  );
}

function StationBox({ station, pos }) {
  const { label, sub, to, icon: Icon, accent } = station;
  return (
    <Link
      to={to}
      className="absolute grimdark-panel rounded-lg flex flex-col items-center justify-center text-center p-3 gap-1.5 transition-all hover:glow-gold"
      style={{ top: `${pos.top}%`, left: `${pos.left}%`, width: `${pos.width}%` }}
    >
      <Icon className={`w-6 h-6 ${accent}`} />
      <div>
        <h2 className={`font-display text-base tracking-wider ${accent}`}>{label}</h2>
        <p className="text-[9px] text-slate-500 font-tactical tracking-[0.25em] mt-0.5">{sub}</p>
      </div>
    </Link>
  );
}

// === TEMPORARY — CalibHarness (removed in C2) ===
// One drag/resize box per target (five stations + masthead), sharing the same
// `positions` state the real StationBox/masthead renders read from — so the
// actual elements visibly move as Tim drags, not just the calibration boxes.
// Drag the box body to move; drag the right-edge handle to resize width only
// (height is unused — stations and masthead are content-height). % is computed
// against the data-bridge-stage bounding box, matching how the real overlays
// resolve their own top/left/width.
const CALIB_TARGETS = ['oculus', 'campaign', 'auspex', 'strategium', 'record', 'masthead'];

function CalibHarness({ positions, setPositions }) {
  const drag = React.useRef(null);

  const pct = (e, stage) => {
    const r = stage.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const onDown = (id, mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const stage = e.currentTarget.closest('[data-bridge-stage]');
    const start = pct(e, stage);
    drag.current = { id, mode, start, box: { ...positions[id] }, stage };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const p = pct(e, d.stage);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    setPositions((prev) => ({
      ...prev,
      [d.id]:
        d.mode === 'move'
          ? { ...prev[d.id], left: +(d.box.left + dx).toFixed(1), top: +(d.box.top + dy).toFixed(1) }
          : { ...prev[d.id], width: +Math.max(2, d.box.width + dx).toFixed(1) },
    }));
  };
  const onUp = () => {
    drag.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  return (
    <>
      {CALIB_TARGETS.map((id) => {
        const box = positions[id];
        return (
          <div
            key={id}
            className="absolute border-2 border-fuchsia-500 bg-fuchsia-500/10 z-50 cursor-move"
            style={{ top: `${box.top}%`, left: `${box.left}%`, width: `${box.width}%` }}
            onMouseDown={onDown(id, 'move')}
          >
            <div className="absolute -top-6 left-0 whitespace-nowrap bg-fuchsia-600 text-white text-[11px] font-mono px-2 py-0.5">
              {id}: top {box.top.toFixed(1)} / left {box.left.toFixed(1)} / w {box.width.toFixed(1)}
            </div>
            <div
              className="absolute top-0 right-0 bottom-0 w-3 bg-fuchsia-500 cursor-ew-resize"
              onMouseDown={(e) => { e.stopPropagation(); onDown(id, 'resize')(e); }}
            />
          </div>
        );
      })}
    </>
  );
}
