"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount_cents: number;
  payment_info: string | null;
  status: string;
  created_at: string;
  user_name: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function PendingWithdrawalsSection() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format((cents || 0) / 100);
  };

  const fetchPendingWithdrawals = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("id, user_id, amount_cents, payment_info, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const requests = data ?? [];
      const userIds = Array.from(new Set(requests.map((item) => item.user_id).filter(Boolean)));

      let profileMap = new Map<string, ProfileRow>();

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      }

      const formattedRows: WithdrawalRow[] = requests.map((item) => {
        const profile = profileMap.get(item.user_id);
        return {
          id: item.id,
          user_id: item.user_id,
          amount_cents: item.amount_cents ?? 0,
          payment_info: item.payment_info ?? null,
          status: item.status,
          created_at: item.created_at,
          user_name: profile?.full_name || profile?.email || "Unknown User",
        };
      });

      setWithdrawals(formattedRows);
    } catch (error) {
      console.error("Error fetching pending withdrawals:", error);
      toast.error("Failed to load pending withdrawals");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (requestId: string) => {
    try {
      setProcessingId(requestId);

      const { error } = await supabase
        .from("withdrawal_requests")
        .update({ status: "paid" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Withdrawal marked as paid");
      setWithdrawals((prev) => prev.filter((item) => item.id !== requestId));
    } catch (error) {
      console.error("Error paying withdrawal request:", error);
      toast.error("Failed to mark withdrawal as paid");
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchPendingWithdrawals();
  }, []);

  return (
    <Card className="bg-[#1a1a1a] border-white/[0.08] p-6">
      <div className="flex items-center gap-2 mb-6">
        <HandCoins className="w-5 h-5 text-[#14b8a6]" />
        <h3 className="text-xl font-semibold text-white">Pending Withdrawals</h3>
      </div>

      {loading ? (
        <p className="text-[#999999]">Loading pending withdrawals...</p>
      ) : withdrawals.length === 0 ? (
        <p className="text-[#999999]">No pending withdrawals</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left text-[#999999] font-medium py-3 pr-4">User name</th>
                <th className="text-left text-[#999999] font-medium py-3 pr-4">Amount</th>
                <th className="text-left text-[#999999] font-medium py-3 pr-4">Payment info</th>
                <th className="text-left text-[#999999] font-medium py-3">Pay button</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((item) => (
                <tr key={item.id} className="border-b border-white/[0.05]">
                  <td className="py-3 pr-4 text-white">{item.user_name}</td>
                  <td className="py-3 pr-4 text-[#10b981] font-semibold">{formatAmount(item.amount_cents)}</td>
                  <td className="py-3 pr-4 text-[#d1d5db]">{item.payment_info || "-"}</td>
                  <td className="py-3">
                    <Button
                      size="sm"
                      onClick={() => handlePay(item.id)}
                      disabled={processingId === item.id}
                      className="bg-[#10b981] hover:bg-[#059669]"
                    >
                      {processingId === item.id ? "Paying..." : "Pay"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
