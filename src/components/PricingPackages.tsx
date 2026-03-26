
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Check, Crown, Zap, Rocket, Star, Loader2 } from "lucide-react";

interface DBPackage {
  id: string;
  name_en: string;
  name_tr: string;
  package_type: string;
  quota_tier: string | null;
  price_cents: number;
  original_price_cents: number | null;
  discounted_price_cents: number | null;
  discount_percentage: number | null;
  currency: string;
  features: { en: string[]; tr: string[] } | null;
  display_order: number;
  is_featured: boolean;
  stripe_price_id: string | null;
}

function getIcon(quotaTier: string | null) {
  switch (quotaTier) {
    case "plus_yearly":
      return <Crown className="w-8 h-8 text-[#f59e0b]" />;
    case "plus_monthly":
      return <Star className="w-8 h-8 text-[#a855f7]" />;
    case "starter":
      return <Rocket className="w-8 h-8 text-[#6366f1]" />;
    case "weekly":
      return <Zap className="w-8 h-8 text-[#6366f1]" />;
    default:
      return <Zap className="w-8 h-8 text-[#6366f1]" />;
  }
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

interface PlusPackageCardProps {
  packages: DBPackage[];
  language: string;
  onCheckout: (pkg: DBPackage) => void;
  loadingId: string | null;
}

function PlusPackageCard({ packages, language, onCheckout, loadingId }: PlusPackageCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"monthly" | "yearly">("monthly");

  const monthlyPkg = packages.find((p) => p.package_type === "monthly");
  const yearlyPkg = packages.find((p) => p.package_type === "yearly");
  const currentPkg = selectedPeriod === "monthly" ? monthlyPkg : yearlyPkg;

  if (!currentPkg) return null;

  const features: string[] =
    currentPkg.features?.[language as "en" | "tr"] ||
    currentPkg.features?.en ||
    [];

  const isLoading = loadingId === currentPkg.id;
  const hasDiscount =
    (currentPkg.discount_percentage ?? 0) > 0 &&
    currentPkg.original_price_cents != null &&
    currentPkg.discounted_price_cents != null;

  return (
    <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#1a1a1a] border-2 border-[#a855f7]/50 rounded-2xl p-4 md:p-5 lg:p-6 hover:border-[#a855f7] transition-all duration-300 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] group">
      {/* Popular badge */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#a855f7] to-[#6366f1] text-white px-4 py-1 rounded-full text-xs md:text-sm font-bold whitespace-nowrap">
        ⭐ {language === "tr" ? "En Popüler" : "Most Popular"}
      </div>

      {/* Icon */}
      <div className="mb-3 flex justify-center">
        <Crown className="w-8 h-8 md:w-9 md:h-9 text-[#a855f7]" />
      </div>

      {/* Title */}
      <h3 className="text-lg md:text-xl font-bold text-white text-center mb-3">Plus</h3>

      {/* Period toggle */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => setSelectedPeriod("monthly")}
          className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            selectedPeriod === "monthly"
              ? "bg-[#a855f7] text-white"
              : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1]"
          }`}
        >
          {language === "tr" ? "Aylık" : "Monthly"}
        </button>
        <button
          onClick={() => setSelectedPeriod("yearly")}
          className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            selectedPeriod === "yearly"
              ? "bg-[#a855f7] text-white"
              : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1]"
          }`}
        >
          {language === "tr" ? "Yıllık" : "Yearly"}
          {yearlyPkg && (yearlyPkg.discount_percentage ?? 0) > 0 && (
            <span className="ml-1.5 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">
              -{yearlyPkg.discount_percentage}%
            </span>
          )}
        </button>
      </div>

      {/* Pricing */}
      <div className="text-center mb-4">
        {hasDiscount ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs md:text-sm text-white/40 line-through">
              ${formatPrice(currentPkg.original_price_cents!)}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-bold text-white">
                ${formatPrice(currentPkg.discounted_price_cents!)}
              </span>
            </div>
            <span className="inline-block bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
              {currentPkg.discount_percentage}% OFF
            </span>
          </div>
        ) : (
          <span className="text-3xl md:text-4xl font-bold text-white">
            ${formatPrice(currentPkg.price_cents)}
          </span>
        )}
        <div className="text-white/50 text-sm mt-1 capitalize">
          {selectedPeriod === "monthly"
            ? language === "tr"
              ? "aylık"
              : "per month"
            : language === "tr"
            ? "yıllık"
            : "per year"}
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-4">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-white/80">
            <span className="text-[#a855f7] mt-0.5 flex-shrink-0">
              <Check className="w-4 h-4" />
            </span>
            <span className="text-xs md:text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={() => onCheckout(currentPkg)}
        disabled={isLoading || loadingId !== null}
        className="w-full bg-gradient-to-r from-[#a855f7] to-[#6366f1] text-white font-bold py-2.5 px-5 rounded-xl hover:opacity-90 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{language === "tr" ? "Yönlendiriliyor..." : "Redirecting..."}</span>
          </>
        ) : (
          `${language === "tr" ? "Plus Seç" : "Select Plus"} ${
            selectedPeriod === "monthly"
              ? language === "tr"
                ? "Aylık"
                : "Monthly"
              : language === "tr"
              ? "Yıllık"
              : "Yearly"
          }`
        )}
      </button>
    </div>
  );
}

