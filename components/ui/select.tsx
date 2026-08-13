import * as React from "react";
import { cn } from "@/utils/cn";

/**
 * Thin styled wrapper around a native <select>. Native selects avoid an extra
 * dependency (no Radix select is installed) while still matching the input
 * styling. FormControl clones a single child, so this must forward refs + props.
 */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-brand-dark transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export { Select };