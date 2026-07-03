import React from 'react';
import { Link } from 'react-router-dom';
import { Library, ChevronRight } from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 safe-top safe-bottom scanlines flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 mx-auto rounded-xl grimdark-panel flex items-center justify-center">
          <Library className="w-8 h-8 text-gold" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-gold tracking-wider text-glow-gold">
            THE INFINITY ARCHIVE
          </h1>
          <p className="text-[11px] text-slate-400 font-tactical tracking-[0.25em] mt-2">
            COGITATOR INTERFACE v.M41
          </p>
        </div>

        <Link
          to="/phases"
          className="inline-flex items-center gap-2 px-6 py-3 grimdark-panel rounded-lg font-bold text-gold tracking-wider hover:glow-gold transition-all"
        >
          ENTER THE ARCHIVE
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
