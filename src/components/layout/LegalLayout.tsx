import { Link } from "react-router-dom";

export interface LegalLayoutProps {
  kicker?: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  return (
    <article className="container max-w-2xl py-16 md:py-24">
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
      {updated && <p className="mt-3 text-[13px] text-muted-foreground">Updated {updated}</p>}
      <div className="mt-10 space-y-8 text-[16px] leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_p]:mt-3 [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-14 text-[13px] text-muted-foreground">
        Questions? See the <Link to="/faq" className="text-foreground underline-offset-4 hover:underline">FAQ</Link> or
        return <Link to="/" className="text-foreground underline-offset-4 hover:underline">home</Link>.
      </p>
    </article>
  );
}
