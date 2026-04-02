
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Package,
  CalendarDays,
  Crown,
  Zap,
  Sparkles,
  ExternalLink,
  Loader2,
  Receipt,
  Star,
  Gift,
} from "lucide-react";
import { useUserQuota } from "@/hooks/useUserQuota";
import { QuotaBoxes } from "@/components/panel/QuotaBoxes";

interface ActivePlan {
  id: string;
  plan_name: string;
  status: string;
  current_period_end: string | null;
  package_tier: string;
}

interface PurchaseRecord {
  id: string;
  package_id: string;
  amount_paid_cents: number;
  currency: string;
  is_refunded: boolean;
  purchased_at: string;
  package_name?: string;
  package_type?: string;
}

interface PackageInfo {
  id: string;
  name_en: string;
  package_type: string;
}

interface UpgradePackage {
  id: string;
  name: string;
  amountCents: number;
  discountedCents: number | null;
  discountPct: number | null;
  currency: string;
  billingCycle: string;
  variantId: string | null;
}

const TIER_NAME_MAP: Record<string, { en: string; tr: string }> = {
  free: { en: "Free", tr: "Ücretsiz" },
  weekly: { en: "Weekly", tr: "Haftalık" },
  starter: { en: "Starter", tr: "Başlangıç" },
  plus_monthly: { en: "Plus Monthly", tr: "Plus Aylık" },
  plus_yearly: { en: "Plus Yearly", tr: "Plus Yıllık" },
};

function getPlanIcon(tier: string) {
  if (tier === "plus_yearly" || tier === "plus_monthly") return Crown;
  if (tier === "starter") return Sparkles;
  if (tier === "weekly") return Star;
  return Zap;
}

function formatDate(dateStr: string | null, language: string): string {
  if (!dateStr) return language === "tr" ? "Belirsiz" : "N/A";
  return new Date(dateStr).toLocaleDateString(
    language === "tr" ? "tr-TR" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );
}

