import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useArchiveData } from 'context/ArchiveDataContext';

// Backdrop asset lives in frontend/public/ and is referenced from web root.
const BACKDROP_SRC = '/Imperial_void-ship_command_bridge_2K_202607041950.jpeg';

// Six-station bridge manifest (STATE.md, locked). Five navigable stations
// overlay the bridge art; the Command Cogitator is the parked centre hero
// (no route). Accent follows the locked colour-logic: plasma = hololith poles
// (Oculus, Strategium), gold = warm framing (Campaign, Service Record),
// auspex-green = working terminal (Auspex).
//
// pos = absolute placement over the backdrop, as % (top/left/width) via inline
// style, calibrated against the real Vercel deploy (step 5, C2). Baked, not
// placeholder — do not re-guess these without re-dialing against the deploy.
// img = station artwork (verified filenames, step 5 C3) filling the bento box;
// icon/sub are kept on the data object (not deleted) but no longer rendered —
// the artwork carries the identity now.
const stations = [
  { id: 'oculus',     label: 'OCULUS',         sub: 'HOLOLITHIC VIEWER', to: '/map',        icon: null, accent: 'text-plasma', pos: { top: 18,   left: 39,   width: 22.0 }, img: '/Oculus_hololith_galaxy_16x9_202607042230.jpeg' },
  { id: 'campaign',   label: 'CAMPAIGN',       sub: 'THE PLAN',          to: '/phases',     icon: null, accent: 'text-gold',   pos: { top: 40.0, left: 4.0,  width: 22.0 }, img: '/Chart-console_with_skull-beacon2K_202607041801.jpeg' },
  { id: 'auspex',     label: 'AUSPEX',         sub: 'THE LIBRARY',       to: '/archive',    icon: null, accent: 'text-auspex', pos: { top: 68.0, left: 4.0,  width: 22.0 }, img: '/Operator_console_with_sweep-scope_2K_202607041801.jpeg' },
  { id: 'strategium', label: 'STRATEGIUM',     sub: 'THE ADVISOR',       to: '/strategium', icon: null, accent: 'text-plasma', pos: { top: 40.0, left: 74.0, width: 22.0 }, img: '/War-table_projecting_battle-map_2K_202607041801.jpeg' },
  { id: 'record',     label: 'SERVICE RECORD', sub: 'HONOURS VITRINE',   to: '/record',     icon: null, accent: 'text-gold',   pos: { top: 68.0, left: 74.0, width: 22.0 }, img: '/Gilded_reliquary_vitrine_with_skull_202607041801.jpeg' },
];

export function Landing() {
  const { currentReading } = useArchiveData();
  const navigate = useNavigate();

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

        {/* Masthead — overlaid on the upper backdrop, calibrated (step 5, C2) */}
        <header
          className="absolute text-center pt-4 pointer-events-none"
          style={{ top: '3.8%', left: '25.9%', width: '50.0%' }}
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
          <StationBox key={s.id} station={s} pos={s.pos} />
        ))}

        {/* Command Cogitator screen — live text sits directly IN the painted
            black screen of the backdrop console. No panel, no frame, no icon:
            the backdrop already paints the brass gear-frame. Green phosphor
            on pure black = a real cogitator readout. NOT a Link (parked).
            Coordinates are calibrated and baked (top 57.4% / left 38.4% /
            w 23.1% / h 27.4%). */}
        <div
          data-cogitator-screen
          className="absolute flex flex-col items-center justify-center text-center gap-1 text-auspex font-tactical text-glow-auspex pointer-events-none"
          style={{ top: '57.4%', left: '38.4%', width: '23.1%', height: '27.4%' }}
        >
          {currentReading?.book ? (
            <button
              type="button"
              onClick={() => navigate(`/book/${currentReading.book.entryId}`)}
              className="pointer-events-auto cursor-pointer flex flex-col items-center gap-1 bg-transparent border-0 p-0 text-auspex hover:text-auspex/100 transition-opacity"
            >
              <p className="text-[10px] tracking-[0.3em] text-auspex/70">CURRENT ASSIGNMENT</p>
              <p className="text-sm md:text-base tracking-widest leading-tight line-clamp-2">
                {currentReading.book.title}
              </p>
              {currentReading.book.parentTitle && (
                <p className="text-[11px] tracking-widest text-auspex/80">
                  {currentReading.book.parentTitle}
                </p>
              )}
              <p className="text-[11px] tracking-[0.3em] text-auspex/80 mt-0.5">
                PHASE {currentReading.phase.id}
              </p>
            </button>
          ) : (
            <>
              <p className="text-[10px] tracking-[0.3em] text-auspex/70">CURRENT ASSIGNMENT</p>
              <p className="text-sm md:text-base tracking-widest">STANDBY</p>
              <p className="text-[11px] tracking-widest text-auspex/80">NO SIGNAL</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StationBox({ station, pos }) {
  const { id, label, to, img, aspect } = station;
  // Explicit fallback, not a template-string class — Tailwind JIT only picks
  // up class names it can see written out in full in the source.
  const aspectClass = aspect === '4/5' ? 'aspect-[4/5]' : 'aspect-[3/2]';
  return (
    <Link
      to={to}
      className={`absolute ${aspectClass} grimdark-panel rounded-lg overflow-hidden transition-all hover:glow-gold`}
      style={{ top: `${pos.top}%`, left: `${pos.left}%`, width: `${pos.width}%` }}
    >
      <img
        src={img}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
      />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
      <div className="relative z-10 flex h-full flex-col justify-end items-center text-center px-2 pb-2 gap-0.5">
        {id === 'oculus' && (
          <div
            data-oculus-segmentum
            className="relative z-10 text-plasma text-glow-plasma font-tactical text-[10px] md:text-xs tracking-[0.25em] text-center"
          >
            SEGMENTUM SOLAR
          </div>
        )}
        <h2 className="font-display text-sm md:text-base tracking-wider text-gold text-glow-gold">{label}</h2>
      </div>
    </Link>
  );
}
