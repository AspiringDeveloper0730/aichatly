
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Copy, DollarSign, Users, TrendingUp, Download } from "lucide-react";
import { toast } from "sonner";

export function AffiliateProgramSection() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activePurchases: 0,
    totalEarnings: 0,
    pendingWithdrawal: 0,
  });
  const [earnings, setEarnings] = useState<Array<{ date: string; amount: number; commission: number }>>([]);

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;

    try {
      // Fetch or create referral code
      const { data: referralData } = await supabase
        .from("referrals")
        .select("referral_code, total_earnings_cents")
        .eq("referrer_id", user.id)
        .maybeSingle();

      if (referralData) {
        setReferralCode(referralData.referral_code);
        setStats((prev) => ({ ...prev, totalEarnings: referralData.total_earnings_cents / 100 }));
      } else {
        // Create new referral code
        const newCode = `REF${user.id.substring(0, 8).toUpperCase()}`;
        const { data: newReferral } = await supabase
          .from("referrals")
          .insert({ referrer_id: user.id, referral_code: newCode })
          .select()
          .maybeSingle();

        if (newReferral) {
          setReferralCode(newReferral.referral_code);
        }
      }

      // Fetch referral stats
      const { data: referralsCount } = await supabase
        .from("referrals")
        .select("id", { count: "exact" })
        .eq("referrer_id", user.id);

      const { data: activePurchasesCount } = await supabase
        .from("referrals")
        .select("id", { count: "exact" })
        .eq("referrer_id", user.id)
        .eq("status", "active");

      setStats((prev) => ({
        ...prev,
        totalReferrals: referralsCount?.length || 0,
        activePurchases: activePurchasesCount?.length || 0,
      }));

      // Fetch earnings history
      const { data: earningsData } = await supabase
        .from("referral_earnings")
        .select("*")
        .eq("referral_id", user.id)
        .order("payment_date", { ascending: false })
        .limit(10);

      if (earningsData) {
        setEarnings(
          earningsData.map((e) => ({
            date: new Date(e.payment_date).toLocaleDateString(),
            amount: e.amount_cents / 100,
            commission: parseFloat(e.commission_rate),
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching referral data:", error);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success(language === "tr" ? "Link kopyalandı!" : "Link copied!");
  };

  const handleWithdrawalRequest = async () => {
    if (stats.totalEarnings < 50) {
      toast.error(language === "tr" ? "Minimum çekim tutarı $50" : "Minimum withdrawal amount is $50");
      return;
    }

    try {
      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user?.id,
        amount_cents: stats.totalEarnings * 100,
        status: "pending",
      });

      if (error) throw error;

      toast.success(language === "tr" ? "Çekim talebi oluşturuldu" : "Withdrawal request created");
    } catch (error) {
      toast.error(language === "tr" ? "Talep oluşturulamadı" : "Failed to create request");
    }
  };

  return (
    <Card className="bg-[#1a1a1a] border-white/[0.08] p-8">
      <h2 className="text-2xl font-bold text-white mb-6">
        {language === "tr" ? "Ortaklık Programı" : "Affiliate Program"}
      </h2>

      {/* Referral Link */}
      <div className="mb-8 p-6 bg-gradient-to-r from-[#6366f1]/10 to-[#a855f7]/10 border border-[#6366f1]/20 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">
          {language === "tr" ? "Referans Linkiniz" : "Your Referral Link"}
        </h3>
        <div className="flex gap-2">
          <Input
            value={`${typeof window !== "undefined" ? window.location.origin : ""}?ref=${referralCode}`}
            readOnly
            className="bg-[#2a2a2a] border-white/[0.08] text-white"
          />
          <Button onClick={copyReferralLink} className="bg-gradient-to-r from-[#6366f1] to-[#a855f7]">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-[#999999] mt-2">
          {language === "tr"
            ? "İlk yıl %25, sonrasında ömür boyu %10 komisyon kazanın"
            : "Earn 25% first year, then 10% lifetime commission"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-[#2a2a2a] border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-[#999999]">{language === "tr" ? "Toplam Referans" : "Total Referrals"}</p>
              <p className="text-2xl font-bold text-white">{stats.totalReferrals}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-[#2a2a2a] border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-[#999999]">{language === "tr" ? "Aktif Satın Alma" : "Active Purchases"}</p>
              <p className="text-2xl font-bold text-white">{stats.activePurchases}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-[#2a2a2a] border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-[#999999]">{language === "tr" ? "Toplam Kazanç" : "Total Earnings"}</p>
              <p className="text-2xl font-bold text-white">${stats.totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-[#2a2a2a] border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Download className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-[#999999]">{language === "tr" ? "Çekilebilir" : "Withdrawable"}</p>
              <p className="text-2xl font-bold text-white">${stats.totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Withdrawal Button */}
      <div className="mb-8">
        <Button
          onClick={handleWithdrawalRequest}
          disabled={stats.totalEarnings < 50}
          className="w-full md:w-auto bg-gradient-to-r from-[#10b981] to-[#3b82f6]"
        >
          <Download className="w-4 h-4 mr-2" />
          {language === "tr" ? "Çekim Talebi Oluştur" : "Request Withdrawal"}
        </Button>
        <p className="text-xs text-[#999999] mt-2">
          {language === "tr" ? "Minimum çekim tutarı: $50" : "Minimum withdrawal amount: $50"}
        </p>
      </div>

      {/* Earnings History */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          {language === "tr" ? "Kazanç Geçmişi" : "Earnings History"}
        </h3>
        {earnings.length === 0 ? (
          <p className="text-[#999999] text-center py-8">
            {language === "tr" ? "Henüz kazanç yok" : "No earnings yet"}
          </p>
        ) : (
          <div className="space-y-2">
            {earnings.map((earning, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-[#2a2a2a] rounded-lg">
                <span className="text-white text-sm">{earning.date}</span>
                <div className="text-right">
                  <p className="text-white font-semibold">${earning.amount.toFixed(2)}</p>
                  <p className="text-xs text-[#999999]">{earning.commission}% commission</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
