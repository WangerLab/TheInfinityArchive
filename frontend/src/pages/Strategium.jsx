import React from 'react';
import { ViewBackdrop } from 'components/ViewBackdrop';

export function Strategium() {
  return (
    <ViewBackdrop art="/War-table_projecting_battle-map_2K_202607041801.jpeg" accent="plasma">
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-3">
        <h1 className="font-display text-3xl text-plasma tracking-wider">
          STRATEGIUM
        </h1>
        <p className="text-[11px] text-slate-500 font-tactical tracking-[0.25em]">
          TACTICAL ADVISOR — STANDBY
        </p>
      </div>
      </div>
    </ViewBackdrop>
  );
}
