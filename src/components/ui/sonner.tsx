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

if (typeof window !== "undefined") {
  (window as any).toast = toast;
}

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset={16}
      duration={4000}
      visibleToasts={1}
      expand={false}
      gap={12}
      closeButton={false}
      icons={{
        error: (
          <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center text-rose-500">
            <svg
              className="h-5 w-5 stroke-current stroke-[2.5]"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        ),
        success: (
          <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center text-emerald-400">
            <svg
              className="h-5 w-5 stroke-current stroke-[2.75]"
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
          <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center text-amber-500">
            <svg
              className="h-5 w-5 stroke-current stroke-[2.5]"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        ),
        info: (
          <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center text-sky-500">
            <svg
              className="h-5 w-5 stroke-current stroke-[2.5]"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
        ),
        loading: (
          <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center">
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
        classNames: {
          toast:
            "group toast flex w-full sm:w-auto max-w-[480px] items-center gap-3.5 rounded-[1.35rem] border border-white/10 bg-[#111111]/90 backdrop-blur-2xl px-4 py-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.5),0_1px_1px_rgba(255,255,255,0.08)_inset]",
          title: "text-[13.5px] sm:text-[14px] font-semibold tracking-tight text-white/95 whitespace-normal break-words leading-snug",
          description: "text-[12.5px] sm:text-[13px] font-normal text-white/65 leading-relaxed whitespace-normal break-words mt-0.5",
          icon: "flex items-center justify-center shrink-0 self-center",
          content: "flex min-w-0 flex-1 flex-col justify-center gap-0.5 text-left",
          actionButton:
            "rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/20",
          cancelButton:
            "rounded-full bg-transparent px-3 py-1.5 text-[12px] font-medium text-white/50 transition-colors hover:text-white",
          success: "border-emerald-500/20",
          error: "border-rose-500/20",
          warning: "border-amber-500/20",
          info: "border-sky-500/20",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
