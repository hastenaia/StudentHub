import * as React from "react";
import { cn } from "@/utils/cn";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-medium text-brand-dark leading-none", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
