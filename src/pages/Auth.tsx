import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { createGoogleNonce, GOOGLE_CLIENT_ID, loadGoogleIdentity } from "@/lib/google-gis";
import sfitWallDesktop from "@/assets/c4829165-9c96-4a52-8797-85b58329b445.png";
import sfitWallMobile from "@/assets/940888dc-e740-4516-a100-3e2a57cbe46b.png";

export default function Auth() {
  const { user, loading, signInWithGoogle, signInWithGoogleIdToken } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const desktopButtonRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef("");
  const useGis = Boolean(GOOGLE_CLIENT_ID);

  useEffect(() => {
    if (loading || user) return;

    let cancelled = false;

    const mountGoogle = async () => {
      if (!GOOGLE_CLIENT_ID) return;

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

        const renderGis = (target: HTMLElement, customWidth?: number) => {
          target.innerHTML = "";
          const width = customWidth || Math.min(280, Math.max(210, Math.floor(target.getBoundingClientRect().width) || 245));
          gis.renderButton(target, {
            theme: "outline",
            size: "large",
            shape: "rectangular",
            text: "signin_with",
            width,
            logo_alignment: "left",
          });
        };

        if (desktopButtonRef.current) renderGis(desktopButtonRef.current);
        if (mobileButtonRef.current) renderGis(mobileButtonRef.current, 240);
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
      {/* Desktop background */}
      <img
        src={sfitWallDesktop}
        alt="SFIT Campus Seal"
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-center md:block"
      />

      {/* Mobile: Photorealistic architectural artwork with seamless tactile interactive hotspots */}
      <div className="relative h-full w-full overflow-hidden bg-[#dcd7ce] md:hidden">
        {/* The 9:16 canvas that locks image and hotspots together 1:1 across all mobile screens */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
          style={{
            width: "max(100%, calc(100vh * 9 / 16))",
            height: "max(100%, calc(100vw * 16 / 9))",
            aspectRatio: "9/16",
          }}
        >
          {/* Photorealistic 3D rendered wall artwork */}
          <img
            src={sfitWallMobile}
            alt="CampusFind Login"
            className="pointer-events-none h-full w-full object-cover select-none"
          />

          {/* Accessible Screen-Reader text for SEO and assistive technologies */}
          <div className="sr-only">
            <h1>Sign in to CampusFind</h1>
            <p>Use your official @student.sfit.ac.in or @sfit.ac.in Google account to report, search, and claim lost items.</p>
          </div>

          {/* Tactile Button Hotspot directly over the rendered 'Sign in with Google' button in the image */}
          <button
            type="button"
            onClick={async () => {
              setConnecting(true);
              const { error } = await signInWithGoogle();
              if (error) {
                setConnecting(false);
                toast.error(error.message);
              }
            }}
            disabled={connecting || loading}
            aria-label="Sign in with Google"
            className="group absolute cursor-pointer rounded-[14px] transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            style={{
              top: "58.5%",
              left: "8.8%",
              width: "44.0%",
              height: "5.0%",
            }}
          >
            {/* Tactile hover sheen & press feedback directly over the image button */}
            <div className="absolute inset-0 rounded-[14px] bg-black/0 transition-colors duration-150 group-hover:bg-black/[0.04] group-active:bg-black/[0.08]" />
            <div className="absolute inset-0 rounded-[14px] ring-1 ring-white/0 transition-all duration-200 group-hover:ring-white/50 group-hover:shadow-[0_0_12px_rgba(255,255,255,0.35)]" />

            {useGis && (
              <div
                ref={mobileButtonRef}
                className="pointer-events-auto absolute inset-0 opacity-[0.01] overflow-hidden [&>div]:!h-full [&>div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full"
              />
            )}

            {connecting && (
              <div className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-white/70 backdrop-blur-[2px]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-800 border-t-transparent" />
              </div>
            )}
          </button>

          {/* Transparent interactive hotspot for 'Terms' link */}
          <Link
            to="/terms"
            aria-label="Terms of Service"
            className="absolute rounded transition-colors hover:bg-black/[0.06] active:bg-black/[0.1] before:absolute before:-inset-2 before:content-['']"
            style={{
              top: "66.0%",
              left: "38.5%",
              width: "7.2%",
              height: "2.0%",
            }}
          />

          {/* Transparent interactive hotspot for 'Privacy Policy' link */}
          <Link
            to="/privacy"
            aria-label="Privacy Policy"
            className="absolute rounded transition-colors hover:bg-black/[0.06] active:bg-black/[0.1] before:absolute before:-inset-2 before:content-['']"
            style={{
              top: "67.8%",
              left: "12.8%",
              width: "15.0%",
              height: "2.0%",
            }}
          />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="relative z-10 hidden h-full w-full flex-col px-16 py-12 md:flex md:justify-center lg:pl-24 xl:pl-32">
        <div className="my-auto flex w-full max-w-[440px] flex-col items-start text-left">
          <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-[-0.03em] text-neutral-950">
            Sign in to{" "}
            <span className="inline text-neutral-950">
              CampusFind
            </span>
          </h1>

          <p className="mt-4 max-w-[420px] text-left text-[15px] leading-normal text-neutral-800">
            Use your official <span className="font-semibold text-neutral-950">@student.sfit.ac.in</span> or <span className="font-semibold text-neutral-950">@sfit.ac.in</span> Google account to report, search, and claim lost items.
          </p>

          <div className="mt-7 w-full max-w-[270px]">
            {useGis ? (
              <>
                <div
                  ref={desktopButtonRef}
                  className={connecting ? "pointer-events-none opacity-60" : ""}
                  aria-busy={connecting}
                />
                {connecting && <p className="mt-2 text-[12px] text-neutral-600">Signing in…</p>}
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-full border border-neutral-300/80 bg-white/95 px-5 text-[14.5px] font-medium tracking-tight text-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:bg-white hover:border-neutral-400/80 hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)] active:scale-[0.985]"
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
                <svg className="mr-3 h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>{connecting ? "Connecting…" : "Sign in with Google"}</span>
              </Button>
            )}
          </div>

          <p className="mt-6 max-w-sm text-left text-[12.5px] leading-relaxed text-neutral-600">
            By continuing you agree to the{" "}
            <Link to="/terms" className="font-medium text-neutral-900 underline underline-offset-4 hover:text-black">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="font-medium text-neutral-900 underline underline-offset-4 hover:text-black">Privacy Policy.</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
