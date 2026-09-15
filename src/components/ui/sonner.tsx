import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

const TOAST_ID = "campusfind-toast";

type ToastOptions = Parameters<typeof sonnerToast.success>[1];

function withSharedId(options?: ToastOptions): ToastOptions {
  return { ...options, id: options?.id ?? TOAST_ID };
}

export const toast = Object.assign(
  ((message: Parameters<typeof sonnerToast>[0], options?: ToastOptions) =>
    sonnerToast(message, withSharedId(options))) as typeof sonnerToast,
  {
    success: (message: Parameters<typeof sonnerToast.success>[0], options?: ToastOptions) =>
      sonnerToast.success(message, withSharedId(options)),
    error: (message: Parameters<typeof sonnerToast.error>[0], options?: ToastOptions) =>
      sonnerToast.error(message, withSharedId(options)),
    warning: (message: Parameters<typeof sonnerToast.warning>[0], options?: ToastOptions) =>
      sonnerToast.warning(message, withSharedId(options)),
    info: (message: Parameters<typeof sonnerToast.info>[0], options?: ToastOptions) =>
      sonnerToast.info(message, withSharedId(options)),
    message: (message: Parameters<typeof sonnerToast.message>[0], options?: ToastOptions) =>
      sonnerToast.message(message, withSharedId(options)),
    loading: (message: Parameters<typeof sonnerToast.loading>[0], options?: ToastOptions) =>
      sonnerToast.loading(message, withSharedId(options)),
    promise: sonnerToast.promise.bind(sonnerToast),
    custom: sonnerToast.custom.bind(sonnerToast),
    dismiss: sonnerToast.dismiss.bind(sonnerToast),
  },
);

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset={16}
      mobileOffset={{ top: 12 }}
      duration={3200}
      visibleToasts={1}
      expand={false}
      gap={12}
      closeButton={false}
      icons={{
        error: (
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#FF453A] text-white shadow-[0_1px_4px_rgba(255,69,58,0.45)]">
            <svg
              className="h-3.5 w-3.5 stroke-white stroke-[3.2]"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5.5" x2="12" y2="13.5" />
              <circle cx="12" cy="18.5" r="1.1" fill="white" stroke="none" />
            </svg>
          </div>
        ),
        success: (
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#30D158] text-white shadow-[0_1px_4px_rgba(48,209,88,0.45)]">
            <svg
              className="h-3.5 w-3.5 stroke-white stroke-[3.2]"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ),
        warning: (
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#FF9F0A] text-white shadow-[0_1px_4px_rgba(255,159,10,0.45)]">
            <svg
              className="h-3.5 w-3.5 stroke-white stroke-[3.2]"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5.5" x2="12" y2="13.5" />
              <circle cx="12" cy="18.5" r="1.1" fill="white" stroke="none" />
            </svg>
          </div>
        ),
        info: (
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#0A84FF] text-white shadow-[0_1px_4px_rgba(10,132,255,0.45)]">
            <svg
              className="h-3.5 w-3.5 stroke-white stroke-[3]"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="6" r="1.1" fill="white" stroke="none" />
              <line x1="12" y1="10" x2="12" y2="18" />
            </svg>
          </div>
        ),
        loading: (
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center">
            <svg
              className="h-4 w-4 animate-spin text-neutral-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        ),
      }}
      toastOptions={{
        unstyled: true,
        style: { width: "fit-content" },
        classNames: {
          toast:
            "group toast flex !w-fit max-w-[min(26rem,calc(100vw-2rem))] items-center justify-center gap-2.5 rounded-full border border-white/[0.14] bg-neutral-950 py-2.5 pl-3 pr-4 text-[13.5px] font-medium leading-snug text-neutral-100 shadow-[0_12px_40px_rgba(0,0,0,0.4),0_1px_1px_rgba(255,255,255,0.12)_inset]",
          title: "whitespace-nowrap text-[13.5px] font-medium tracking-tight text-neutral-100",
          description: "whitespace-nowrap text-[12.5px] font-normal text-neutral-400",
          icon: "flex items-center justify-center shrink-0 self-center",
          content: "flex min-w-0 flex-col justify-center whitespace-nowrap",
          actionButton:
            "rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors",
          cancelButton:
            "rounded-full bg-transparent px-2.5 py-1 text-xs font-normal text-neutral-400 hover:text-white transition-colors",
          success: "border-emerald-500/25",
          error: "border-rose-500/25",
          warning: "border-amber-500/25",
          info: "border-sky-500/25",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
