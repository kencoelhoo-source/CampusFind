import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarDropdown({
  name,
  value,
  caption,
  children,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  name?: string;
  value?: string | number;
  caption?: React.ReactNode;
  children?: React.ReactNode;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const isYear = name === "years";

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const options = React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<{ value?: string | number; children?: React.ReactNode }>(child)) return [];
    return [{ value: String(child.props.value), label: child.props.children }];
  });

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium transition-colors duration-200 ease-apple hover:bg-accent"
      >
        {caption}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 opacity-50 transition-transform duration-200 ease-apple",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-[calc(100%+6px)] z-[80] rounded-2xl border border-border/60 bg-popover p-2 shadow-menu",
            isYear ? "right-0 w-[7.5rem]" : "left-1/2 w-[13.5rem] -translate-x-1/2",
          )}
        >
          <div className={cn(isYear ? "flex max-h-52 flex-col gap-0.5 overflow-y-auto" : "grid grid-cols-2 gap-1")}>
            {options.map((option) => {
              const selected = String(value) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange?.({
                      target: { value: option.value },
                    } as React.ChangeEvent<HTMLSelectElement>);
                    setOpen(false);
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-2 text-[13px] leading-none transition-colors duration-150 ease-apple",
                    isYear ? "w-full" : "min-h-9 w-full",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Calendar({ className, classNames, showOutsideDays = true, components, ...props }: CalendarProps) {
  const thisYear = new Date().getFullYear();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fromYear={2018}
      toYear={thisYear}
      {...props}
      captionLayout="dropdown-buttons"
      className={cn("overflow-visible p-3", className)}
      classNames={{
        months: "flex flex-col overflow-visible sm:flex-row sm:space-x-4 sm:space-y-0 space-y-4",
        month: "space-y-4 overflow-visible",
        caption: "flex justify-center px-8 pt-1 relative items-center overflow-visible",
        caption_label: "text-sm font-medium",
        caption_dropdowns: "relative z-10 flex items-center justify-center gap-1 overflow-visible",
        dropdown_month: "relative",
        dropdown_year: "relative",
        dropdown: "sr-only",
        vhidden: "sr-only",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 transition-opacity duration-200 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Dropdown: CalendarDropdown,
        ...components,
      }}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
