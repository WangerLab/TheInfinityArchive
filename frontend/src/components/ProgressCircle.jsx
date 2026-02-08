import React from 'react';
import { cn } from '@/lib/utils';

export const ProgressCircle = ({ 
  progress = 0, 
  size = 80, 
  strokeWidth = 6,
  className,
  showPercentage = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  // Color based on progress
  const getColor = () => {
    if (progress >= 100) return 'stroke-success';
    if (progress >= 50) return 'stroke-primary';
    return 'stroke-accent';
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
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
          className={cn(getColor(), "transition-all duration-700 ease-out")}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
        {/* Glow effect */}
        {progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth + 6}
            strokeLinecap="round"
            className={cn(getColor(), "opacity-20 blur-sm")}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        )}
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "font-display text-lg font-bold",
            progress >= 100 ? "text-success" : "text-primary"
          )}>
            {Math.round(progress)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wider">%</span>
        </div>
      )}
    </div>
  );
};

export default ProgressCircle;
