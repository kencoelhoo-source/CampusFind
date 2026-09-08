import { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { isAllowedSfitEmail, sfitEmailError } from "@/lib/email";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithGoogleIdToken: (token: string, nonce: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function rejectNonSfitSession(
  session: Session | null,
  rejectedEmail: { current: string | null },
  onReject: (email: string | null) => void,
) {
  const nextUser = session?.user ?? null;
  const email = nextUser?.email ?? null;

  if (nextUser && !isAllowedSfitEmail(email)) {
    if (rejectedEmail.current !== email) {
      rejectedEmail.current = email;
      onReject(email);
    }
    return null;
  }

  rejectedEmail.current = null;
  return session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const rejectedEmail = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Intercept OAuth error parameters (e.g. from Supabase database trigger rejections)
    const checkOAuthErrors = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      let errorMsg = "";

      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const errorDesc = params.get("error_description") || params.get("error");
        if (errorDesc) errorMsg = errorDesc;
      }

      if (!errorMsg && search) {
        const params = new URLSearchParams(search);
        const errorDesc = params.get("error_description") || params.get("error");
        if (errorDesc) errorMsg = errorDesc;
      }

      if (errorMsg) {
        let friendlyMsg = errorMsg.replace(/\+/g, " ");
        if (
          friendlyMsg.toLowerCase().includes("check_signup_email_domain") ||
          friendlyMsg.toLowerCase().includes("sfit") ||
          friendlyMsg.toLowerCase().includes("domain")
        ) {
          friendlyMsg = "Access denied. Only @student.sfit.ac.in or @sfit.ac.in accounts can sign in.";
        }
        toast.error(friendlyMsg);
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    checkOAuthErrors();

    const apply = (nextSession: Session | null) => {
      const allowed = rejectNonSfitSession(nextSession, rejectedEmail, (email) => {
        toast.error(sfitEmailError(email));
        // Clear any access token from URL hash to prevent re-authentication on reload
        if (window.location.hash.includes("access_token") || window.location.hash.includes("error")) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        // signOut must not run inside the auth callback — it deadlocks supabase-js.
        window.setTimeout(() => {
          void supabase.auth.signOut();
        }, 0);
      });

      if (cancelled) return;

      setSession(allowed);
      setUser(allowed?.user ?? null);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      apply(nextSession);
    });

    void supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      });

    const failSafe = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    return { error };
  }, []);

  const signInWithGoogleIdToken = useCallback(async (token: string, nonce: string) => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token,
      nonce,
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signInWithGoogleIdToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
