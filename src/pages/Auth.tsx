import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SFIT_EMAIL_HINT } from "@/lib/email";
import sfitWallDesktop from "@/assets/d9221461-f3da-4f50-8326-698ebb38de05.png";
import sfitWallMobile from "@/assets/cbb7185f-4f7c-48bb-9232-76a55d611a30.png";

export default function Auth() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    let errorMsg = "";

    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const errorDesc = params.get("error_description");
      if (errorDesc) errorMsg = errorDesc;
    }

    if (!errorMsg && search) {
      const params = new URLSearchParams(search);
      const errorDesc = params.get("error_description");
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
  }, []);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSignIn = async () => {
    setConnecting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setConnecting(false);
      toast.error(error.message);
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col justify-between overflow-hidden overscroll-none bg-[#1a1715]">
      {/* Laptop / Desktop Full-Bleed Background (16:9 Composition) */}
      <img
        src={sfitWallDesktop}
        alt="SFIT Campus Seal"
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-center md:block"
      />

      {/* Mobile Continuous Photographic Background (Framed tightly to top-right corner, locked against zoom & scroll) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#1a1715] md:hidden">
        <img
          src={sfitWallMobile}
          alt="SFIT Campus Seal"
          className="absolute inset-0 h-full w-full object-cover object-[center_top]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/50" />
      </div>

      {/* Login UI Overlay (Positioned in the open stone wall space below the emblem) */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.25rem+env(safe-area-inset-top,0px))] sm:px-8 sm:pb-8 sm:pt-16 md:justify-center md:px-16 md:py-12 lg:pl-24 xl:pl-32">
        {/* Login Group: Left-aligned across all mobile sizes with stacked heading above description */}
        <div className="mt-auto mb-10 sm:mb-14 md:my-auto md:mt-auto md:mb-auto flex flex-col items-start text-left w-full max-w-[260px] xs:max-w-[280px] min-[375px]:max-w-[320px] md:max-w-md">
          {/* Heading: "CampusFind" drops to second line on mobile (320px, 375px, 425px), inline on desktop */}
          <h1 className="font-display text-2xl min-[375px]:text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-neutral-950 leading-[1.18] min-[375px]:leading-[1.15]">
            Sign in to{" "}
            <span className="block md:inline bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-600 bg-clip-text text-transparent">
              CampusFind
            </span>
          </h1>

          {/* Description */}
          <p className="mt-3.5 max-w-[245px] sm:max-w-[290px] min-[375px]:max-w-[300px] md:max-w-md text-[13px] min-[375px]:text-[14px] leading-relaxed text-neutral-700 sm:text-[15px] md:text-[15px] text-left">
            Use your official <span className="font-semibold text-neutral-900">@student.sfit.ac.in</span> or <span className="font-semibold text-neutral-900">@sfit.ac.in</span> Google account to report, search, and claim lost items.
          </p>

          {/* Focused Standalone Google Sign-in Button */}
          <div className="mt-6 sm:mt-7 w-full flex justify-start">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-12 w-full min-w-[210px] max-w-[245px] sm:max-w-[265px] md:max-w-[280px] rounded-full border border-neutral-300/80 bg-white/95 px-4 text-[13.5px] sm:text-[14px] font-semibold text-neutral-800 shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-950 active:scale-[0.99]"
              onClick={handleGoogleSignIn}
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
          </div>
        </div>

        {/* Bottom-Anchored Footer (Aligned to same left edge) */}
        <div className="pt-4 text-left w-full max-w-[260px] xs:max-w-[280px] min-[375px]:max-w-[320px] md:max-w-md">
          <p className="text-[11.5px] leading-relaxed sm:text-[12px] md:text-[13px] text-neutral-600 font-medium">
            By continuing you agree to the{" "}
            <Link to="/terms" className="font-semibold text-neutral-900 underline-offset-4 hover:underline">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="font-semibold text-neutral-900 underline-offset-4 hover:underline whitespace-nowrap">Privacy Policy.</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
