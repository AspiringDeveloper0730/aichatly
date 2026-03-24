"use client";

import { useEffect } from "react";

export default function PopupCallbackPage() {
  useEffect(() => {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "google-oauth-success" },
          window.location.origin
        );
      }
    } catch (error) {
      // Ignore cross-window messaging issues; fallback below still attempts close.
      console.warn("[OAuth Popup] postMessage warning:", error);
    } finally {
      setTimeout(() => {
        window.close();
      }, 150);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <p className="text-sm text-muted-foreground">Signing you in, please wait...</p>
    </div>
  );
}
