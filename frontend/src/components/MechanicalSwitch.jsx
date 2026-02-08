import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

export const MechanicalSwitch = ({ 
  checked = false, 
  onCheckedChange,
  disabled = false,
  className,
  id 
}) => {
  const handleToggle = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-sm",
        "border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-background",
        checked 
          ? "border-gold bg-gradient-to-b from-gold to-gold-dim shadow-[0_0_15px_hsl(var(--gold)/0.4),inset_0_1px_0_hsl(var(--gold-bright))]" 
          : "border-border bg-gradient-to-b from-steel to-void shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_1px_0_hsl(var(--gold)/0.1)]",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer",
        className
      )}
    >
      {/* Toggle indicator */}
      <span
        className={cn(
          "pointer-events-none absolute flex items-center justify-center",
          "h-5 w-5 rounded-sm shadow-md transition-all duration-300",
          checked 
            ? "translate-x-6 bg-background border border-gold/50" 
            : "translate-x-0.5 bg-muted border border-border"
        )}
      >
        {checked ? (
          <Check className="h-3 w-3 text-gold" />
        ) : (
          <X className="h-3 w-3 text-muted-foreground/50" />
        )}
      </span>
      
      {/* Status indicator lights */}
      <span 
        className={cn(
          "absolute right-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full transition-all duration-300",
          checked 
            ? "bg-terminal shadow-[0_0_6px_hsl(var(--terminal-green))]" 
            : "bg-muted-foreground/30"
        )} 
      />
    </button>
  );
};

export default MechanicalSwitch;
