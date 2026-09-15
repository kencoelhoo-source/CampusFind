import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { FAQS } from "@/data/faqs";

export default function FAQ() {
  return (
    <div className="container max-w-2xl py-16 md:py-24">
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Help</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Questions, answered.</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
        Report, describe, hand it over in public. The same pattern campus lost-and-found desks use — without a long ticket thread.
      </p>

      <Accordion type="single" collapsible className="mt-10">
        {FAQS.map((item, index) => (
          <AccordionItem key={item.q} value={`item-${index}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="mt-12 text-[14px] text-muted-foreground">
        Still stuck? Review the <Link to="/privacy" className="text-foreground underline-offset-4 hover:underline">Privacy Policy</Link> and{" "}
        <Link to="/terms" className="text-foreground underline-offset-4 hover:underline">Terms</Link>.
      </p>
    </div>
  );
}
