
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  User, 
  Mail, 
  Calendar, 
  Shield, 
  ShieldOff, 
  Trash2, 
  Package, 
  Sparkles,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  language: string | null;
  is_premium: boolean;
  created_at: string;
  blocked_at: string | null;
}

interface UserCharacter {
  id: string;
  name: string;
  occupation_en: string | null;
  occupation_tr: string | null;
  image_url: string;
}

interface UserSubscription {
  id: string;
  status: string;
  plan_name: string;
  current_period_end: string | null;
}

interface UserCredits {
  image_generation_credits: number;
  chat_messages_remaining: number;
  character_slots: number;
  file_upload_mb_limit: number;
}

export function UserManagementSection() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "block" | "delete" | null;
    userId: string | null;
  }>({ open: false, type: null, userId: null });

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers(data || []);
      
      // Auto-select first user if none selected
      if (data && data.length > 0 && !selectedUser) {
        setSelectedUser(data[0]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Fetch user details (characters, subscription, credits)
  const fetchUserDetails = async (userId: string) => {
    try {
      setDetailsLoading(true);

      // Fetch characters
      const { data: charactersData, error: charactersError } = await supabase
        .from("characters")
        .select("id, name, occupation_en, occupation_tr, image_url")
        .eq("creator_id", userId)
        .is("deleted_at", null);

      if (charactersError) throw charactersError;
      setUserCharacters(charactersData || []);

      // Fetch subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("id, status, plan_name, current_period_end")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionError && subscriptionError.code !== "PGRST116") {
        throw subscriptionError;
      }
      setUserSubscription(subscriptionData);

      // Fetch credits
      const { data: creditsData, error: creditsError } = await supabase
        .from("user_credits")
        .select("image_generation_credits, chat_messages_remaining, character_slots, file_upload_mb_limit")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError && creditsError.code !== "PGRST116") {
        throw creditsError;
      }
      setUserCredits(creditsData);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to load user details");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Block user
  const handleBlockUser = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      const isBlocked = !!user?.blocked_at;

      const { error } = await supabase
        .from("profiles")
        .update({ 
          blocked_at: isBlocked ? null : new Date().toISOString() 
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success(isBlocked ? "User unblocked successfully" : "User blocked successfully");
      await fetchUsers();
      
      // Update selected user if it's the same one
      if (selectedUser?.id === userId) {
        const updatedUser = users.find(u => u.id === userId);
        if (updatedUser) {
          setSelectedUser({
            ...updatedUser,
            blocked_at: isBlocked ? null : new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error("Error blocking/unblocking user:", error);
      toast.error("Failed to update user status");
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    try {
      // Note: In production, you might want to soft delete or archive instead
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast.success("User deleted successfully");
      await fetchUsers();
      
      // Clear selection if deleted user was selected
      if (selectedUser?.id === userId) {
        setSelectedUser(users[0] || null);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, []);

  // Load details when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchUserDetails(selectedUser.id);
    }
  }, [selectedUser]);

  // Real-time subscription for user updates
  useEffect(() => {
    const channel = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Active", variant: "default" },
      trialing: { label: "Trial", variant: "secondary" },
      past_due: { label: "Past Due", variant: "destructive" },
      canceled: { label: "Canceled", variant: "outline" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel - User List */}
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Users ({users.length})
            </h3>
          </div>

          <ScrollArea className="h-[600px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-[#999999]">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-[#999999]">No users found</div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all duration-200",
                      "hover:bg-white/[0.05] border border-transparent",
                      selectedUser?.id === user.id && "bg-white/[0.08] border-[#6366f1]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {user.full_name || "Unknown User"}
                        </p>
                        <p className="text-xs text-[#999999] truncate">{user.email}</p>
                        <p className="text-xs text-[#666666] mt-1">
                          {formatDate(user.created_at)}
                        </p>
                        {user.blocked_at && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            Blocked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </Card>

      {/* Middle Panel - User Details */}
      <Card className="lg:col-span-6 bg-[#1a1a1a] border-white/[0.08] p-6">
        {!selectedUser ? (
          <div className="flex items-center justify-center h-[600px] text-[#999999]">
            Select a user to view details
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-start gap-4 pb-6 border-b border-white/[0.08]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {selectedUser.full_name || "Unknown User"}
                </h2>
                <div className="flex items-center gap-2 mt-2 text-[#999999]">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[#999999]">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Joined {formatDate(selectedUser.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {selectedUser.is_premium && (
                    <Badge className="bg-gradient-to-r from-[#f59e0b] to-[#ef4444]">
                      Premium
                    </Badge>
                  )}
                  {selectedUser.blocked_at && (
                    <Badge variant="destructive">Blocked</Badge>
                  )}
                </div>
              </div>
            </div>

            <ScrollArea className="h-[480px] pr-4">
              {detailsLoading ? (
                <div className="text-center py-8 text-[#999999]">Loading details...</div>
              ) : (
                <div className="space-y-6">
                  {/* Characters Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-[#6366f1]" />
                      Characters ({userCharacters.length})
                    </h3>
                    {userCharacters.length === 0 ? (
                      <p className="text-[#999999] text-sm">No characters created yet</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {userCharacters.map((character) => (
                          <div
                            key={character.id}
                            className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={character.image_url}
                                alt={character.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {character.name}
                                </p>
                                <p className="text-xs text-[#999999] truncate">
                                  {character.occupation_en || "No occupation"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subscription Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <Package className="w-5 h-5 text-[#f59e0b]" />
                      Subscription
                    </h3>
                    {!userSubscription ? (
                      <p className="text-[#999999] text-sm">No active subscription</p>
                    ) : (
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#999999]">Plan</span>
                          <span className="text-sm font-medium text-white">
                            {userSubscription.plan_name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#999999]">Status</span>
                          {getStatusBadge(userSubscription.status)}
                        </div>
                        {userSubscription.current_period_end && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#999999]">Expires</span>
                            <span className="text-sm text-white">
                              {formatDate(userSubscription.current_period_end)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Credits Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-[#10b981]" />
                      Credits & Limits
                    </h3>
                    {!userCredits ? (
                      <p className="text-[#999999] text-sm">No credit information available</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                          <p className="text-xs text-[#999999] mb-1">Image Credits</p>
                          <p className="text-lg font-bold text-white">
                            {userCredits.image_generation_credits}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                          <p className="text-xs text-[#999999] mb-1">Chat Messages</p>
                          <p className="text-lg font-bold text-white">
                            {userCredits.chat_messages_remaining}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                          <p className="text-xs text-[#999999] mb-1">Character Slots</p>
                          <p className="text-lg font-bold text-white">
                            {userCredits.character_slots}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                          <p className="text-xs text-[#999999] mb-1">Upload Limit</p>
                          <p className="text-lg font-bold text-white">
                            {userCredits.file_upload_mb_limit} MB
                          </p>
                        </div>
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
            <Shield className="w-5 h-5" />
            Actions
          </h3>

          {!selectedUser ? (
            <p className="text-[#999999] text-sm">Select a user to perform actions</p>
          ) : (
            <div className="space-y-3">
              {/* Block/Unblock Button */}
              <Button
                onClick={() =>
                  setActionDialog({
                    open: true,
                    type: "block",
                    userId: selectedUser.id,
                  })
                }
                className={cn(
                  "w-full justify-start gap-2",
                  selectedUser.blocked_at
                    ? "bg-[#10b981] hover:bg-[#059669]"
                    : "bg-[#f59e0b] hover:bg-[#d97706]"
                )}
              >
                {selectedUser.blocked_at ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Unblock User
                  </>
                ) : (
                  <>
                    <ShieldOff className="w-4 h-4" />
                    Block User
                  </>
                )}
              </Button>

              {/* Delete Button */}
              <Button
                onClick={() =>
                  setActionDialog({
                    open: true,
                    type: "delete",
                    userId: selectedUser.id,
                  })
                }
                variant="destructive"
                className="w-full justify-start gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </Button>

              {/* Info Box */}
              <div className="mt-6 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#f59e0b] mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-[#999999]">
                    <p className="font-medium text-white mb-1">Important</p>
                    <p>
                      Blocking prevents user access. Deleting permanently removes all user data.
                      Both actions require confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          setActionDialog({ open, type: null, userId: null })
        }
      >
        <AlertDialogContent className="bg-[#1a1a1a] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {actionDialog.type === "block"
                ? selectedUser?.blocked_at
                  ? "Unblock User"
                  : "Block User"
                : "Delete User"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#999999]">
              {actionDialog.type === "block"
                ? selectedUser?.blocked_at
                  ? "This will restore user access to the platform. Are you sure?"
                  : "This will prevent the user from accessing the platform. Are you sure?"
                : "This action cannot be undone. This will permanently delete the user and all associated data."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.05] text-white border-white/[0.08] hover:bg-white/[0.1]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionDialog.userId) {
                  if (actionDialog.type === "block") {
                    handleBlockUser(actionDialog.userId);
                  } else if (actionDialog.type === "delete") {
                    handleDeleteUser(actionDialog.userId);
                  }
                }
                setActionDialog({ open: false, type: null, userId: null });
              }}
              className={cn(
                actionDialog.type === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : selectedUser?.blocked_at
                  ? "bg-[#10b981] hover:bg-[#059669]"
                  : "bg-[#f59e0b] hover:bg-[#d97706]"
              )}
            >
              {actionDialog.type === "block"
                ? selectedUser?.blocked_at
                  ? "Unblock"
                  : "Block"
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
