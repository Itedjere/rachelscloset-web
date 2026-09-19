import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

/** What the browser will let us do, and what has already been agreed. */
export type PushState =
  | "unsupported"
  | "needs-install"
  | "unconfigured"
  | "default"
  | "granted"
  | "denied";

interface Config {
  data: { push: { enabled: boolean; public_key: string | null } };
}

/**
 * The push service expects the key as bytes, not the base64url it travels as.
 *
 * Backed by an explicit ArrayBuffer: `applicationServerKey` will not accept a
 * view that might sit on a SharedArrayBuffer, which is what a bare
 * `new Uint8Array(length)` is typed as.
 */
function decodeKey(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));

  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

  return bytes;
}

/** iOS only allows web push once the site has been added to the Home Screen. */
function isIosWithoutInstall(): boolean {
  const ua = navigator.userAgent;

  if (!/iPhone|iPad|iPod/.test(ua)) return false;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag, which is not in the standard.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return !standalone;
}

/**
 * Alerts on this device.
 *
 * Three things have to be true before one can arrive: the browser supports
 * service workers and push, the server has VAPID keys, and the person has said
 * yes. Each is reported separately so the settings page can say which is
 * missing rather than showing a button that does nothing -- which on a cheap
 * Android with an old Chrome is a real possibility, not a corner case.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>("unsupported");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!supported) {
        setState(isIosWithoutInstall() ? "needs-install" : "unsupported");
        return;
      }

      try {
        const config = await api.get<Config>("/config");
        if (cancelled) return;

        setPublicKey(config.data.push.public_key);

        if (!config.data.push.enabled || !config.data.push.public_key) {
          setState("unconfigured");
          return;
        }

        setState(Notification.permission as PushState);
      } catch {
        if (!cancelled) setState("unconfigured");
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!publicKey) return;

    setBusy(true);
    setProblem(null);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState(permission as PushState);
        // Not an error: saying no is an answer, and the copy explains what it
        // means rather than treating it as a failure.
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();

      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          // Required by every browser: a push that shows nothing is not allowed.
          userVisibleOnly: true,
          applicationServerKey: decodeKey(publicKey),
        }));

      await api.post("/push/subscriptions", subscription.toJSON());

      setState("granted");
    } catch (error: unknown) {
      setProblem(
        error instanceof Error ? error.message : "This device could not be set up for alerts.",
      );
    } finally {
      setBusy(false);
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    setProblem(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await api.delete(
          `/push/subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`,
        );
        await subscription.unsubscribe();
      }

      // The browser keeps the permission; this device simply stops being sent to.
      setState("default");
    } catch (error: unknown) {
      setProblem(error instanceof Error ? error.message : "Could not turn alerts off.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, problem, enable, disable };
}
