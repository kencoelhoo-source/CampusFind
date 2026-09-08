import { Toaster as Sonner, toast } from "sonner";
import { useTheme } from "@/lib/theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset={72}
      mobileOffset={72}
      duration={3200}
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group toast flex w-[min(22.5rem,calc(100vw-1.5rem))] items-start gap-3 rounded-2xl border border-border/70 bg-popover/95 px-4 py-3.5 text-[14px] font-medium leading-snug text-foreground shadow-menu backdrop-blur-xl",
          title: "text-[14px] font-medium tracking-tight",
          description: "mt-0.5 text-[13px] font-normal text-muted-foreground",
          success: "border-campus/25",
          error: "border-destructive/30",
          warning: "border-border/70",
          info: "border-border/70",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
