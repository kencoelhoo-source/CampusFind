import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { isAllowedSfitEmail, sfitEmailError } from "@/lib/email";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
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

    const apply = (nextSession: Session | null) => {
      const allowed = rejectNonSfitSession(nextSession, rejectedEmail, (email) => {
        toast.error(sfitEmailError(email));
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

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isAllowedSfitEmail(email)) {
      return {
        error: {
          name: "AuthError",
          message: sfitEmailError(email),
          status: 403,
        } as AuthError,
      };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!isAllowedSfitEmail(email)) {
      return {
        error: {
          name: "AuthError",
          message: sfitEmailError(email),
          status: 403,
        } as AuthError,
      };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
