import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div key={pathname} className="page-enter flex flex-1 flex-col">
      {children}
    </div>
  );
}

export function AuthCurtain() {
  const { user, loading } = useAuth();
  const previousUser = useRef<typeof user>(undefined);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (previousUser.current === undefined) {
      previousUser.current = user;
      return;
    }

    const wasSignedIn = Boolean(previousUser.current);
    const isSignedIn = Boolean(user);

    if (wasSignedIn !== isSignedIn) {
      setVisible(true);
      const timeout = window.setTimeout(() => setVisible(false), 750);
      previousUser.current = user;
      return () => window.clearTimeout(timeout);
    }

    previousUser.current = user;
  }, [user, loading]);

  if (!visible) return null;

  return <div className="auth-curtain" aria-hidden />;
}
