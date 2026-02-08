import React from 'react';
import { cn } from '@/lib/utils';

export const ProgressRing = ({ 
  progress = 0, 
  size = 80, 
  strokeWidth = 6,
  className,
  showPercentage = true,
  variant = 'gold' // 'gold' or 'green'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colors = {
    gold: {
      track: 'stroke-gold-dim/30',
      progress: 'stroke-gold',
      text: 'text-gold',
      glow: 'drop-shadow-[0_0_8px_hsl(var(--gold)/0.5)]'
    },
    green: {
      track: 'stroke-terminal-dim/30',
      progress: 'stroke-terminal',
      text: 'text-terminal',
      glow: 'drop-shadow-[0_0_8px_hsl(var(--terminal-green)/0.5)]'
    }
  };

  const colorSet = colors[variant] || colors.gold;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className={cn("transform -rotate-90", progress > 0 && colorSet.glow)}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={colorSet.track}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(colorSet.progress, "transition-all duration-700 ease-out")}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
        {/* Glow effect overlay for filled progress */}
        {progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
            className={cn(colorSet.progress, "opacity-20")}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        )}
      </svg>
      {showPercentage && (
        <span className={cn(
          "absolute font-tactical text-sm font-bold",
          colorSet.text
        )}>
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
};

export default ProgressRing;
