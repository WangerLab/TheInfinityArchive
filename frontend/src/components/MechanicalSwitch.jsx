import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

export const MechanicalSwitch = ({ 
  checked = false, 
  onCheckedChange,
  disabled = false,
  className,
  size = 'md',
  id 
}) => {
  const handleToggle = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  const sizes = {
    sm: { wrapper: 'h-5 w-9', thumb: 'h-3.5 w-3.5', translate: 'translate-x-4' },
    md: { wrapper: 'h-6 w-11', thumb: 'h-4 w-4', translate: 'translate-x-5' },
    lg: { wrapper: 'h-7 w-12', thumb: 'h-5 w-5', translate: 'translate-x-5' }
  };

  const sizeConfig = sizes[size] || sizes.md;

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-sm",
        "border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-background",
        sizeConfig.wrapper,
        checked 
          ? "border-gold bg-gradient-to-b from-gold to-gold-dim shadow-[0_0_15px_hsl(var(--gold)/0.4),inset_0_1px_0_hsl(var(--gold-bright))]" 
          : "border-border bg-gradient-to-b from-steel to-void shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),0_1px_0_hsl(var(--gold)/0.1)]",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer",
        className
      )}
    >
      <motion.span
        initial={false}
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "pointer-events-none flex items-center justify-center",
          "rounded-sm shadow-md",
          sizeConfig.thumb,
          checked 
            ? "bg-background border border-gold/50" 
            : "bg-muted border border-border"
        )}
      >
        {checked ? (
          <Check className="h-2.5 w-2.5 text-gold" />
        ) : (
          <X className="h-2.5 w-2.5 text-muted-foreground/50" />
        )}
      </motion.span>
      
      <span 
        className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full transition-all duration-300",
          checked 
            ? "bg-terminal shadow-[0_0_6px_hsl(var(--terminal-green))]" 
            : "bg-muted-foreground/30"
        )} 
      />
    </button>
  );
};

export default MechanicalSwitch;
