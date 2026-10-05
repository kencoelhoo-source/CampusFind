import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Square } from "lucide-react";
import { FAQS } from "@/data/faqs";
import { getSimulatedAIResponse } from "@/data/ai-responses";
import { cn } from "@/lib/utils";
import type { FoggyExpression } from "@/components/foggy/foggy-scene";

// three.js only loads on this page, after the FAQ text has rendered.
const Foggy = lazy(() => import("@/components/foggy/Foggy"));

export default function FAQ() {
  const [items, setItems] = useState<{ q: string; a: string; isGenerated?: boolean }[]>([...FAQS]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);
  const [inputFocused, setInputFocused] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const celebrateTimer = useRef<number>();
  const inputRef = useRef<HTMLInputElement>(null);

  const [glanceTarget, setGlanceTarget] = useState<HTMLElement | null>(null);

  useEffect(() => () => window.clearTimeout(celebrateTimer.current), []);

  // When a question opens (including Foggy's own new answer), he looks at it for a moment.
  useEffect(() => {
    if (!openItem) return;
    const opened = document.querySelector<HTMLElement>(`[data-faq-item="${openItem}"]`);
    if (!opened) return;
    setGlanceTarget(opened);
    const timer = window.setTimeout(() => setGlanceTarget(null), 2500);
    return () => window.clearTimeout(timer);
  }, [openItem]);

  // Foggy reacts to what you're doing: curious while you type, typing while the answer
  // "loads", happy when it lands, friendly the rest of the time.
  const foggyExpression: FoggyExpression = isLoading
    ? "typing"
    : celebrating
      ? "happy"
      : inputFocused
        ? "curious"
        : "hello";

  // What he looks at: his laptop while "typing", a question that just opened, otherwise
  // the question box while you're in it. With nothing set he follows taps/cursor/scroll.
  const foggyLookAt = isLoading ? null : (glanceTarget ?? (inputFocused ? inputRef.current : null));

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    // Simulate AI loading/inference time
    setTimeout(() => {
      const newIndex = items.length;
      const simulatedAnswer = getSimulatedAIResponse(inputValue);
      
      setItems((prev) => [
        ...prev,
        {
          q: inputValue,
          a: simulatedAnswer,
          isGenerated: true,
        },
      ]);
      setInputValue("");
      setIsLoading(false);
      setOpenItem(`item-${newIndex}`);
      setCelebrating(true);
      window.clearTimeout(celebrateTimer.current);
      celebrateTimer.current = window.setTimeout(() => setCelebrating(false), 3500);
    }, 1800);
  };

  // md:pt-12 puts the left column's resting spot exactly where it sticks (top-28), so it
  // never jumps or leaves a big gap under the nav bar while you scroll.
  return (
    <div className="container mx-auto px-6 py-20 md:pb-24 md:pt-12 max-w-[1000px]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-24">
        {/* Left Column */}
        <div className="md:col-span-4 flex flex-col pt-2 md:sticky md:top-28 md:self-start">
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-[42px] text-foreground">
            Questions
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground max-w-[280px]">
            The short ones are here. For anything else, ask Foggy at the end of the list.
          </p>
          {/* Desktop: sits in this sticky column. Phones: he roams the screen (rows are his ledges). */}
          <Suspense fallback={<div className="hidden md:mt-8 md:block md:h-[324px]" />}>
            <Foggy
              expression={foggyExpression}
              interactive={!inputFocused}
              lookAt={foggyLookAt}
              watching={inputFocused ? inputRef.current : null}
              className="md:mt-8"
            />
          </Suspense>
        </div>

        {/* Right Column */}
        <div className="md:col-span-8">
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            value={openItem}
            onValueChange={setOpenItem}
          >
            {items.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                data-faq-item={`item-${index}`}
                data-foggy-ledge="bottom"
                className="border-border/40"
              >
                <AccordionTrigger className="text-[15px] sm:text-[16px] py-6 hover:no-underline font-normal text-foreground/90">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground pb-6 relative group/content">
                  <div className="pr-16">{item.a}</div>
                  {item.isGenerated && (
                    <button
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute bottom-6 right-0 text-[10px] font-semibold text-muted-foreground/30 hover:text-rose-500 transition-all uppercase tracking-wider"
                    >
                      Remove
                    </button>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* AI Input Field (Styled as an accordion row) */}
          <div data-foggy-ledge="bottom" className="relative flex items-center border-b border-border/40 group">
            <form onSubmit={handleSubmit} className="w-full flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Ask anything else"
                disabled={isLoading}
                className="w-full bg-transparent border-none outline-none py-6 text-[15px] sm:text-[16px] text-foreground placeholder:text-muted-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              
              <div className="flex-shrink-0 ml-4 flex items-center justify-center">
                {isLoading ? (
                  <button 
                    type="button" 
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10 text-foreground/50 transition-all duration-300"
                    disabled
                  >
                    <Square className="h-2.5 w-2.5 fill-current" />
                  </button>
                ) : (
                  <button 
                    type="submit"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
                      inputValue.trim() 
                        ? "bg-foreground text-background hover:scale-105 active:scale-95" 
                        : "bg-transparent text-muted-foreground/30 group-hover:text-muted-foreground"
                    )}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
          
          {isLoading && (
            <div className="py-6 text-[14px] text-muted-foreground animate-pulse flex items-center gap-2">
              Reading the docs...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
