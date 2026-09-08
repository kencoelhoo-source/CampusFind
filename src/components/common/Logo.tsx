import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({
  inverted,
  className,
}: {
  inverted?: boolean;
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
      <span className="font-display text-[15px] font-semibold tracking-tight">CampusFind</span>
    </Link>
  );
}
