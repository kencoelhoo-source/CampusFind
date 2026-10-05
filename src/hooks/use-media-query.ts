import { useCallback, useSyncExternalStore } from "react";

/**
 * Live `matchMedia` result. Unlike `useIsMobile`, it's correct on the very first render, so a
 * component that renders different trees per breakpoint never flashes the wrong one.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phones: below Tailwind's `md` breakpoint. */
export const PHONE_QUERY = "(max-width: 767px)";
