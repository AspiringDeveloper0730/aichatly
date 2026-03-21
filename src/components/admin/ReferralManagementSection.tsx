
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Edit,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReferralUser {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referral_code: string;
  ip_address: string | null;
  device_fingerprint: string | null;
  stripe_customer_id: string | null;
  status: string;
  first_purchase_at: string | null;
  total_earnings_cents: number;
  commission_rate: number;
  created_at: string;
  referrer_profile: {
    email: string | null;
    full_name: string | null;
  };
  referred_profile: {
    email: string | null;
    full_name: string | null;
  } | null;
}

interface ReferralStats {
  referrer_id: string;
  total_referrals: number;
  paid_referrals: number;
  free_referrals: number;
  total_earnings_cents: number;
  referrer_email: string | null;
  referrer_name: string | null;
}

interface ReferredUser {
  id: string;
  referred_id: string | null;
  status: string;
  first_purchase_at: string | null;
  total_earnings_cents: number;
  created_at: string;
  referred_profile: {
    email: string | null;
    full_name: string | null;
  } | null;
}

export function ReferralManagementSection() {
  const [referralStats, setReferralStats] = useState<ReferralStats[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<ReferralStats | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<ReferralUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Dialog states
  const [fraudDialog, setFraudDialog] = useState<{
    open: boolean;
    referralId: string | null;
    action: "flag" | "block" | null;
  }>({ open: false, referralId: null, action: null });

  const [commissionDialog, setCommissionDialog] = useState(false);
  const [commissionRate, setCommissionRate] = useState("");

  // Fetch referral statistics grouped by referrer
  const fetchReferralStats = async () => {
    try {
      setLoading(true);

      // Fetch all referrals with referrer profiles
      const { data: referralsData, error: referralsError } = await supabase
        .from("referrals")
        .select(`
          referrer_id,
          status,
          first_purchase_at,
          total_earnings_cents,
          profiles!referrals_referrer_id_fkey (
            email,
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (referralsError) throw referralsError;

      // Group by referrer and calculate stats
      const statsMap = new Map<string, ReferralStats>();

      referralsData?.forEach((referral: any) => {
        const referrerId = referral.referrer_id;
        
        if (!statsMap.has(referrerId)) {
          statsMap.set(referrerId, {
            referrer_id: referrerId,
            total_referrals: 0,
            paid_referrals: 0,
            free_referrals: 0,
            total_earnings_cents: 0,
            referrer_email: referral.profiles?.email || null,
            referrer_name: referral.profiles?.full_name || null,
          });
        }

        const stats = statsMap.get(referrerId)!;
        stats.total_referrals++;
        stats.total_earnings_cents += referral.total_earnings_cents || 0;

        if (referral.first_purchase_at) {
          stats.paid_referrals++;
        } else {
          stats.free_referrals++;
        }
      });

      const statsArray = Array.from(statsMap.values()).sort(
        (a, b) => b.total_earnings_cents - a.total_earnings_cents
      );

      setReferralStats(statsArray);

      if (statsArray.length > 0 && !selectedReferrer) {
        setSelectedReferrer(statsArray[0]);
      }
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      toast.error("Failed to load referral statistics");
    } finally {
      setLoading(false);
    }
  };

  // Fetch referred users for selected referrer
  const fetchReferredUsers = async (referrerId: string) => {
    try {
      setDetailsLoading(true);

      const { data, error } = await supabase
        .from("referrals")
        .select(`
          id,
          referred_id,
          status,
          first_purchase_at,
          total_earnings_cents,
          created_at,
          ip_address,
          device_fingerprint,
          stripe_customer_id,
          commission_rate,
          profiles!referrals_referred_id_fkey (
            email,
            full_name
          )
        `)
        .eq("referrer_id", referrerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        id: item.id,
        referred_id: item.referred_id,
        status: item.status,
        first_purchase_at: item.first_purchase_at,
        total_earnings_cents: item.total_earnings_cents,
        created_at: item.created_at,
        ip_address: item.ip_address,
        device_fingerprint: item.device_fingerprint,
        stripe_customer_id: item.stripe_customer_id,
        commission_rate: item.commission_rate,
        referred_profile: item.profiles,
      })) || [];

      setReferredUsers(formattedData);
      
      if (formattedData.length > 0) {
        setSelectedReferral(formattedData[0] as any);
      }
    } catch (error) {
      console.error("Error fetching referred users:", error);
      toast.error("Failed to load referred users");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Update commission rate
  const handleUpdateCommission = async () => {
    if (!selectedReferrer) return;

    try {
      const rate = parseFloat(commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        toast.error("Please enter a valid commission rate (0-100)");
        return;
      }

      const { error } = await supabase
        .from("referrals")
        .update({ commission_rate: rate })
        .eq("referrer_id", selectedReferrer.referrer_id);

      if (error) throw error;

      toast.success("Commission rate updated successfully");
      setCommissionDialog(false);
      setCommissionRate("");
      await fetchReferralStats();
      if (selectedReferrer) {
        await fetchReferredUsers(selectedReferrer.referrer_id);
      }
    } catch (error) {
      console.error("Error updating commission rate:", error);
      toast.error("Failed to update commission rate");
    }
  };

  // Handle fraud detection action
  const handleFraudAction = async (referralId: string, action: "flag" | "block") => {
    try {
      if (action === "flag") {
        // Update status to flagged for review
        const { error } = await supabase
          .from("referrals")
          .update({ status: "flagged" })
          .eq("id", referralId);

        if (error) throw error;
        toast.success("Referral flagged for review");
      } else if (action === "block") {
        // Update status to blocked
        const { error } = await supabase
          .from("referrals")
          .update({ status: "blocked" })
          .eq("id", referralId);

        if (error) throw error;
        toast.success("Referral blocked successfully");
      }

      setFraudDialog({ open: false, referralId: null, action: null });
      
      if (selectedReferrer) {
        await fetchReferredUsers(selectedReferrer.referrer_id);
      }
      await fetchReferralStats();
    } catch (error) {
      console.error("Error handling fraud action:", error);
      toast.error("Failed to process action");
    }
  };

  // Initial load
  useEffect(() => {
    fetchReferralStats();
  }, []);

  // Load referred users when referrer is selected
  useEffect(() => {
    if (selectedReferrer) {
      fetchReferredUsers(selectedReferrer.referrer_id);
    }
  }, [selectedReferrer]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("referrals-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referrals",
        },
        () => {
          fetchReferralStats();
          if (selectedReferrer) {
            fetchReferredUsers(selectedReferrer.referrer_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedReferrer]);

  const formatPrice = (cents: number) => {
    const amount = cents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pending", variant: "secondary" },
      active: { label: "Active", variant: "default" },
      paid: { label: "Paid", variant: "default" },
      flagged: { label: "Flagged", variant: "destructive" },
      blocked: { label: "Blocked", variant: "destructive" },
    };

    const statusConfig = config[status] || { label: status, variant: "outline" };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const detectSuspiciousActivity = (referral: any) => {
    const warnings = [];

    // Check for same IP address
    if (referral.ip_address) {
      const sameIpCount = referredUsers.filter(
        (r: any) => r.ip_address === referral.ip_address
      ).length;
      if (sameIpCount > 1) {
        warnings.push("Multiple referrals from same IP");
      }
    }

    // Check for same device fingerprint
    if (referral.device_fingerprint) {
      const sameDeviceCount = referredUsers.filter(
        (r: any) => r.device_fingerprint === referral.device_fingerprint
      ).length;
      if (sameDeviceCount > 1) {
        warnings.push("Multiple referrals from same device");
      }
    }

    // Check for same Stripe customer
    if (referral.stripe_customer_id) {
      const sameStripeCount = referredUsers.filter(
        (r: any) => r.stripe_customer_id === referral.stripe_customer_id
      ).length;
      if (sameStripeCount > 1) {
        warnings.push("Multiple referrals with same payment method");
      }
    }

    return warnings;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel - Referrer List */}
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Referrers ({referralStats.length})
            </h3>
          </div>

          <ScrollArea className="h-[600px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-[#999999]">Loading referrers...</div>
            ) : referralStats.length === 0 ? (
              <div className="text-center py-8 text-[#999999]">No referrals found</div>
            ) : (
              <div className="space-y-2">
                {referralStats.map((stats) => (
                  <div
                    key={stats.referrer_id}
                    onClick={() => setSelectedReferrer(stats)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all duration-200",
                      "hover:bg-white/[0.05] border border-transparent",
                      selectedReferrer?.referrer_id === stats.referrer_id && "bg-white/[0.08] border-[#6366f1]"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {stats.referrer_name || "Unknown User"}
                          </p>
                          <p className="text-xs text-[#999999] truncate">{stats.referrer_email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[#999999]">Total: </span>
                          <span className="text-white font-medium">{stats.total_referrals}</span>
                        </div>
                        <div>
                          <span className="text-[#999999]">Paid: </span>
                          <span className="text-[#10b981] font-medium">{stats.paid_referrals}</span>
                        </div>
                      </div>
                      <div className="text-xs">
                        <span className="text-[#999999]">Earnings: </span>
                        <span className="text-[#10b981] font-bold">
                          {formatPrice(stats.total_earnings_cents)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </Card>

      {/* Middle Panel - Referral Details */}
      <Card className="lg:col-span-6 bg-[#1a1a1a] border-white/[0.08] p-6">
        {!selectedReferrer ? (
          <div className="flex items-center justify-center h-[600px] text-[#999999]">
            Select a referrer to view details
          </div>
        ) : (
          <div className="space-y-6">
            {/* Referrer Header */}
            <div className="flex items-start justify-between pb-6 border-b border-white/[0.08]">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {selectedReferrer.referrer_name || "Unknown User"}
                </h2>
                <p className="text-[#999999] mt-1">{selectedReferrer.referrer_email}</p>
                <div className="flex items-center gap-4 mt-4">
                  <div>
                    <p className="text-xs text-[#999999]">Total Referrals</p>
                    <p className="text-2xl font-bold text-white">{selectedReferrer.total_referrals}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Total Earnings</p>
                    <p className="text-2xl font-bold text-[#10b981]">
                      {formatPrice(selectedReferrer.total_earnings_cents)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[480px] pr-4">
              {detailsLoading ? (
                <div className="text-center py-8 text-[#999999]">Loading details...</div>
              ) : (
                <div className="space-y-6">
                  {/* Statistics */}
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-[#10b981]" />
                      Referral Breakdown
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                        <p className="text-xs text-[#999999] mb-1">Paid Referrals</p>
                        <p className="text-2xl font-bold text-[#10b981]">
                          {selectedReferrer.paid_referrals}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                        <p className="text-xs text-[#999999] mb-1">Free Referrals</p>
                        <p className="text-2xl font-bold text-[#999999]">
                          {selectedReferrer.free_referrals}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Referred Users List */}
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-[#6366f1]" />
                      Referred Users ({referredUsers.length})
                    </h3>
                    {referredUsers.length === 0 ? (
                      <p className="text-[#999999] text-sm">No referred users yet</p>
                    ) : (
                      <div className="space-y-2">
                        {referredUsers.map((user: any) => {
                          const warnings = detectSuspiciousActivity(user);
                          const isSuspicious = warnings.length > 0;

                          return (
                            <div
                              key={user.id}
                              onClick={() => setSelectedReferral(user)}
                              className={cn(
                                "p-3 rounded-lg border transition-all cursor-pointer",
                                isSuspicious
                                  ? "bg-red-500/[0.05] border-red-500/[0.2]"
                                  : "bg-white/[0.03] border-white/[0.08]",
                                selectedReferral?.id === user.id && "ring-2 ring-[#6366f1]"
                              )}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {user.referred_profile?.full_name || "Unknown User"}
                                  </p>
                                  <p className="text-xs text-[#999999] truncate">
                                    {user.referred_profile?.email || "No email"}
                                  </p>
                                </div>
                                {getStatusBadge(user.status)}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#999999]">
                                  {user.first_purchase_at ? "Paid" : "Free"}
                                </span>
                                <span className="text-[#10b981] font-medium">
                                  {formatPrice(user.total_earnings_cents)}
                                </span>
                              </div>
                              {isSuspicious && (
                                <div className="mt-2 flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-red-400">
                                    {warnings.map((warning, idx) => (
                                      <p key={idx}>{warning}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </Card>

      {/* Right Panel - Actions & Controls */}
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Controls
          </h3>

          {!selectedReferrer ? (
            <p className="text-[#999999] text-sm">Select a referrer to manage settings</p>
          ) : (
            <div className="space-y-6">
              {/* Commission Rate Management */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white">Referral Bonuses</h4>
                <Button
                  onClick={() => {
                    setCommissionRate("");
                    setCommissionDialog(true);
                  }}
                  className="w-full justify-start gap-2 bg-[#10b981] hover:bg-[#059669]"
                >
                  <Edit className="w-4 h-4" />
                  Edit Commission Rate
                </Button>
              </div>

              {/* Self-Referral Control Panel */}
              {selectedReferral && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white">Fraud Detection</h4>
                  
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#999999]">IP Address</span>
                      <span className="text-white font-mono">
                        {selectedReferral.ip_address || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#999999]">Device ID</span>
                      <span className="text-white font-mono truncate max-w-[120px]">
                        {selectedReferral.device_fingerprint?.substring(0, 12) || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#999999]">Stripe Customer</span>
                      <span className="text-white font-mono truncate max-w-[120px]">
                        {selectedReferral.stripe_customer_id?.substring(0, 12) || "N/A"}
                      </span>
                    </div>
                  </div>

                  {detectSuspiciousActivity(selectedReferral).length > 0 && (
                    <div className="space-y-2">
                      <Button
                        onClick={() =>
                          setFraudDialog({
                            open: true,
                            referralId: selectedReferral.id,
                            action: "flag",
                          })
                        }
                        className="w-full justify-start gap-2 bg-[#f59e0b] hover:bg-[#d97706]"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Flag for Review
                      </Button>
                      <Button
                        onClick={() =>
                          setFraudDialog({
                            open: true,
                            referralId: selectedReferral.id,
                            action: "block",
                          })
                        }
                        variant="destructive"
                        className="w-full justify-start gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Block Referral
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#6366f1] mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-[#999999]">
                    <p className="font-medium text-white mb-1">Fraud Detection</p>
                    <p>
                      System automatically detects suspicious patterns including duplicate IPs,
                      devices, and payment methods.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Commission Rate Dialog */}
      <AlertDialog open={commissionDialog} onOpenChange={setCommissionDialog}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Update Commission Rate</AlertDialogTitle>
            <AlertDialogDescription className="text-[#999999]">
              Set a custom commission rate for this referrer. Enter a percentage value (0-100).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="commission_rate" className="text-white">
              Commission Rate (%)
            </Label>
            <Input
              id="commission_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="mt-2 bg-white/[0.05] border-white/[0.08] text-white"
              placeholder="25.00"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.05] text-white border-white/[0.08] hover:bg-white/[0.1]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateCommission}
              className="bg-[#10b981] hover:bg-[#059669]"
            >
              Update Rate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fraud Action Dialog */}
      <AlertDialog
        open={fraudDialog.open}
        onOpenChange={(open) =>
          setFraudDialog({ open, referralId: null, action: null })
        }
      >
        <AlertDialogContent className="bg-[#1a1a1a] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {fraudDialog.action === "flag" ? "Flag Referral" : "Block Referral"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#999999]">
              {fraudDialog.action === "flag"
                ? "This will mark the referral as flagged for manual review. The referral will remain active but will be highlighted for investigation."
                : "This will permanently block this referral. The referrer will not receive any earnings from this referral."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.05] text-white border-white/[0.08] hover:bg-white/[0.1]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (fraudDialog.referralId && fraudDialog.action) {
                  handleFraudAction(fraudDialog.referralId, fraudDialog.action);
                }
              }}
              className={cn(
                fraudDialog.action === "flag"
                  ? "bg-[#f59e0b] hover:bg-[#d97706]"
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {fraudDialog.action === "flag" ? "Flag" : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
