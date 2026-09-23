import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";


export function Footer({ embedded = false }: { embedded?: boolean }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "mt-auto w-full",
        embedded
          ? "relative z-10 border-0 bg-transparent sm:bg-gradient-to-t sm:from-black/85 sm:via-black/50 sm:to-transparent pt-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:pt-6 md:pt-8 md:pb-8"
          : "border-t border-border/50 bg-card/30 backdrop-blur-md pt-6 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] dark:border-border/30 dark:bg-[#0c0c0e]/40 md:pt-8 md:pb-8"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        {/* 2-Column Layout: CampusFind, Stay Connected (hidden on mobile when embedded) */}
        <div
          className={cn(
            "flex flex-col justify-between gap-8 text-left sm:flex-row sm:items-start",
            embedded && "hidden sm:flex"
          )}
        >
          {/* Column 1: Brand Info */}
          <div>
            <div className="flex h-7 items-center">
              <Link
                to="/"
                className={cn(
                  "inline-block font-display text-[17px] font-semibold tracking-tight transition-opacity hover:opacity-90 sm:text-[18px]",
                  embedded ? "text-white dark:text-[#EAEAEA]" : "text-foreground"
                )}
              >
                CampusFind
              </Link>
            </div>
            <div className="mt-2.5 space-y-1">
              <p
                className={cn(
                  "text-[12.5px] sm:text-[13px]",
                  embedded ? "text-white/80 dark:text-[#EAEAEA]/80" : "text-muted-foreground"
                )}
              >
                Built by{" "}
                <a
                  href="https://github.com/kencoelhoo-source"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "font-medium underline-offset-4 transition-colors hover:underline",
                    embedded
                      ? "text-white hover:text-white/90 dark:text-[#EAEAEA] dark:hover:text-[#EAEAEA]/90"
                      : "text-foreground hover:text-foreground/80"
                  )}
                >
                  Ken Coelho
                </a>
              </p>
              <p
                className={cn(
                  "text-[12px] leading-relaxed sm:text-[12.5px] max-w-[260px]",
                  embedded ? "text-white/60 dark:text-[#EAEAEA]/70" : "text-muted-foreground/90"
                )}
              >
                Post, claim, and recover lost belongings across campus.
              </p>
            </div>
          </div>

          {/* Column 2: Stay Connected */}
          <div className="sm:text-right">
            <div className="flex h-7 items-center sm:justify-end">
              <h3
                className={cn(
                  "text-[13.5px] font-medium sm:text-[14px]",
                  embedded ? "text-white dark:text-[#EAEAEA]" : "text-foreground"
                )}
              >
                Stay Connected
              </h3>
            </div>
            <div className="mt-2.5 flex items-center gap-2.5 sm:justify-end">
              <a
                href="https://github.com/kencoelhoo-source"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 sm:h-9.5 sm:w-9.5 sm:rounded-2xl",
                  embedded
                    ? "border border-white/15 bg-white/10 text-white hover:border-white/30 hover:bg-white/20 dark:border-[#EAEAEA]/15 dark:bg-[#EAEAEA]/10 dark:text-[#EAEAEA] dark:hover:border-[#EAEAEA]/30 dark:hover:bg-[#EAEAEA]/20 backdrop-blur-md"
                    : "border border-border/60 bg-secondary/50 text-foreground hover:border-border/90 hover:bg-secondary shadow-2xs"
                )}
              >
                <svg
                  className="h-4 w-4 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/ken-coelho/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 sm:h-9.5 sm:w-9.5 sm:rounded-2xl",
                  embedded
                    ? "border border-white/15 bg-white/10 text-white hover:border-white/30 hover:bg-white/20 dark:border-[#EAEAEA]/15 dark:bg-[#EAEAEA]/10 dark:text-[#EAEAEA] dark:hover:border-[#EAEAEA]/30 dark:hover:bg-[#EAEAEA]/20 backdrop-blur-md"
                    : "border border-border/60 bg-secondary/50 text-foreground hover:border-border/90 hover:bg-secondary shadow-2xs"
                )}
              >
                <svg
                  className="h-4 w-4 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Hairline Divider (hidden on mobile when embedded) */}
        <div
          className={cn(
            "my-5 border-t sm:my-6",
            embedded
              ? "hidden sm:block border-white/15 dark:border-[#EAEAEA]/15"
              : "border-border/50"
          )}
        />

        {/* Bottom Bar: Copyright on left, Legal links on right */}
        <div
          className={cn(
            "flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-between sm:text-left",
            !embedded && "gap-2.5"
          )}
        >
          <p
            className={cn(
              "text-[12px] sm:text-[12.5px]",
              embedded ? "text-white/80 dark:text-[#EAEAEA]/80 font-normal" : "text-muted-foreground/80"
            )}
          >
            © {currentYear} CampusFind. All rights reserved.
          </p>
          <div className="flex items-center gap-2 sm:gap-6">
            <Link
              to="/privacy"
              className={cn(
                "text-[12px] transition-colors duration-150 sm:text-[12.5px]",
                embedded
                  ? "text-white/80 hover:text-white dark:text-[#EAEAEA]/80 dark:hover:text-[#EAEAEA]"
                  : "text-muted-foreground/80 hover:text-foreground"
              )}
            >
              Privacy Policy
            </Link>
            <span
              className={cn(
                "text-[12px] sm:hidden",
                embedded ? "text-white/50 dark:text-[#EAEAEA]/50" : "text-muted-foreground/40"
              )}
            >
              |
            </span>
            <Link
              to="/terms"
              className={cn(
                "text-[12px] transition-colors duration-150 sm:text-[12.5px]",
                embedded
                  ? "text-white/80 hover:text-white dark:text-[#EAEAEA]/80 dark:hover:text-[#EAEAEA]"
                  : "text-muted-foreground/80 hover:text-foreground"
              )}
            >
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
