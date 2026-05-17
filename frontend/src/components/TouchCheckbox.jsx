import React from 'react';
import { cn } from 'lib/utils';
import { Check } from 'lucide-react';

export const TouchCheckbox = ({ 
  checked = false, 
  onCheckedChange,
  disabled = false,
  className,
  type = 'novel' // 'novel', 'short', 'omnibus', 'anthology'
}) => {
  const handleToggle = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  const typeColors = {
    novel: 'border-primary bg-primary',
    short: 'border-accent bg-accent',
    omnibus: 'border-omnibus bg-omnibus',
    anthology: 'border-success bg-success'
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        "touch-target min-w-[44px] min-h-[44px]",
        "flex items-center justify-center",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "active:scale-95",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className={cn(
        "w-7 h-7 rounded-lg border-2 transition-all duration-200",
        "flex items-center justify-center",
        checked 
          ? cn(typeColors[type] || typeColors.novel, "shadow-[0_0_12px_hsl(var(--primary)/0.4)]")
          : "border-slate-600 bg-black hover:border-slate-400"
      )}>
        {checked && (
          <Check className="w-5 h-5 text-black stroke-[3]" />
        )}
      </div>
    </button>
  );
};

export default TouchCheckbox;
