import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Layers, Archive, Cpu, Award } from 'lucide-react';

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

export function Landing() {
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
        <header className="absolute top-0 left-0 right-0 text-center pt-4 pointer-events-none">
          <h1 className="font-display text-2xl md:text-4xl text-gold tracking-wider text-glow-gold">
            THE INFINITY ARCHIVE
          </h1>
          <p className="text-[10px] md:text-[11px] text-slate-400 font-tactical tracking-[0.3em] mt-1">
            COMMAND BRIDGE — COGITATOR INTERFACE v.M41
          </p>
        </header>

        {/* Five navigable stations */}
        {stations.map((s) => (
          <StationBox key={s.id} station={s} />
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
      </div>
    </div>
  );
}

function StationBox({ station }) {
  const { label, sub, to, icon: Icon, accent, pos } = station;
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
