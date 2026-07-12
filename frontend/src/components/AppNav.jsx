import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Layers, Archive, Globe, Cpu, Award, LogOut } from 'lucide-react';
import { supabase } from 'lib/supabase';

// Labels mirror the Landing bridge's station names (see the stations array in
// pages/Landing.jsx) so a destination reads the same in both places. Matched by
// route, not by label. '/' keeps HOME — the Landing IS the bridge and has no
// station of its own for it.
const navItems = [
  { to: '/', label: 'HOME', icon: Home, end: true },
  { to: '/phases', label: 'CAMPAIGN', icon: Layers },
  { to: '/archive', label: 'AUSPEX', icon: Archive },
  { to: '/map', label: 'OCULUS', icon: Globe },
  { to: '/strategium', label: 'STRATEGIUM', icon: Cpu },
  { to: '/record', label: 'SERVICE RECORD', icon: Award },
];

export function AppNav() {
  return (
    <nav className="bg-slate-950/95 backdrop-blur-md border-b border-gold/30 safe-top">
      <div className="flex items-center gap-1 px-4 py-2">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 px-3 py-2 rounded-md font-tactical text-xs tracking-widest transition-all ${
                isActive
                  ? 'text-gold bg-gold/10 border border-gold/40'
                  : 'text-slate-400 border border-transparent hover:text-gold hover:bg-gold/5'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => supabase.auth.signOut()}
          aria-label="Sign out"
          className="ml-auto inline-flex items-center justify-center w-9 h-9 rounded-md border border-gold/30 text-gold/70 hover:border-gold hover:text-gold hover:bg-gold/10 active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
