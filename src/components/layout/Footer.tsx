import { Link } from "react-router-dom";

const footerLinks = [
  { to: "/items", label: "Browse" },
  { to: "/faq", label: "FAQ" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/70 dark:border-border/30 bg-transparent">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 flex flex-col items-center justify-between gap-2 py-2.5 sm:py-3 text-center text-[12px] text-muted-foreground/60 sm:flex-row sm:gap-4 sm:text-left">
        <p className="tracking-tight">Copyright © {new Date().getFullYear()} CampusFind. SFIT, Mumbai.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-[12px] text-muted-foreground/60 transition-colors duration-200 hover:text-foreground/90"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
