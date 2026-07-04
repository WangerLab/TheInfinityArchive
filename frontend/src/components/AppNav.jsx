import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Layers, Archive, Globe, Cpu, Award } from 'lucide-react';

const navItems = [
  { to: '/', label: 'HOME', icon: Home, end: true },
  { to: '/phases', label: 'PHASES', icon: Layers },
  { to: '/archive', label: 'ARCHIVE', icon: Archive },
  { to: '/map', label: 'MAP', icon: Globe },
  { to: '/strategium', label: 'STRATEGIUM', icon: Cpu },
  { to: '/record', label: 'RECORD', icon: Award },
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
      </div>
    </nav>
  );
}