interface RegularPackageCardProps {
  pkg: DBPackage;
  language: string;
  onCheckout: (pkg: DBPackage) => void;
  loadingId: string | null;
  isFree?: boolean;
}

function RegularPackageCard({
  pkg,
  language,
  onCheckout,
  loadingId,
  isFree,
}: RegularPackageCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isLoading = loadingId === pkg.id;

  const features: string[] =
    pkg.features?.[language as "en" | "tr"] || pkg.features?.en || [];

  const hasDiscount =
    (pkg.discount_percentage ?? 0) > 0 &&
    pkg.original_price_cents != null &&
    pkg.discounted_price_cents != null;

  const handleFreeClick = () => {
    if (user) {
      router.push("/panel");
    } else {
      router.push("/register");
    }
  };

  return (
    <div
      className={`relative bg-[#1a1a1a] border rounded-2xl p-4 md:p-5 lg:p-6 hover:border-[#6366f1]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] group ${
        pkg.is_featured
          ? "border-[#6366f1]/40"
          : "border-white/[0.08]"
      }`}
    >
      {pkg.is_featured && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white px-3.5 py-1 rounded-full text-xs md:text-sm font-bold whitespace-nowrap">
          {language === "tr" ? "Önerilen" : "Recommended"}
        </div>
      )}

      {/* Icon */}
      <div className="mb-3 flex justify-center">{getIcon(pkg.quota_tier)}</div>

      {/* Name */}
      <h3 className="text-lg md:text-xl font-bold text-white text-center mb-3">
        {language === "tr" ? pkg.name_tr : pkg.name_en}
      </h3>

      {/* Pricing */}
      <div className="text-center mb-4">
        {isFree ? (
          <span className="text-4xl font-bold text-white">
            {language === "tr" ? "Ücretsiz" : "Free"}
          </span>
        ) : hasDiscount ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs md:text-sm text-white/40 line-through">
              ${formatPrice(pkg.original_price_cents!)}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-bold text-white">
                ${formatPrice(pkg.discounted_price_cents!)}
              </span>
            </div>
            <span className="inline-block bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
              {pkg.discount_percentage}% OFF
            </span>
          </div>
        ) : (
          <span className="text-3xl md:text-4xl font-bold text-white">
            ${formatPrice(pkg.price_cents)}
          </span>
        )}
        {!isFree && (
          <div className="text-white/50 text-sm mt-1 capitalize">
            {pkg.package_type === "weekly"
              ? language === "tr"
                ? "haftalık"
                : "per week"
              : pkg.package_type === "monthly"
              ? language === "tr"
                ? "aylık"
                : "per month"
              : language === "tr"
              ? "günlük"
              : "per day"}
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-4">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-white/80">
            <span className="text-[#6366f1] mt-0.5 flex-shrink-0">
              <Check className="w-4 h-4" />
            </span>
            <span className="text-xs md:text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isFree ? (
        <button
          onClick={handleFreeClick}
          className="w-full bg-white/[0.05] border border-white/[0.15] text-white font-bold py-2.5 px-5 rounded-xl hover:bg-white/[0.1] transition-all duration-300 flex items-center justify-center gap-2 text-sm"
        >
          {language === "tr" ? "Başla" : "Get Started"}
        </button>
      ) : (
        <button
          onClick={() => onCheckout(pkg)}
          disabled={isLoading || loadingId !== null}
          className="w-full bg-[#1a1a1a] border-2 border-[#6366f1] text-white font-bold py-2.5 px-5 rounded-xl hover:bg-gradient-to-r hover:from-[#6366f1] hover:to-[#a855f7] hover:border-transparent transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{language === "tr" ? "Yönlendiriliyor..." : "Redirecting..."}</span>
            </>
          ) : (
            `${language === "tr" ? "Seç" : "Select"} ${language === "tr" ? pkg.name_tr : pkg.name_en}`
          )}
        </button>
      )}
    </div>
  );
}

