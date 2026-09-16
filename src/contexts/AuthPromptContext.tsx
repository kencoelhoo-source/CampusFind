import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { AuthPromptModal } from "@/components/common/AuthPromptModal";

export interface AuthPromptOptions {
  actionType?: "report" | "lost" | "found";
  redirectUrl?: string;
}

export interface AuthPromptContextType {
  openAuthPrompt: (options?: AuthPromptOptions) => void;
  closeAuthPrompt: () => void;
  isOpen: boolean;
}

const AuthPromptContext = createContext<AuthPromptContextType | undefined>(undefined);

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AuthPromptOptions>({
    actionType: "report",
    redirectUrl: "/post",
  });

  const openAuthPrompt = useCallback((opts?: AuthPromptOptions) => {
    setOptions({
      actionType: opts?.actionType || "report",
      redirectUrl: opts?.redirectUrl || "/post",
    });
    setOpen(true);
  }, []);

  const closeAuthPrompt = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <AuthPromptContext.Provider value={{ openAuthPrompt, closeAuthPrompt, isOpen: open }}>
      {children}
      <AuthPromptModal
        open={open}
        onOpenChange={setOpen}
        actionType={options.actionType}
        redirectUrl={options.redirectUrl}
      />
    </AuthPromptContext.Provider>
  );
}

export function useAuthPrompt() {
  const context = useContext(AuthPromptContext);
  if (!context) {
    throw new Error("useAuthPrompt must be used within an AuthPromptProvider");
  }
  return context;
}
