import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-sm bg-muted/50 border border-border/30",
      className
    )}
    {...props}>
    <ProgressPrimitive.Indicator asChild>
      <motion.div
        className="h-full w-full flex-1 bg-gradient-to-r from-gold via-gold to-terminal rounded-sm"
        initial={{ x: "-100%" }}
        animate={{ x: `${-100 + (value || 0)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </ProgressPrimitive.Indicator>
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
