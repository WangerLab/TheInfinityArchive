import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const ProgressRing = ({ 
  progress = 0, 
  size = 80, 
  strokeWidth = 6,
  className,
  showPercentage = true,
  variant = 'gold' // 'gold', 'green', 'chaos', 'xenos'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colors = {
    gold: {
      track: 'stroke-gold-dim/20',
      progress: 'stroke-gold',
      text: 'text-gold',
      glow: 'drop-shadow-[0_0_8px_hsl(var(--gold)/0.5)]'
    },
    green: {
      track: 'stroke-terminal-dim/20',
      progress: 'stroke-terminal',
      text: 'text-terminal',
      glow: 'drop-shadow-[0_0_8px_hsl(var(--terminal-green)/0.5)]'
    },
    chaos: {
      track: 'stroke-chaos/20',
      progress: 'stroke-chaos',
      text: 'text-chaos',
      glow: 'drop-shadow-[0_0_8px_hsl(var(--chaos-purple)/0.5)]'
    },
    xenos: {
      track: 'stroke-xenos/20',
      progress: 'stroke-xenos',
      text: 'text-xenos',
      glow: 'drop-shadow-[0_0_8px_hsl(var(--xenos-cyan)/0.5)]'
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
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colorSet.progress}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      {showPercentage && (
        <span className={cn(
          "absolute font-tactical text-xs font-bold",
          colorSet.text
        )}>
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
};

export default ProgressRing;
