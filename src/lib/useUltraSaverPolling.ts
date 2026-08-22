import { useEffect, useRef } from "react";

// Visibility-aware polling for Netlify's credit-based plans. Hidden tabs make
// zero requests; visible pages refresh at most once a minute unless a caller
// explicitly opts into a shorter interval for an active job.
export function useUltraSaverPolling(
  callback: () => void | Promise<void>,
  options: { enabled?: boolean; intervalMs?: number; immediate?: boolean } = {},
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const enabled = options.enabled ?? true;
  const intervalMs = Math.max(15_000, options.intervalMs ?? 60_000);
  const immediate = options.immediate ?? true;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (cancelled || document.hidden) return;
      timer = setTimeout(run, intervalMs);
    };
    const run = async () => {
      if (cancelled || document.hidden) return;
      await callbackRef.current();
      schedule();
    };
    const visibility = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (!document.hidden) void run();
    };

    if (immediate && !document.hidden) void run();
    else schedule();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled, immediate, intervalMs]);
}
