"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

export default function PopupCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Popup flow: notify opener and close this window.
    try {
      if (window.opener && !window.opener.closed) {
        const href = window.location.href;
        const code = new URL(href).searchParams.get("code");
        window.opener.postMessage(
          code
            ? { type: "google-oauth-url", url: href }
            : { type: "google-oauth-success" },
          window.location.origin
        );
      }
    } catch (error) {
      // Ignore cross-window messaging issues; fallback below still attempts close.
      console.warn("[OAuth Popup] postMessage warning:", error);
    } finally {
      if (window.opener && !window.opener.closed) {
        setTimeout(() => {
          window.close();
        }, 150);
      }
    }

    // Main-window PKCE completion flow: explicitly exchange `code` for session
    // before redirecting home, then fallback to a short session poll.
    let cancelled = false;
    const startedAt = Date.now();
    const code = new URL(window.location.href).searchParams.get("code");

    const exchangeCodeInMainWindow = async () => {
      if (!code || (window.opener && !window.opener.closed)) return;
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[OAuth Callback] code exchange error:", error);
      }
    };

    void exchangeCodeInMainWindow();

    const interval = setInterval(async () => {
      if (cancelled || (window.opener && !window.opener.closed)) return;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          clearInterval(interval);
          router.replace("/");
          return;
        }
      } catch {
        // ignore and keep polling briefly
      }

      if (Date.now() - startedAt > 5000) {
        clearInterval(interval);
        router.replace("/");
      }
    }, 250);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <p className="text-sm text-muted-foreground">Signing you in, please wait...</p>
    </div>
  );
}
