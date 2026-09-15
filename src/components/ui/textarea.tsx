import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-2xl border border-input/80 bg-card px-4 py-3 text-[13.5px] sm:text-[14px] tracking-tight transition-[border-color,box-shadow,background-color] duration-200 ease-apple placeholder:text-muted-foreground/65 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 focus-visible:border-neutral-400 dark:focus-visible:border-neutral-500 focus-visible:ring-4 focus-visible:ring-black/[0.04] dark:focus-visible:ring-white/[0.06] focus-visible:shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:focus-visible:shadow-[0_2px_12px_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-50 [-webkit-tap-highlight-color:transparent]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
