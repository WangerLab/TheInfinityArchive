import React from 'react';
import { cn } from '@/lib/utils';

export const ProgressRing = ({ 
  progress = 0, 
  size = 80, 
  strokeWidth = 6,
  className,
  showPercentage = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const getGradientId = `progress-gradient-${Math.random().toString(36).substr(2, 9)}`;
  
  const isPacified = progress >= 100;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={getGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isPacified ? "hsl(160, 85%, 40%)" : "hsl(38, 92%, 50%)"} />
            <stop offset="100%" stopColor={isPacified ? "hsl(160, 85%, 50%)" : "hsl(45, 95%, 55%)"} />
          </linearGradient>
        </defs>
        
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-white/10"
        />
        
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={`url(#${getGradientId})`}
          className="transition-all duration-700 ease-out"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            filter: progress > 0 ? `drop-shadow(0 0 6px ${isPacified ? 'hsl(160, 85%, 40%)' : 'hsl(38, 92%, 50%)'})` : 'none'
          }}
        />
      </svg>
      
      {showPercentage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "font-tactical text-lg font-bold",
            isPacified ? "text-auspex text-glow-auspex" : "text-gold text-glow-gold"
          )}>
            {Math.round(progress)}
          </span>
          <span className="text-[9px] text-slate-400 font-semibold tracking-widest">%</span>
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