export function PackageDetailsSection() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [upgradePackage, setUpgradePackage] = useState<UpgradePackage | null>(null);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { quota, loading: quotaLoading, fetchQuota } = useUserQuota(user?.id);

  const fetchActivePlan = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: quotaData } = await supabase
        .from("user_quotas")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (quotaData) {
        const tierNames = TIER_NAME_MAP[quotaData.package_tier] ?? {
          en: "Unknown",
          tr: "Bilinmiyor",
        };
        setActivePlan({
          id: quotaData.id,
          plan_name: language === "tr" ? tierNames.tr : tierNames.en,
          status: "active",
          current_period_end: quotaData.period_end,
          package_tier: quotaData.package_tier,
        });
      } else {
        setActivePlan(null);
      }
    } catch (error) {
      console.error("[PackageDetailsSection] fetchActivePlan error:", error);
    } finally {
      setLoading(false);
    }
  }, [user, language]);

  const fetchUpgradePackage = useCallback(async () => {
    const { data } = await supabase
      .from("packages")
      .select(
        "id, name_en, name_tr, price_cents, discounted_price_cents, discount_percentage, currency, package_type, stripe_price_id"
      )
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("display_order")
      .limit(1);

    if (data && data.length > 0) {
      const pkg = data[0];
      setUpgradePackage({
        id: pkg.id,
        name: language === "tr" ? pkg.name_tr : pkg.name_en,
        amountCents: pkg.price_cents,
        discountedCents: pkg.discounted_price_cents ?? null,
        discountPct: pkg.discount_percentage ?? null,
        currency: pkg.currency,
        billingCycle: pkg.package_type,
        variantId: pkg.stripe_price_id ?? null,
      });
    }
  }, [language]);

  const fetchPurchases = useCallback(async () => {
    if (!user) return;
    const { data: purchaseData } = await supabase
      .from("package_purchases")
      .select("id, package_id, amount_paid_cents, currency, is_refunded, purchased_at")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false })
      .limit(20);

    if (!purchaseData || purchaseData.length === 0) return;

    const packageIds = [
      ...new Set(purchaseData.map((p) => p.package_id).filter(Boolean)),
    ];
    let pkgMap: Record<string, PackageInfo> = {};
    if (packageIds.length > 0) {
      const { data: pkgData } = await supabase
        .from("packages")
        .select("id, name_en, package_type")
        .in("id", packageIds);
      if (pkgData) {
        pkgMap = Object.fromEntries(pkgData.map((p) => [p.id, p]));
      }
    }

    setPurchases(
      purchaseData.map((p) => ({
        ...p,
        package_name: pkgMap[p.package_id]?.name_en,
        package_type: pkgMap[p.package_id]?.package_type,
      }))
    );
  }, [user]);

  useEffect(() => {
    fetchActivePlan();
    fetchPurchases();
    fetchUpgradePackage();
  }, [fetchActivePlan, fetchPurchases, fetchUpgradePackage]);

  useEffect(() => {
    const handleQuotaEvent = () => fetchQuota();
    window.addEventListener("smsUsed", handleQuotaEvent);
    window.addEventListener("characterCreated", handleQuotaEvent);
    window.addEventListener("fileUploaded", handleQuotaEvent);
    return () => {
      window.removeEventListener("smsUsed", handleQuotaEvent);
      window.removeEventListener("characterCreated", handleQuotaEvent);
      window.removeEventListener("fileUploaded", handleQuotaEvent);
    };
  }, [fetchQuota]);

  const handleUpgradeClick = async () => {
    if (!upgradePackage) return;
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const amountCents =
        (upgradePackage.discountPct ?? 0) > 0 && upgradePackage.discountedCents != null
          ? upgradePackage.discountedCents
          : upgradePackage.amountCents;

      const response = await fetch("/next_api/lemonsqueezy/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: upgradePackage.id,
          packageName: upgradePackage.name,
          amountCents,
          currency: upgradePackage.currency,
          billingCycle: upgradePackage.billingCycle,
          variantId: upgradePackage.variantId,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error(data.error || "Failed to open payment page");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("[PackageDetailsSection] checkout error:", err);
      setCheckoutError(
        err?.message ||
          (language === "tr"
            ? "Ödeme sayfası açılamadı. Lütfen tekrar deneyin."
            : "Payment page could not be opened. Please try again.")
      );
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#1a1a1a] border-white/[0.08] p-8">
        <div className="text-center text-white">
          {language === "tr" ? "Yükleniyor..." : "Loading..."}
        </div>
      </Card>
    );
  }

  const PlanIcon = activePlan ? getPlanIcon(activePlan.package_tier) : Package;
  const tierNames = activePlan
    ? TIER_NAME_MAP[activePlan.package_tier] ?? { en: "Unknown", tr: "Bilinmiyor" }
    : null;

  return (
    <Card className="bg-[#1a1a1a] border-white/[0.08] p-6 md:p-8">
      <h2 className="text-2xl font-bold text-white mb-6">
        {language === "tr" ? "Paket Detayları" : "Package Details"}
      </h2>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: Active Package Card */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="h-full p-6 bg-gradient-to-br from-[#6366f1]/10 to-[#a855f7]/10 border border-[#6366f1]/20 rounded-xl flex flex-col gap-4">
            {/* Icon + Plan Name */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center flex-shrink-0">
                <PlanIcon className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#999999] uppercase tracking-wider mb-0.5">
                  {language === "tr" ? "Aktif Paket" : "Active Package"}
                </p>
                <h3 className="text-xl font-bold text-white truncate">
                  {activePlan
                    ? language === "tr"
                      ? tierNames?.tr
                      : tierNames?.en
                    : language === "tr"
                    ? "Ücretsiz Plan"
                    : "Free Plan"}
                </h3>
              </div>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border text-green-400 bg-green-400/10 border-green-400/20">
                {language === "tr" ? "Aktif" : "Active"}
              </span>
            </div>

            {/* Period end */}
            {activePlan?.current_period_end && (
              <div className="flex items-center gap-2 text-sm text-[#999999]">
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                <span>
                  {language === "tr" ? "Bitiş:" : "Expires:"}{" "}
                  {formatDate(activePlan.current_period_end, language)}
                </span>
              </div>
            )}

            {/* Free plan note */}
            {(!activePlan || activePlan.package_tier === "free") && (
              <div className="flex items-start gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                <Gift className="w-4 h-4 text-[#6366f1] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#999999]">
                  {language === "tr"
                    ? "Ücretsiz plan — her gün 10 SMS hakkı yenilenir."
                    : "Free plan — 10 SMS credits refresh every day."}
                </p>
              </div>
            )}

            {/* Checkout error */}
            {checkoutError && (
              <p className="text-xs text-red-400 text-center">{checkoutError}</p>
            )}

            {/* Upgrade CTA */}
            <Button
              className="w-full mt-2 bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
              onClick={handleUpgradeClick}
              disabled={checkoutLoading || !upgradePackage}
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === "tr" ? "Yönlendiriliyor..." : "Redirecting..."}
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {activePlan && activePlan.package_tier !== "free"
                    ? language === "tr"
                      ? "Paketi Yükselt"
                      : "Upgrade Package"
                    : language === "tr"
                    ? "Paket Satın Al"
                    : "Buy a Package"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* RIGHT: Quota Boxes */}
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-sm font-semibold text-[#999999] uppercase tracking-wider mb-1">
            {language === "tr" ? "Kullanım Hakları" : "Usage Allowances"}
          </p>
          <QuotaBoxes quota={quota} loading={quotaLoading} />
        </div>
      </div>

      {/* Purchase History */}
      <div className="mt-8 pt-6 border-t border-white/[0.08]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#6366f1]" />
          {language === "tr" ? "Satın Alma Geçmişi" : "Purchase History"}
        </h3>

        {purchases.length === 0 ? (
          <p className="text-sm text-[#666666]">
            {language === "tr"
              ? "Henüz satın alma kaydınız yok."
              : "No purchases yet."}
          </p>
        ) : (
          <div className="space-y-3">
            {purchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-white">
                    {p.package_name ??
                      (language === "tr" ? "Bilinmeyen Paket" : "Unknown Package")}
                  </span>
                  <span className="text-xs text-[#666666] capitalize">
                    {p.package_type ?? ""}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-white">
                    ${(p.amount_paid_cents / 100).toFixed(2)}{" "}
                    <span className="text-xs text-[#999999] uppercase">
                      {p.currency}
                    </span>
                  </span>
                  <span className="text-xs text-[#666666]">
                    {new Date(p.purchased_at).toLocaleDateString(
                      language === "tr" ? "tr-TR" : "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </span>
                  {p.is_refunded && (
                    <span className="text-xs text-red-400 font-semibold">
                      {language === "tr" ? "İade Edildi" : "Refunded"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
