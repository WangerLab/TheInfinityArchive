import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Layers, Archive, Cpu, Award, Terminal } from 'lucide-react';

// Six-station bridge manifest (locked in STATE.md). Five navigable stations
// overlay the bridge; the Command Cogitator is the parked centre hero (no
// route — book-detail unspecced). Accent follows the locked colour-logic:
// plasma = the two hololith poles (Oculus, Strategium), gold = warm framing
// (Campaign, Service Record), auspex-green = working terminal (Auspex).
// Grid placement is explicit per station, so map order is irrelevant.
const stations = [
  { id: 'oculus',     label: 'OCULUS',         sub: 'HOLOLITHIC VIEWER', to: '/map',        icon: Globe,   accent: 'text-plasma', pos: 'col-start-1 col-span-3 row-start-1' },
  { id: 'campaign',   label: 'CAMPAIGN',       sub: 'THE PLAN',          to: '/phases',     icon: Layers,  accent: 'text-gold',   pos: 'col-start-1 row-start-2' },
  { id: 'auspex',     label: 'AUSPEX',         sub: 'THE LIBRARY',       to: '/archive',    icon: Archive, accent: 'text-auspex', pos: 'col-start-1 row-start-3' },
  { id: 'strategium', label: 'STRATEGIUM',     sub: 'THE ADVISOR',       to: '/strategium', icon: Cpu,     accent: 'text-plasma', pos: 'col-start-3 row-start-2' },
  { id: 'record',     label: 'SERVICE RECORD', sub: 'HONOURS VITRINE',   to: '/record',     icon: Award,   accent: 'text-gold',   pos: 'col-start-3 row-start-3' },
];

export function Landing() {
  return (
    <div className="relative min-h-screen bg-slate-950 scanlines safe-top safe-bottom overflow-hidden">
      {/* Backdrop layer — skeleton placeholder. Skin pass drops bridge-backdrop.png here (absolute inset-0, behind content). */}
      <div
        className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/40 via-slate-950 to-black"
        data-bridge-backdrop
        aria-hidden="true"
      />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col min-h-screen px-6 py-6">
        {/* Masthead */}
        <header className="text-center mb-6">
          <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider text-glow-gold">
            THE INFINITY ARCHIVE
          </h1>
          <p className="text-[11px] text-slate-500 font-tactical tracking-[0.3em] mt-1">
            COMMAND BRIDGE — COGITATOR INTERFACE v.M41
          </p>
        </header>

        {/* Bridge grid: Oculus top (full width); Campaign/Auspex left column;
            Command Cogitator centre hero (parked); Strategium/Service Record right column. */}
        <div className="flex-1 grid grid-cols-3 grid-rows-[auto_1fr_1fr] gap-4 max-w-6xl w-full mx-auto">
          {stations.map((s) => (
            <StationBox key={s.id} station={s} />
          ))}

          {/* Command Cogitator — parked centre hero. NOT a Link. */}
          <div className="col-start-2 row-start-2 row-span-2 grimdark-panel rounded-lg flex flex-col items-center justify-center text-center p-6 gap-3">
            <Terminal className="w-8 h-8 text-gold" />
            <div>
              <h2 className="font-display text-xl text-gold tracking-wider">COMMAND COGITATOR</h2>
              <p className="text-[10px] text-slate-500 font-tactical tracking-[0.25em] mt-1">
                CURRENT ASSIGNMENT
              </p>
            </div>
            {/* Screen-zone marker — step 4 maps this to the backdrop console nische
                for live text (current book / % / folio). Do not remove the data attr. */}
            <div
              data-cogitator-screen
              className="mt-2 w-full max-w-[16rem] border border-gold/20 rounded px-3 py-4 text-[11px] text-slate-500 font-tactical tracking-widest"
            >
              STANDBY — NO SIGNAL
            </div>
          </div>
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
      className={`${pos} grimdark-panel rounded-lg flex flex-col items-center justify-center text-center p-5 gap-2 transition-all hover:glow-gold`}
    >
      <Icon className={`w-7 h-7 ${accent}`} />
      <div>
        <h2 className={`font-display text-lg tracking-wider ${accent}`}>{label}</h2>
        <p className="text-[10px] text-slate-500 font-tactical tracking-[0.25em] mt-1">{sub}</p>
      </div>
    </Link>
  );
}
