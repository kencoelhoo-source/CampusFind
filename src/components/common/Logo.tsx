import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-7 w-7", className)}
      fill="none"
      aria-hidden
    >
      <path
        d="M16 28s8.75-8.4 8.75-14.5A8.75 8.75 0 0 0 16 4.75a8.75 8.75 0 0 0-8.75 8.75C7.25 19.6 16 28 16 28z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="13.4" r="2.7" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function Logo({
  inverted,
  withWordmark = true,
  className,
}: {
  inverted?: boolean;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-2.5 transition-colors duration-300 ease-apple",
        inverted ? "text-white" : "text-foreground",
        className,
      )}
    >
      <Mark />
      {withWordmark && (
        <span className="font-display text-[15px] font-semibold tracking-tight">CampusFind</span>
      )}
    </Link>
  );
}
