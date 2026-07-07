import React from 'react';
import { ViewBackdrop } from 'components/ViewBackdrop';

export function ServiceRecord() {
  return (
    <ViewBackdrop art="/Gilded_reliquary_vitrine_with_skull_202607041801.jpeg" accent="gold">
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-3">
        <h1 className="font-display text-3xl text-gold tracking-wider">
          SERVICE RECORD
        </h1>
        <p className="text-[11px] text-slate-500 font-tactical tracking-[0.25em]">
          HONOURS VITRINE — STANDBY
        </p>
      </div>
      </div>
    </ViewBackdrop>
  );
}
