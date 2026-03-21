
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Shield,
  Lock,
  Users,
  AlertTriangle,
  Mail,
  Key,
  Clock,
  MapPin,
  Monitor,
  CheckCircle,
  XCircle,
  Save,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type SettingsCategory = "security" | "roles" | "suspicious" | "account";

interface AdminSecurityLog {
  id: string;
  admin_id: string;
  action_type: string;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  location_country: string | null;
  location_city: string | null;
  is_suspicious: boolean;
  suspicious_reason: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    email: string | null;
    full_name: string | null;
  };
}

interface FailedLoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  attempt_count: number;
  is_blocked: boolean;
  last_attempt_at: string;
}

export function SettingsManagementSection() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("security");
  const [securityLogs, setSecurityLogs] = useState<AdminSecurityLog[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [failedAttempts, setFailedAttempts] = useState<FailedLoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Role assignment state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");

  // Account update state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Dialog state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "unblock" | "update-email" | "update-password" | null;
    data?: any;
  }>({ open: false, type: null });

  // Fetch security logs
  const fetchSecurityLogs = async () => {
    try {
      setDetailsLoading(true);
      const { data, error } = await supabase
        .from("admin_security_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setSecurityLogs(data || []);
    } catch (error) {
      console.error("Error fetching security logs:", error);
      toast.error("Failed to load security logs");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Fetch user roles
  const fetchUserRoles = async () => {
    try {
      setDetailsLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .in("role", ["admin", "super_admin", "support"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      toast.error("Failed to load user roles");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Fetch failed login attempts
  const fetchFailedAttempts = async () => {
    try {
      setDetailsLoading(true);
      const { data, error } = await supabase
        .from("failed_login_attempts")
        .select("*")
        .order("last_attempt_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setFailedAttempts(data || []);
    } catch (error) {
      console.error("Error fetching failed attempts:", error);
      toast.error("Failed to load failed login attempts");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Assign role to user
  const handleAssignRole = async () => {
    if (!newUserEmail || !selectedRole) {
      toast.error("Please provide email and select a role");
      return;
    }

    try {
      // Find user by email
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newUserEmail)
        .maybeSingle();

      if (profileError || !profileData) {
        toast.error("User not found with this email");
        return;
      }

      // Check if role already exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profileData.id)
        .eq("role", selectedRole)
        .maybeSingle();

      if (existingRole) {
        toast.error("User already has this role");
        return;
      }

      // Insert new role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: profileData.id,
          role: selectedRole,
        });

      if (insertError) throw insertError;

      toast.success("Role assigned successfully");
      setNewUserEmail("");
      setSelectedRole("");
      await fetchUserRoles();
    } catch (error) {
      console.error("Error assigning role:", error);
      toast.error("Failed to assign role");
    }
  };

  // Remove role
  const handleRemoveRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast.success("Role removed successfully");
      await fetchUserRoles();
    } catch (error) {
      console.error("Error removing role:", error);
      toast.error("Failed to remove role");
    }
  };

  // Unblock IP
  const handleUnblockIP = async (attemptId: string) => {
    try {
      const { error } = await supabase
        .from("failed_login_attempts")
        .update({
          is_blocked: false,
          blocked_until: null,
          attempt_count: 0,
        })
        .eq("id", attemptId);

      if (error) throw error;

      toast.success("IP unblocked successfully");
      await fetchFailedAttempts();
    } catch (error) {
      console.error("Error unblocking IP:", error);
      toast.error("Failed to unblock IP");
    }
  };

  // Update email
  const handleUpdateEmail = async () => {
    if (!newEmail) {
      toast.error("Please enter a new email");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      toast.success("Email update initiated. Please check your new email for confirmation.");
      setNewEmail("");
      setActionDialog({ open: false, type: null });
    } catch (error) {
      console.error("Error updating email:", error);
      toast.error("Failed to update email");
    }
  };

  // Update password
  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
      setActionDialog({ open: false, type: null });
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    }
  };

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSecurityLogs(), fetchUserRoles(), fetchFailedAttempts()]).finally(() => {
      setLoading(false);
    });
  }, []);

  // Reload data when category changes
  useEffect(() => {
    if (activeCategory === "security") {
      fetchSecurityLogs();
    } else if (activeCategory === "roles") {
      fetchUserRoles();
    } else if (activeCategory === "suspicious") {
      fetchFailedAttempts();
    }
  }, [activeCategory]);

  // Real-time subscriptions
  useEffect(() => {
    const securityChannel = supabase
      .channel("admin-security-logs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_security_logs",
        },
        () => {
          if (activeCategory === "security") {
            fetchSecurityLogs();
          }
        }
      )
      .subscribe();

    const rolesChannel = supabase
      .channel("user-roles-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
        },
        () => {
          if (activeCategory === "roles") {
            fetchUserRoles();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(securityChannel);
      supabase.removeChannel(rolesChannel);
    };
  }, [activeCategory]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; className: string }> = {
      super_admin: { label: "Super Admin", className: "bg-gradient-to-r from-[#ef4444] to-[#dc2626]" },
      admin: { label: "Admin", className: "bg-gradient-to-r from-[#6366f1] to-[#a855f7]" },
      support: { label: "Support", className: "bg-gradient-to-r from-[#10b981] to-[#059669]" },
    };

    const config = roleConfig[role] || { label: role, className: "bg-[#999999]" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const categories = [
    {
      id: "security" as const,
      icon: Shield,
      title: "Security & Access Control",
      description: "Admin login logs and activity",
    },
    {
      id: "roles" as const,
      icon: Users,
      title: "Authorization Levels",
      description: "Manage admin roles",
    },
    {
      id: "suspicious" as const,
      icon: AlertTriangle,
      title: "Suspicious Activity",
      description: "Failed logins and blocking",
    },
    {
      id: "account" as const,
      icon: Lock,
      title: "Account Settings",
      description: "Update email and password",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel - Categories */}
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Settings
          </h3>

          <div className="space-y-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;

              return (
                <div
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all duration-200",
                    "hover:bg-white/[0.05] border",
                    isActive
                      ? "bg-white/[0.08] border-[#6366f1]"
                      : "border-transparent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isActive
                          ? "bg-gradient-to-br from-[#6366f1] to-[#a855f7]"
                          : "bg-white/[0.05]"
                      )}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {category.title}
                      </p>
                      <p className="text-xs text-[#999999] mt-0.5">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Middle Panel - Details */}
      <Card className="lg:col-span-6 bg-[#1a1a1a] border-white/[0.08] p-6">
        <ScrollArea className="h-[600px] pr-4">
          {loading || detailsLoading ? (
            <div className="text-center py-8 text-[#999999]">Loading...</div>
          ) : (
            <>
              {/* Security & Access Control */}
              {activeCategory === "security" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Shield className="w-6 h-6 text-[#6366f1]" />
                      Security Logs
                    </h3>
                    <Button
                      onClick={fetchSecurityLogs}
                      variant="outline"
                      size="sm"
                      className="bg-white/[0.05] border-white/[0.08] text-white hover:bg-white/[0.1]"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {securityLogs.length === 0 ? (
                    <p className="text-[#999999] text-center py-8">No security logs found</p>
                  ) : (
                    <div className="space-y-3">
                      {securityLogs.map((log) => (
                        <div
                          key={log.id}
                          className={cn(
                            "p-4 rounded-lg border",
                            log.is_suspicious
                              ? "bg-red-500/[0.05] border-red-500/[0.2]"
                              : "bg-white/[0.03] border-white/[0.08]"
                          )}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={log.is_suspicious ? "destructive" : "outline"}
                                className="text-xs"
                              >
                                {log.action_type}
                              </Badge>
                              {log.is_suspicious && (
                                <Badge variant="destructive" className="text-xs">
                                  Suspicious
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-[#999999]">
                              {formatDate(log.created_at)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {log.ip_address && (
                              <div className="flex items-center gap-2 text-[#999999]">
                                <MapPin className="w-4 h-4" />
                                <span>{log.ip_address}</span>
                              </div>
                            )}
                            {log.location_city && (
                              <div className="flex items-center gap-2 text-[#999999]">
                                <MapPin className="w-4 h-4" />
                                <span>
                                  {log.location_city}, {log.location_country}
                                </span>
                              </div>
                            )}
                            {log.device_fingerprint && (
                              <div className="flex items-center gap-2 text-[#999999] col-span-2">
                                <Monitor className="w-4 h-4" />
                                <span className="truncate text-xs">
                                  {log.device_fingerprint}
                                </span>
                              </div>
                            )}
                          </div>

                          {log.suspicious_reason && (
                            <div className="mt-3 p-2 rounded bg-red-500/[0.1] border border-red-500/[0.2]">
                              <p className="text-xs text-red-400">
                                <strong>Reason:</strong> {log.suspicious_reason}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Authorization Levels */}
              {activeCategory === "roles" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users className="w-6 h-6 text-[#6366f1]" />
                      User Roles
                    </h3>
                  </div>

                  {/* Assign New Role */}
                  <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-semibold text-white">Assign New Role</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="user-email" className="text-white text-xs">
                          User Email
                        </Label>
                        <Input
                          id="user-email"
                          type="email"
                          placeholder="user@example.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role-select" className="text-white text-xs">
                          Role
                        </Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      onClick={handleAssignRole}
                      className="w-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:opacity-90"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Assign Role
                    </Button>
                  </div>

                  {/* Current Roles */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-white">Current Roles</h4>
                    {userRoles.length === 0 ? (
                      <p className="text-[#999999] text-center py-8">No roles assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {userRoles.map((userRole) => (
                          <div
                            key={userRole.id}
                            className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-white">
                                  {userRole.profiles?.full_name || "Unknown User"}
                                </p>
                                {getRoleBadge(userRole.role)}
                              </div>
                              <p className="text-xs text-[#999999]">
                                {userRole.profiles?.email}
                              </p>
                              <p className="text-xs text-[#666666] mt-1">
                                Assigned: {formatDate(userRole.created_at)}
                              </p>
                            </div>
                            <Button
                              onClick={() => handleRemoveRole(userRole.id)}
                              variant="destructive"
                              size="sm"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Suspicious Activity */}
              {activeCategory === "suspicious" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-[#f59e0b]" />
                      Failed Login Attempts
                    </h3>
                    <Button
                      onClick={fetchFailedAttempts}
                      variant="outline"
                      size="sm"
                      className="bg-white/[0.05] border-white/[0.08] text-white hover:bg-white/[0.1]"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {failedAttempts.length === 0 ? (
                    <p className="text-[#999999] text-center py-8">No failed attempts found</p>
                  ) : (
                    <div className="space-y-3">
                      {failedAttempts.map((attempt) => (
                        <div
                          key={attempt.id}
                          className={cn(
                            "p-4 rounded-lg border",
                            attempt.is_blocked
                              ? "bg-red-500/[0.05] border-red-500/[0.2]"
                              : "bg-white/[0.03] border-white/[0.08]"
                          )}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-white">
                                  {attempt.email}
                                </p>
                                {attempt.is_blocked && (
                                  <Badge variant="destructive" className="text-xs">
                                    Blocked
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-[#999999]">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {attempt.ip_address}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(attempt.last_attempt_at)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-white mb-1">
                                {attempt.attempt_count} attempts
                              </p>
                              {attempt.is_blocked && (
                                <Button
                                  onClick={() => handleUnblockIP(attempt.id)}
                                  size="sm"
                                  className="bg-[#10b981] hover:bg-[#059669]"
                                >
                                  Unblock
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Account Settings */}
              {activeCategory === "account" && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                    <Lock className="w-6 h-6 text-[#6366f1]" />
                    Account Settings
                  </h3>

                  {/* Update Email */}
                  <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-[#6366f1]" />
                      <h4 className="text-sm font-semibold text-white">Update Email</h4>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-email" className="text-white text-xs">
                        New Email Address
                      </Label>
                      <Input
                        id="new-email"
                        type="email"
                        placeholder="newemail@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="bg-white/[0.05] border-white/[0.08] text-white"
                      />
                    </div>
                    <Button
                      onClick={() =>
                        setActionDialog({ open: true, type: "update-email" })
                      }
                      className="w-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:opacity-90"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Update Email
                    </Button>
                  </div>

                  {/* Update Password */}
                  <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-4">
                    <div className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-[#6366f1]" />
                      <h4 className="text-sm font-semibold text-white">Update Password</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-white text-xs">
                          New Password
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-white text-xs">
                          Confirm Password
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() =>
                        setActionDialog({ open: true, type: "update-password" })
                      }
                      className="w-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:opacity-90"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Update Password
                    </Button>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 rounded-lg bg-blue-500/[0.05] border border-blue-500/[0.2]">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-400">
                        <p className="font-medium mb-1">Security Notice</p>
                        <p>
                          Email changes require verification. Password changes take effect
                          immediately. Use strong passwords and enable two-factor
                          authentication when available.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </Card>

      {/* Right Panel - Additional Info */}
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quick Stats
          </h3>

          <div className="space-y-3">
            {/* Security Logs Count */}
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <p className="text-xs text-[#999999] mb-1">Security Logs</p>
              <p className="text-2xl font-bold text-white">{securityLogs.length}</p>
            </div>

            {/* Suspicious Activity Count */}
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <p className="text-xs text-[#999999] mb-1">Suspicious Events</p>
              <p className="text-2xl font-bold text-red-400">
                {securityLogs.filter((log) => log.is_suspicious).length}
              </p>
            </div>

            {/* Active Roles Count */}
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <p className="text-xs text-[#999999] mb-1">Active Roles</p>
              <p className="text-2xl font-bold text-white">{userRoles.length}</p>
            </div>

            {/* Blocked IPs Count */}
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <p className="text-xs text-[#999999] mb-1">Blocked IPs</p>
              <p className="text-2xl font-bold text-[#f59e0b]">
                {failedAttempts.filter((attempt) => attempt.is_blocked).length}
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#6366f1] mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[#999999]">
                <p className="font-medium text-white mb-1">Security Tips</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Monitor suspicious activity regularly</li>
                  <li>Review security logs weekly</li>
                  <li>Update passwords periodically</li>
                  <li>Limit admin role assignments</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Confirmation Dialogs */}
      <AlertDialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          setActionDialog({ open, type: null })
        }
      >
        <AlertDialogContent className="bg-[#1a1a1a] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {actionDialog.type === "update-email" && "Update Email Address"}
              {actionDialog.type === "update-password" && "Update Password"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#999999]">
              {actionDialog.type === "update-email" &&
                "You will receive a confirmation email at your new address. Please verify to complete the change."}
              {actionDialog.type === "update-password" &&
                "Your password will be updated immediately. Make sure to remember your new password."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.05] text-white border-white/[0.08] hover:bg-white/[0.1]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionDialog.type === "update-email") {
                  handleUpdateEmail();
                } else if (actionDialog.type === "update-password") {
                  handleUpdatePassword();
                }
              }}
              className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:opacity-90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
