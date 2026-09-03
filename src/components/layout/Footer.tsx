import { Link } from "react-router-dom";

const footerLinks = [
  { to: "/items", label: "Browse" },
  { to: "/faq", label: "FAQ" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-background/50">
      <div className="container flex flex-col items-center justify-between gap-3.5 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:gap-4 sm:py-8 sm:text-left sm:text-[13px]">
        <p>Copyright © {new Date().getFullYear()} CampusFind. SFIT, Mumbai.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
