"use client";

const GPT_SCRIPT_SRC = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
const DEFAULT_TIMEOUT_MS = 45000;

type RewardedStatus =
  | "completed"
  | "closed_without_reward"
  | "unsupported"
  | "not_available"
  | "timeout";

export interface RewardedAdResult {
  success: boolean;
  status: RewardedStatus;
}

declare global {
  interface Window {
    __rewardedGptScriptPromise?: Promise<void>;
    __rewardedServicesEnabled?: boolean;
    googletag?: any;
  }
}

export function preloadRewardedAdSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.__rewardedGptScriptPromise) return window.__rewardedGptScriptPromise;

  window.__rewardedGptScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GPT_SCRIPT_SRC}"]`);
    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load GPT script")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = GPT_SCRIPT_SRC;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load GPT script"));
    document.head.appendChild(script);
  });

  return window.__rewardedGptScriptPromise;
}

export async function showRewardedAd(adUnitPath: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<RewardedAdResult> {
  if (typeof window === "undefined") {
    return { success: false, status: "unsupported" };
  }

  if (!adUnitPath) {
    return { success: false, status: "unsupported" };
  }

  try {
    await preloadRewardedAdSdk();
  } catch {
    return { success: false, status: "not_available" };
  }

  window.googletag = window.googletag || { cmd: [] };

  return new Promise<RewardedAdResult>((resolve) => {
    let settled = false;
    let cleanupFn: (() => void) | null = null;

    const finalize = (result: RewardedAdResult) => {
      if (settled) return;
      settled = true;
      cleanupFn?.();
      resolve(result);
    };

    const timeoutId = window.setTimeout(() => {
      finalize({ success: false, status: "timeout" });
    }, timeoutMs);

    window.googletag.cmd.push(() => {
      const googletag = window.googletag;
      const outOfPageFormat = googletag?.enums?.OutOfPageFormat?.REWARDED;
      if (!outOfPageFormat) {
        window.clearTimeout(timeoutId);
        finalize({ success: false, status: "unsupported" });
        return;
      }

      const pubads = googletag.pubads();
      const slot = googletag.defineOutOfPageSlot(adUnitPath, outOfPageFormat);
      if (!slot) {
        window.clearTimeout(timeoutId);
        finalize({ success: false, status: "not_available" });
        return;
      }

      slot.addService(pubads);

      let rewarded = false;

      const onReady = (event: any) => {
        if (event.slot !== slot) return;
        event.makeRewardedVisible();
      };

      const onGranted = (event: any) => {
        if (event.slot !== slot) return;
        rewarded = true;
      };

      const onClosed = (event: any) => {
        if (event.slot !== slot) return;
        cleanup();
        finalize({
          success: rewarded,
          status: rewarded ? "completed" : "closed_without_reward",
        });
      };

      const onSlotRenderEnded = (event: any) => {
        if (event.slot !== slot) return;
        if (!event.isEmpty) return;
        cleanup();
        finalize({ success: false, status: "not_available" });
      };

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        pubads.removeEventListener("rewardedSlotReady", onReady);
        pubads.removeEventListener("rewardedSlotGranted", onGranted);
        pubads.removeEventListener("rewardedSlotClosed", onClosed);
        pubads.removeEventListener("slotRenderEnded", onSlotRenderEnded);
        googletag.destroySlots([slot]);
      };
      cleanupFn = cleanup;

      pubads.addEventListener("rewardedSlotReady", onReady);
      pubads.addEventListener("rewardedSlotGranted", onGranted);
      pubads.addEventListener("rewardedSlotClosed", onClosed);
      pubads.addEventListener("slotRenderEnded", onSlotRenderEnded);

      if (!window.__rewardedServicesEnabled) {
        googletag.enableServices();
        window.__rewardedServicesEnabled = true;
      }

      googletag.display(slot);
    });
  });
}
