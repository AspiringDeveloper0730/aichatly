
"use client";

import React, { useState, useEffect } from "react";
import { UserPanelCards } from "@/components/panel/UserPanelCards";
import { CreateCharacterSection } from "@/components/panel/CreateCharacterSection";
import { MyCharactersSection } from "@/components/panel/MyCharactersSection";
import { AffiliateProgramSection } from "@/components/panel/AffiliateProgramSection";
import { PackageDetailsSection } from "@/components/panel/PackageDetailsSection";
import { ProfileInformationSection } from "@/components/panel/ProfileInformationSection";
import { QuotaTracker } from "@/components/panel/QuotaTracker";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import Image from "next/image";

export type PanelSection = "create-character" | "my-characters" | "affiliate" | "packages" | "profile" | null;

export function UserPanelContent() {
  const { t } = useLanguage();
  const { user, loading, roleLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<PanelSection>(null);

  useEffect(() => {
    // Only redirect if both loading and roleLoading are complete and no user
    if (!loading && !roleLoading && !user) {
      router.replace("/login");
    }
  }, [user, loading, roleLoading, router]);

  // Auto-open create-character section if URL parameter is present
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "create-character") {
      setActiveSection("create-character");
    }
  }, [searchParams]);

  // Show minimal loading state ONLY during initial auth resolution
  // Once a user exists, keep showing the panel even if roleLoading toggles (e.g. token refresh)
  if (!user && (loading || roleLoading)) {
    return (
      <div className="container mx-auto px-4 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/Logo.png"
            alt="Logo"
            width={180}
            height={60}
            className="h-12 w-auto object-contain"
            priority
          />
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render anything if no user (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 space-y-8">
      {/* Invisible quota tracker — listens for smsUsed / characterCreated / fileUploaded events */}
      <QuotaTracker />

      {/* Page Title */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          {t("panel.title") || "User Panel"}
        </h1>
        <p className="text-[#999999] text-lg">
          {t("panel.subtitle") || "Manage your account, characters, and settings"}
        </p>
      </div>

      {/* Top Cards */}
      <UserPanelCards activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Detailed Section */}
      {activeSection === "create-character" && <CreateCharacterSection />}
      {activeSection === "my-characters" && <MyCharactersSection />}
      {activeSection === "affiliate" && <AffiliateProgramSection />}
      {activeSection === "packages" && <PackageDetailsSection />}
      {activeSection === "profile" && <ProfileInformationSection />}
    </div>
  );
}
