import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export const GrimdarkCheckbox = ({ 
  checked = false, 
  onCheckedChange,
  disabled = false,
  type = 'novel', // 'novel', 'short', 'omnibus', 'anthology'
  className
}) => {
  const handleToggle = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  const typeColors = {
    novel: 'border-gold bg-gold',
    short: 'border-plasma bg-plasma',
    omnibus: 'border-purple-500 bg-purple-500',
    anthology: 'border-auspex bg-auspex'
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        "touch-checkbox min-w-[48px] min-h-[48px]",
        "flex items-center justify-center",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-gold/50",
        "active:scale-95",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className={cn(
        "w-7 h-7 rounded-md border-2 transition-all duration-200",
        "flex items-center justify-center",
        "shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]",
        checked 
          ? cn(
              typeColors[type] || typeColors.novel,
              "shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            )
          : "border-slate-600 bg-slate-900/50 hover:border-slate-400"
      )}>
        {checked && (
          <Check className="w-5 h-5 text-black stroke-[3]" />
        )}
      </div>
    </button>
  );
};

export default GrimdarkCheckbox;