export function PricingPackages() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [packages, setPackages] = useState<DBPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPackages() {
      const { data } = await supabase
        .from("packages")
        .select(
          "id, name_en, name_tr, package_type, quota_tier, price_cents, original_price_cents, discounted_price_cents, discount_percentage, currency, features, display_order, is_featured, stripe_price_id"
        )
        .eq("is_active", true)
        .order("display_order");

      if (data) setPackages(data as DBPackage[]);
      setLoading(false);
    }
    fetchPackages();
  }, []);

  const handleCheckout = useCallback(async (pkg: DBPackage) => {
    setErrorMsg(null);

    if (!user?.email) {
      setErrorMsg(
        language === "tr"
          ? "Paket satin almak icin once giris yapmalisiniz."
          : "You need to be logged in before purchasing a package."
      );
      return;
    }

    setLoadingId(pkg.id);
    try {
      const amountCents =
        (pkg.discount_percentage ?? 0) > 0 && pkg.discounted_price_cents != null
          ? pkg.discounted_price_cents
          : pkg.price_cents;

      const response = await fetch("/next_api/paypal/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          packageName: language === "tr" ? pkg.name_tr : pkg.name_en,
          amountCents,
          currency: pkg.currency,
          billingCycle: pkg.package_type,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("[PricingPackages] checkout error:", err);
      setErrorMsg(
        err?.message ||
          (language === "tr"
            ? "Ödeme sayfası açılamadı. Lütfen tekrar deneyin."
            : "Payment page could not be opened. Please try again.")
      );
      setLoadingId(null);
    }
  }, [language, user]);

  const freePackages = packages.filter((p) => p.quota_tier === "free");
  const plusPackages = packages.filter(
    (p) => p.quota_tier === "plus_monthly" || p.quota_tier === "plus_yearly"
  );
  const regularPackages = packages.filter(
    (p) =>
      p.quota_tier !== "free" &&
      p.quota_tier !== "plus_monthly" &&
      p.quota_tier !== "plus_yearly"
  );

  return (
    <section className="w-full py-16 px-4 bg-[#0f0f0f]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {language === "tr" ? "Planınızı Seçin" : "Choose Your Perfect Plan"}
          </h2>
          <p className="text-lg text-white/70 mb-4">
            {language === "tr"
              ? "Tüm paketlerde %25 indirim fırsatını kaçırmayın!"
              : "Don't miss 25% off on all packages!"}
          </p>
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-full text-sm font-semibold">
            🎉 {language === "tr" ? "Sınırlı Süre Kampanyası" : "Limited Time Offer"}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-6 max-w-xl mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
            {errorMsg}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#6366f1] animate-spin" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center text-white/50 py-12">
            {language === "tr"
              ? "Şu anda mevcut paket yok."
              : "No packages available at this time."}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Free + Regular packages grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6 max-w-5xl mx-auto">
              {freePackages.map((pkg) => (
                <RegularPackageCard
                  key={pkg.id}
                  pkg={pkg}
                  language={language}
                  onCheckout={handleCheckout}
                  loadingId={loadingId}
                  isFree
                />
              ))}
              {regularPackages.map((pkg) => (
                <RegularPackageCard
                  key={pkg.id}
                  pkg={pkg}
                  language={language}
                  onCheckout={handleCheckout}
                  loadingId={loadingId}
                />
              ))}
              {/* Plus card in grid for tablet, hidden for desktop */}
              {plusPackages.length > 0 && (
                <div className="md:block lg:hidden">
                  <PlusPackageCard
                    packages={plusPackages}
                    language={language}
                    onCheckout={handleCheckout}
                    loadingId={loadingId}
                  />
                </div>
              )}
            </div>

            {/* Plus card centered alone for desktop only */}
            {plusPackages.length > 0 && (
              <div className="hidden lg:flex justify-center">
                <div className="max-w-md">
                  <PlusPackageCard
                    packages={plusPackages}
                    language={language}
                    onCheckout={handleCheckout}
                    loadingId={loadingId}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Money back guarantee */}
        <div className="text-center mt-10">
          <p className="text-white text-base md:text-lg font-semibold">
            {language === "tr"
              ? "💯 100% Para İade Garantisi"
              : "💯 100% Money Back Guarantee"}
          </p>
          <p className="text-white/50 text-sm mt-2">
            {language === "tr"
              ? "Tüm paketler güvenli ödeme işlemi ve anında aktivasyon içerir"
              : "All packages include secure payment processing and instant activation"}
          </p>
        </div>
      </div>
    </section>
  );
}
