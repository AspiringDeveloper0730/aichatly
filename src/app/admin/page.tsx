
"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdminPanelCards } from "@/components/admin/AdminPanelCards";
import { UserManagementSection } from "@/components/admin/UserManagementSection";
import { CharacterManagementSection } from "@/components/admin/CharacterManagementSection";
import { PackageManagementSection } from "@/components/admin/PackageManagementSection";
import { ReferralManagementSection } from "@/components/admin/ReferralManagementSection";
import { PendingWithdrawalsSection } from "@/components/admin/PendingWithdrawalsSection";
import { SiteContentManagementSection } from "@/components/admin/SiteContentManagementSection";
import { SettingsManagementSection } from "@/components/admin/SettingsManagementSection";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shield } from "lucide-react";

export type AdminSection =
  | "users"
  | "characters"
  | "packages"
  | "referrals"
  | "withdrawals"
  | "content"
  | "settings"
  | null;

export default function AdminPanelPage() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>(null);

  useEffect(() => {
    // Only redirect after both loading and roleLoading are complete
    if (!loading && !roleLoading) {
      if (!user) {
        // Not logged in - redirect to login
        router.replace("/login");
      } else if (!isAdmin) {
        // Logged in but not admin - redirect to user panel
        router.replace("/panel");
      }
    }
  }, [user, isAdmin, loading, roleLoading, router]);

  // Show minimal loading state ONLY during initial auth resolution
  // Once a user exists, keep showing the admin UI even if roleLoading toggles (e.g. token refresh)
  if (!user && (loading || roleLoading)) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authorized (will redirect)
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <Navbar />

      <main className="pt-24 pb-12 flex-1 bg-[#121212]">
        <div className="container mx-auto px-4 space-y-8">
          {/* Page Title */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <Shield className="w-8 h-8 text-[#6366f1]" />
              <h1 className="text-3xl md:text-4xl font-bold text-white">Admin Panel</h1>
            </div>
            <p className="text-[#999999] text-lg">Manage platform settings and content</p>
          </div>

          {/* Admin Cards */}
          <AdminPanelCards activeSection={activeSection} onSectionChange={setActiveSection} />

          {/* Detailed Section */}
          {activeSection === "users" && <UserManagementSection />}
          {activeSection === "characters" && <CharacterManagementSection />}
          {activeSection === "packages" && <PackageManagementSection />}
          {activeSection === "referrals" && <ReferralManagementSection />}
          {activeSection === "withdrawals" && <PendingWithdrawalsSection />}
          {activeSection === "content" && <SiteContentManagementSection />}
          {activeSection === "settings" && <SettingsManagementSection />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
