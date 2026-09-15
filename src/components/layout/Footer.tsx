import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const footerLinks = [
  { to: "/items", label: "Browse" },
  { to: "/faq", label: "FAQ" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
];

export function Footer({ embedded = false }: { embedded?: boolean }) {
  return (
    <footer
      className={cn(
        "mt-auto",
        embedded
          ? "relative z-10 border-0 bg-transparent pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:pb-5"
          : "border-t border-border/70 bg-transparent pb-[calc(5rem+env(safe-area-inset-bottom,0px))] dark:border-border/30 md:pb-0",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-2.5 text-center text-[12px] sm:flex-row sm:gap-4 sm:px-6 sm:py-3 sm:text-left lg:px-8",
          embedded
            ? "text-foreground/60 dark:text-white/50"
            : "text-muted-foreground/60",
        )}
      >
        <p className="tracking-tight">Copyright © {new Date().getFullYear()} CampusFind. SFIT, Mumbai.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "text-[12px] transition-colors duration-200",
                embedded
                  ? "text-foreground/60 hover:text-foreground dark:text-white/50 dark:hover:text-white"
                  : "text-muted-foreground/60 hover:text-foreground/90",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
