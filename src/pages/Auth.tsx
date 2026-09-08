import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { createGoogleNonce, GOOGLE_CLIENT_ID, loadGoogleIdentity } from "@/lib/google-gis";
import sfitWallDesktop from "@/assets/d9221461-f3da-4f50-8326-698ebb38de05.png";
import sfitWallMobile from "@/assets/cbb7185f-4f7c-48bb-9232-76a55d611a30.png";

export default function Auth() {
  const { user, loading, signInWithGoogle, signInWithGoogleIdToken } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef("");
  const useGis = Boolean(GOOGLE_CLIENT_ID);

  useEffect(() => {
    if (loading || user) return;

    let cancelled = false;

    const mountGoogle = async () => {
      if (!GOOGLE_CLIENT_ID) return;

      const host = buttonRef.current;
      if (!host) return;

      try {
        const gis = await loadGoogleIdentity();
        if (cancelled) return;

        const { raw, hashed } = await createGoogleNonce();
        nonceRef.current = raw;

        gis.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response.credential) return;
            setConnecting(true);
            const { error } = await signInWithGoogleIdToken(response.credential, nonceRef.current);
            if (error) {
              setConnecting(false);
              toast.error(error.message);
            }
          },
          nonce: hashed,
          auto_select: false,
          ux_mode: "popup",
          context: "signin",
          use_fedcm_for_prompt: true,
          hd: "student.sfit.ac.in",
        });

        host.innerHTML = "";
        const width = Math.min(280, Math.max(210, Math.floor(host.getBoundingClientRect().width) || 245));
        gis.renderButton(host, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width,
          logo_alignment: "left",
        });
      } catch {
        if (!cancelled) toast.error("Could not load Google sign-in.");
      }
    };

    void mountGoogle();

    return () => {
      cancelled = true;
    };
  }, [loading, user, signInWithGoogleIdToken, useGis]);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative flex h-[100dvh] w-full flex-col justify-between overflow-hidden overscroll-none bg-[#1a1715]">
      <img
        src={sfitWallDesktop}
        alt="SFIT Campus Seal"
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-center md:block"
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#1a1715] md:hidden">
        <img
          src={sfitWallMobile}
          alt="SFIT Campus Seal"
          className="absolute inset-0 h-full w-full object-cover object-[center_top]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/50" />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-8 sm:pb-8 sm:pt-10 md:justify-center md:px-16 md:py-12 lg:pl-24 xl:pl-32">
        <div className="mt-[38svh] flex w-full max-w-[240px] flex-col items-start text-left min-[375px]:mt-[36svh] min-[375px]:max-w-[260px] min-[430px]:mt-[38svh] sm:mt-[24svh] sm:max-w-[300px] md:my-auto md:mt-auto md:max-w-md">
          <h1 className="font-display text-2xl font-semibold leading-[1.18] tracking-tight text-neutral-950 min-[375px]:text-3xl min-[375px]:leading-[1.15] sm:text-4xl md:text-5xl">
            Sign in to{" "}
            <span className="block bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-600 bg-clip-text text-transparent md:inline">
              CampusFind
            </span>
          </h1>

          <p className="mt-3.5 max-w-[245px] text-left text-[13px] leading-relaxed text-neutral-700 min-[375px]:max-w-[300px] min-[375px]:text-[14px] sm:max-w-[290px] sm:text-[15px] md:max-w-md">
            Use your official <span className="font-semibold text-neutral-900">@student.sfit.ac.in</span> or <span className="font-semibold text-neutral-900">@sfit.ac.in</span> Google account to report, search, and claim lost items.
          </p>

          <div className="mt-5 w-full min-w-[210px] max-w-[245px] sm:mt-6 sm:max-w-[265px] md:max-w-[280px]">
            {useGis ? (
              <>
                <div
                  ref={buttonRef}
                  className={connecting ? "pointer-events-none opacity-60" : ""}
                  aria-busy={connecting}
                />
                {connecting && <p className="mt-2 text-[12px] text-neutral-600">Signing in…</p>}
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-full border border-neutral-300/80 bg-white/95 px-4 text-[13.5px] font-semibold text-neutral-800 shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-950 active:scale-[0.99] sm:h-12 sm:text-[14px]"
                onClick={async () => {
                  setConnecting(true);
                  const { error } = await signInWithGoogle();
                  if (error) {
                    setConnecting(false);
                    toast.error(error.message);
                  }
                }}
                disabled={connecting || loading}
              >
                <svg className="mr-2.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>{connecting ? "Connecting…" : "Continue with Google"}</span>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-auto w-full pt-3 text-left md:max-w-md">
          <p className="whitespace-nowrap text-[10px] font-medium leading-none tracking-[-0.02em] text-[#D8D0C4] min-[360px]:text-[11px] sm:text-[12px] md:whitespace-normal md:text-[13px] md:leading-relaxed md:tracking-normal md:text-neutral-600">
            By continuing you agree to the{" "}
            <Link to="/terms" className="font-semibold text-[#D8D0C4] underline underline-offset-2 md:text-neutral-900 md:no-underline md:underline-offset-4 md:hover:underline">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="font-semibold text-[#D8D0C4] underline underline-offset-2 md:text-neutral-900 md:no-underline md:underline-offset-4 md:hover:underline">Privacy Policy.</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
