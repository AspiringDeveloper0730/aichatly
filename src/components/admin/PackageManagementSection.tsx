
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Package,
  DollarSign,
  Users,
  Plus,
  Edit,
  Gift,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PackageData {
  id: string;
  name_en: string;
  name_tr: string;
  package_type: string;
  price_cents: number;
  currency: string;
  bonus_credits: number;
  bonus_description_en: string | null;
  bonus_description_tr: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
}

interface PackagePurchase {
  id: string;
  user_id: string;
  amount_paid_cents: number;
  currency: string;
  is_refunded: boolean;
  purchased_at: string;
  profiles: {
    email: string | null;
    full_name: string | null;
  };
}

interface RefundRequest {
  id: string;
  purchase_id: string;
  user_id: string;
  requested_amount_cents: number;
  refund_type: string;
  reason: string | null;
  status: string;
  created_at: string;
  profiles: {
    email: string | null;
    full_name: string | null;
  };
}

interface PackageFormData {
  name_en: string;
  name_tr: string;
  package_type: string;
  price_cents: string;
  currency: string;
  bonus_credits: string;
  bonus_description_en: string;
  bonus_description_tr: string;
}

export function PackageManagementSection() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [packagePurchases, setPackagePurchases] = useState<PackagePurchase[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [giftDialog, setGiftDialog] = useState(false);
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    request: RefundRequest | null;
    action: "approve" | "reject" | null;
  }>({ open: false, request: null, action: null });

  // Form states
  const [formData, setFormData] = useState<PackageFormData>({
    name_en: "",
    name_tr: "",
    package_type: "daily",
    price_cents: "",
    currency: "usd",
    bonus_credits: "0",
    bonus_description_en: "",
    bonus_description_tr: "",
  });

  const [giftFormData, setGiftFormData] = useState({
    user_email: "",
    package_id: "",
  });

  // Fetch all packages
  const fetchPackages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      setPackages(data || []);

      if (data && data.length > 0 && !selectedPackage) {
        setSelectedPackage(data[0]);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  // Fetch package details (purchases and refund requests)
  const fetchPackageDetails = async (packageId: string) => {
    try {
      setDetailsLoading(true);

      // Fetch purchases for this package
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("package_purchases")
        .select(`
          id,
          user_id,
          amount_paid_cents,
          currency,
          is_refunded,
          purchased_at,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq("package_id", packageId)
        .order("purchased_at", { ascending: false });

      if (purchasesError) throw purchasesError;

      const purchases = purchasesData || [];
      setPackagePurchases(purchases);

      // Guard: skip refund query when there are no purchases to avoid
      // sending an empty IN clause (purchase_id=in.()) which causes a
      // PostgreSQL "invalid input syntax for type uuid" error.
      if (purchases.length === 0) {
        setRefundRequests([]);
        return;
      }

      const purchaseIds = purchases.map((p) => p.id);

      // Fetch refund requests only when we have valid purchase IDs
      const { data: refundsData, error: refundsError } = await supabase
        .from("package_refund_requests")
        .select(`
          id,
          purchase_id,
          user_id,
          requested_amount_cents,
          refund_type,
          reason,
          status,
          created_at,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .in("purchase_id", purchaseIds)
        .order("created_at", { ascending: false });

      if (refundsError && refundsError.code !== "PGRST116") {
        throw refundsError;
      }

      setRefundRequests(refundsData || []);
    } catch (error) {
      console.error("Error fetching package details:", error);
      toast.error("Failed to load package details");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Create package
  const handleCreatePackage = async () => {
    try {
      const { error } = await supabase.from("packages").insert({
        name_en: formData.name_en,
        name_tr: formData.name_tr,
        package_type: formData.package_type,
        price_cents: parseInt(formData.price_cents),
        currency: formData.currency,
        bonus_credits: parseInt(formData.bonus_credits),
        bonus_description_en: formData.bonus_description_en || null,
        bonus_description_tr: formData.bonus_description_tr || null,
        display_order: packages.length,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Package created successfully");
      setCreateDialog(false);
      resetForm();
      await fetchPackages();
    } catch (error) {
      console.error("Error creating package:", error);
      toast.error("Failed to create package");
    }
  };

  // Update package
  const handleUpdatePackage = async () => {
    if (!selectedPackage) return;

    try {
      const { error } = await supabase
        .from("packages")
        .update({
          name_en: formData.name_en,
          name_tr: formData.name_tr,
          package_type: formData.package_type,
          price_cents: parseInt(formData.price_cents),
          currency: formData.currency,
          bonus_credits: parseInt(formData.bonus_credits),
          bonus_description_en: formData.bonus_description_en || null,
          bonus_description_tr: formData.bonus_description_tr || null,
        })
        .eq("id", selectedPackage.id);

      if (error) throw error;

      toast.success("Package updated successfully");
      setEditDialog(false);
      resetForm();
      await fetchPackages();
    } catch (error) {
      console.error("Error updating package:", error);
      toast.error("Failed to update package");
    }
  };

  // Gift free package
  const handleGiftPackage = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", giftFormData.user_email)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) {
        toast.error("User not found");
        return;
      }

      const { error: subError } = await supabase.from("subscriptions").insert({
        user_id: userData.id,
        package_id: giftFormData.package_id,
        status: "active",
        plan_name: "Free Gift",
        price_amount: 0,
        currency: "usd",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (subError) throw subError;

      toast.success("Free package gifted successfully");
      setGiftDialog(false);
      setGiftFormData({ user_email: "", package_id: "" });
    } catch (error) {
      console.error("Error gifting package:", error);
      toast.error("Failed to gift package");
    }
  };

  // Handle refund request approval or rejection
  const handleRefundRequest = async (requestId: string, action: "approve" | "reject") => {
    try {
      const request = refundRequests.find((r) => r.id === requestId);
      if (!request) return;

      const { error } = await supabase
        .from("package_refund_requests")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
          processed_at: action === "approve" ? new Date().toISOString() : null,
        })
        .eq("id", requestId);

      if (error) throw error;

      if (action === "approve") {
        const { error: purchaseError } = await supabase
          .from("package_purchases")
          .update({
            is_refunded: true,
            refunded_at: new Date().toISOString(),
            refund_amount_cents: request.requested_amount_cents,
          })
          .eq("id", request.purchase_id);

        if (purchaseError) throw purchaseError;
      }

      toast.success(
        `Refund request ${action === "approve" ? "approved" : "rejected"} successfully`
      );
      setRefundDialog({ open: false, request: null, action: null });

      if (selectedPackage) {
        await fetchPackageDetails(selectedPackage.id);
      }
    } catch (error) {
      console.error("Error handling refund request:", error);
      toast.error("Failed to process refund request");
    }
  };

  const resetForm = () => {
    setFormData({
      name_en: "",
      name_tr: "",
      package_type: "daily",
      price_cents: "",
      currency: "usd",
      bonus_credits: "0",
      bonus_description_en: "",
      bonus_description_tr: "",
    });
  };

  const openEditDialog = () => {
    if (!selectedPackage) return;

    setFormData({
      name_en: selectedPackage.name_en,
      name_tr: selectedPackage.name_tr,
      package_type: selectedPackage.package_type,
      price_cents: selectedPackage.price_cents.toString(),
      currency: selectedPackage.currency,
      bonus_credits: selectedPackage.bonus_credits.toString(),
      bonus_description_en: selectedPackage.bonus_description_en || "",
      bonus_description_tr: selectedPackage.bonus_description_tr || "",
    });
    setEditDialog(true);
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    if (selectedPackage) {
      fetchPackageDetails(selectedPackage.id);
    }
  }, [selectedPackage]);

  useEffect(() => {
    const channel = supabase
      .channel("packages-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "packages" },
        () => { fetchPackages(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPackageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",
    };
    return labels[type] || type;
  };

  const calculateTotalSales = () => {
    return packagePurchases
      .filter((p) => !p.is_refunded)
      .reduce((sum, p) => sum + p.amount_paid_cents, 0);
  };

  const getRefundStatusBadge = (status: string) => {
    const config: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending: { label: "Pending", variant: "secondary" },
      approved: { label: "Approved", variant: "default" },
      rejected: { label: "Rejected", variant: "destructive" },
    };

    const statusConfig = config[status] || { label: status, variant: "outline" };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel - Package List */}
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Packages ({packages.length})
            </h3>
          </div>

          <ScrollArea className="h-[600px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-[#999999]">Loading packages...</div>
            ) : packages.length === 0 ? (
              <div className="text-center py-8 text-[#999999]">No packages found</div>
            ) : (
              <div className="space-y-2">
                {packages.map((pkg) => {
                  const activePurchases = packagePurchases.filter((p) => !p.is_refunded);
                  const totalSold = activePurchases.length;
                  const totalEarnings = activePurchases.reduce(
                    (sum, p) => sum + p.amount_paid_cents,
                    0
                  );

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all duration-200",
                        "hover:bg-white/[0.05] border border-transparent",
                        selectedPackage?.id === pkg.id && "bg-white/[0.08] border-[#6366f1]"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {pkg.name_en}
                            </p>
                            <p className="text-xs text-[#999999]">
                              {getPackageTypeLabel(pkg.package_type)}
                            </p>
                          </div>
                          <Badge
                            variant={pkg.is_active ? "default" : "secondary"}
                            className="text-xs ml-2"
                          >
                            {pkg.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#999999]">Sold: {totalSold}</span>
                          <span className="text-[#10b981] font-medium">
                            {formatPrice(totalEarnings, pkg.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </Card>

      {/* Middle Panel - Package Details */}
      <Card className="lg:col-span-6 bg-[#1a1a1a] border-white/[0.08] p-6">
        {!selectedPackage ? (
          <div className="flex items-center justify-center h-[600px] text-[#999999]">
            Select a package to view details
          </div>
        ) : (
          <div className="space-y-6">
            {/* Package Header */}
            <div className="flex items-start justify-between pb-6 border-b border-white/[0.08]">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{selectedPackage.name_en}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">
                    {getPackageTypeLabel(selectedPackage.package_type)}
                  </Badge>
                  <Badge variant={selectedPackage.is_active ? "default" : "secondary"}>
                    {selectedPackage.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {selectedPackage.is_featured && (
                    <Badge className="bg-gradient-to-r from-[#f59e0b] to-[#ef4444]">
                      Featured
                    </Badge>
                  )}
                </div>
                <p className="text-3xl font-bold text-[#10b981] mt-3">
                  {formatPrice(selectedPackage.price_cents, selectedPackage.currency)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={openEditDialog}
                  size="sm"
                  className="bg-[#6366f1] hover:bg-[#5558e3]"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[480px] pr-4">
              {detailsLoading ? (
                <div className="text-center py-8 text-[#999999]">Loading details...</div>
              ) : (
                <div className="space-y-6">
                  {/* Sales Statistics */}
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-[#10b981]" />
                      Sales Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                        <p className="text-xs text-[#999999] mb-1">Total Sold</p>
                        <p className="text-2xl font-bold text-white">
                          {packagePurchases.filter((p) => !p.is_refunded).length}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                        <p className="text-xs text-[#999999] mb-1">Total Earnings</p>
                        <p className="text-2xl font-bold text-[#10b981]">
                          {formatPrice(calculateTotalSales(), selectedPackage.currency)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bonus Information */}
                  {selectedPackage.bonus_credits > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <Gift className="w-5 h-5 text-[#f59e0b]" />
                        Bonus
                      </h3>
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                        <p className="text-sm text-white font-medium mb-2">
                          {selectedPackage.bonus_credits} Bonus Credits
                        </p>
                        {selectedPackage.bonus_description_en && (
                          <p className="text-xs text-[#999999]">
                            {selectedPackage.bonus_description_en}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recent Purchasers */}
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-[#6366f1]" />
                      Recent Purchasers ({packagePurchases.length})
                    </h3>
                    {packagePurchases.length === 0 ? (
                      <p className="text-[#999999] text-sm">No purchases yet</p>
                    ) : (
                      <div className="space-y-2">
                        {packagePurchases.slice(0, 5).map((purchase) => (
                          <div
                            key={purchase.id}
                            className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {purchase.profiles?.full_name || "Unknown User"}
                                </p>
                                <p className="text-xs text-[#999999] truncate">
                                  {purchase.profiles?.email}
                                </p>
                                <p className="text-xs text-[#666666] mt-1">
                                  {formatDate(purchase.purchased_at)}
                                </p>
                              </div>
                              <div className="text-right ml-3">
                                <p className="text-sm font-medium text-[#10b981]">
                                  {formatPrice(purchase.amount_paid_cents, purchase.currency)}
                                </p>
                                {purchase.is_refunded && (
                                  <Badge variant="destructive" className="mt-1 text-xs">
                                    Refunded
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Refund Requests */}
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <RefreshCw className="w-5 h-5 text-[#ef4444]" />
                      Refund Requests ({refundRequests.length})
                    </h3>
                    {refundRequests.length === 0 ? (
                      <p className="text-[#999999] text-sm">No refund requests</p>
                    ) : (
                      <div className="space-y-2">
                        {refundRequests.map((request) => (
                          <div
                            key={request.id}
                            className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {request.profiles?.full_name || "Unknown User"}
                                </p>
                                <p className="text-xs text-[#999999] truncate">
                                  {request.profiles?.email}
                                </p>
                              </div>
                              {getRefundStatusBadge(request.status)}
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-[#999999]">Amount:</span>
                                <span className="text-white font-medium">
                                  {formatPrice(
                                    request.requested_amount_cents,
                                    selectedPackage.currency
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#999999]">Type:</span>
                                <span className="text-white">
                                  {request.refund_type.charAt(0).toUpperCase() +
                                    request.refund_type.slice(1)}
                                </span>
                              </div>
                              {request.reason && (
                                <p className="text-[#999999] mt-2 italic">
                                  Reason: {request.reason}
                                </p>
                              )}
                            </div>
                            {request.status === "pending" && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  onClick={() =>
                                    setRefundDialog({
                                      open: true,
                                      request,
                                      action: "approve",
                                    })
                                  }
                                  size="sm"
                                  className="flex-1 bg-[#10b981] hover:bg-[#059669]"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() =>
                                    setRefundDialog({
                                      open: true,
                                      request,
                                      action: "reject",
                                    })
                                  }
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </Card>

      {/* Right Panel - Actions */}
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Actions
          </h3>

          <div className="space-y-3">
            <Button
              onClick={() => { resetForm(); setCreateDialog(true); }}
              className="w-full justify-start gap-2 bg-[#10b981] hover:bg-[#059669]"
            >
              <Plus className="w-4 h-4" />
              Create New Package
            </Button>

            <Button
              onClick={openEditDialog}
              disabled={!selectedPackage}
              className="w-full justify-start gap-2 bg-[#6366f1] hover:bg-[#5558e3]"
            >
              <Edit className="w-4 h-4" />
              Edit Package
            </Button>

            <Button
              onClick={() => {
                setGiftFormData({ user_email: "", package_id: selectedPackage?.id || "" });
                setGiftDialog(true);
              }}
              disabled={!selectedPackage}
              className="w-full justify-start gap-2 bg-[#f59e0b] hover:bg-[#d97706]"
            >
              <Gift className="w-4 h-4" />
              Gift Free Package
            </Button>

            <div className="mt-6 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#6366f1] mt-0.5 flex-shrink-0" />
                <div className="text-xs text-[#999999]">
                  <p className="font-medium text-white mb-1">Package Management</p>
                  <p>
                    Create, edit, and manage subscription packages. Handle refund requests
                    and gift free packages to users.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Create Package Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/[0.08] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Package</DialogTitle>
            <DialogDescription className="text-[#999999]">
              Fill in the details to create a new subscription package.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_en" className="text-white">Name (English)</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="bg-white/[0.05] border-white/[0.08] text-white"
                  placeholder="Premium Plan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_tr" className="text-white">Name (Turkish)</Label>
                <Input
                  id="name_tr"
                  value={formData.name_tr}
                  onChange={(e) => setFormData({ ...formData, name_tr: e.target.value })}
                  className="bg-white/[0.05] border-white/[0.08] text-white"
                  placeholder="Premium Paket"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="package_type" className="text-white">Type</Label>
                <Select
                  value={formData.package_type}
                  onValueChange={(value) => setFormData({ ...formData, package_type: value })}
                >
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_cents" className="text-white">Price (cents)</Label>
                <Input
                  id="price_cents"
                  type="number"
                  value={formData.price_cents}
                  onChange={(e) => setFormData({ ...formData, price_cents: e.target.value })}
                  className="bg-white/[0.05] border-white/[0.08] text-white"
                  placeholder="999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonus_credits" className="text-white">Bonus Credits</Label>
                <Input
                  id="bonus_credits"
                  type="number"
                  value={formData.bonus_credits}
                  onChange={(e) => setFormData({ ...formData, bonus_credits: e.target.value })}
                  className="bg-white/[0.05] border-white/[0.08] text-white"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus_description_en" className="text-white">
                Bonus Description (English)
              </Label>
              <Textarea
                id="bonus_description_en"
                value={formData.bonus_description_en}
                onChange={(e) =>
                  setFormData({ ...formData, bonus_description_en: e.target.value })
                }
                className="bg-white/[0.05] border-white/[0.08] text-white"
                placeholder="Extra features included..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus_description_tr" className="text-white">
                Bonus Description (Turkish)
              </Label>
              <Textarea
                id="bonus_description_tr"
                value={formData.bonus_description_tr}
                onChange={(e) =>
                  setFormData({ ...formData, bonus_description_tr: e.target.value })
                }
                className="bg-white/[0.05] border-white/[0.08] text-white"
                placeholder="Ekstra özellikler dahil..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialog(false)}
              className="bg-white/[0.05] text-white border-white/[0.08] hover:bg-white/[0.1]"
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePackage} className="bg-[#10b981] hover:bg-[#059669]">
              Create Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Package Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/[0.08] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Package</DialogTitle>
            <DialogDescription className="text-[#999999]">
              Update the package details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name_en" className="text-white">Name (English)</Label>
                <Input
                  id="edit_name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="bg-white/[0.05] border-white/[0.08] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_name_tr" className="text-white">Name (Turkish)</Label>
                <Input
                  id="edit_name_tr"
                  value={formData.name_tr}
                  onChange={(e) => setFormData({ ...formData, name_tr: e.target.value })}
                  className="bg-white/[0.05] border-white/[0.08] text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_package_type" className="text-white">Type</Label>
                <Select
                  value={formData.package_type}
                  onValueChange={(value) => setFormData({ ...formData, package_type: value })}
                >
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_price_cents" className="text-white">Price (cents)</Label>
                <Input
                  id="edit_price_cents"
                  type="number"
                  value={formData.price_cents}
                  onChange={(e) => setFormData({ ...formData, price_cents: e.target.value })}
                  className="bg-white/[0.05] border-white/[0.08] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_bonus_credits" className="text-white">Bonus Credits</Label>
                <Input
                  id="edit_bonus_credits"
                  type="number"
                  value={formData.bonus_credits}
                  onChange={(e) => setFormData({ ...formData, bonus_credits: e.target.value })}
                  className="bg-white/[0.05] border-white/[0.08] text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_bonus_description_en" className="text-white">
                Bonus Description (English)
              </Label>
              <Textarea
                id="edit_bonus_description_en"
                value={formData.bonus_description_en}
                onChange={(e) =>
                  setFormData({ ...formData, bonus_description_en: e.target.value })
                }
                className="bg-white/[0.05] border-white/[0.08] text-white"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_bonus_description_tr" className="text-white">
                Bonus Description (Turkish)
              </Label>
              <Textarea
                id="edit_bonus_description_tr"
                value={formData.bonus_description_tr}
                onChange={(e) =>
                  setFormData({ ...formData, bonus_description_tr: e.target.value })
                }
                className="bg-white/[0.05] border-white/[0.08] text-white"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog(false)}
              className="bg-white/[0.05] text-white border-white/[0.08] hover:bg-white/[0.1]"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdatePackage} className="bg-[#6366f1] hover:bg-[#5558e3]">
              Update Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gift Package Dialog */}
      <Dialog open={giftDialog} onOpenChange={setGiftDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white">Gift Free Package</DialogTitle>
            <DialogDescription className="text-[#999999]">
              Assign a free package to a specific user by their email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user_email" className="text-white">User Email</Label>
              <Input
                id="user_email"
                type="email"
                value={giftFormData.user_email}
                onChange={(e) =>
                  setGiftFormData({ ...giftFormData, user_email: e.target.value })
                }
                className="bg-white/[0.05] border-white/[0.08] text-white"
                placeholder="user@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGiftDialog(false)}
              className="bg-white/[0.05] text-white border-white/[0.08] hover:bg-white/[0.1]"
            >
              Cancel
            </Button>
            <Button onClick={handleGiftPackage} className="bg-[#f59e0b] hover:bg-[#d97706]">
              Gift Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Request Confirmation Dialog */}
      <AlertDialog
        open={refundDialog.open}
        onOpenChange={(open) => setRefundDialog({ open, request: null, action: null })}
      >
        <AlertDialogContent className="bg-[#1a1a1a] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {refundDialog.action === "approve"
                ? "Approve Refund Request"
                : "Reject Refund Request"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#999999]">
              {refundDialog.action === "approve"
                ? "This will process the refund and mark the purchase as refunded. The user will be notified."
                : "This will reject the refund request. The user will be notified of the rejection."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.05] text-white border-white/[0.08] hover:bg-white/[0.1]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (refundDialog.request && refundDialog.action) {
                  handleRefundRequest(refundDialog.request.id, refundDialog.action);
                }
              }}
              className={cn(
                refundDialog.action === "approve"
                  ? "bg-[#10b981] hover:bg-[#059669]"
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {refundDialog.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
