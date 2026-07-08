import React from 'react';
import { ViewBackdrop } from 'components/ViewBackdrop';

export function MapView() {
  return (
    <ViewBackdrop art="/Oculus_hololith_galaxy_16x9_202607042230.jpeg" accent="map">
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-3">
        <h1 className="font-display text-3xl text-plasma tracking-wider">
          OCULUS
        </h1>
        <p className="text-[11px] text-slate-500 font-tactical tracking-[0.25em]">
          HOLOLITHIC VIEWER — STANDBY
        </p>
      </div>
      </div>
    </ViewBackdrop>
  );
}
