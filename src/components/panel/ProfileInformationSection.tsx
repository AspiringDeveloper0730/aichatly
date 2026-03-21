
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Save, Lock, User, Globe } from "lucide-react";
import { toast } from "sonner";

export function ProfileInformationSection() {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        fullName: profile.full_name || "",
        email: profile.email || "",
      }));
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Refresh the profile data to reflect changes immediately
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (updatedProfile) {
        // Force a re-render by triggering auth state change
        window.location.reload();
      }

      toast.success(language === "tr" ? "Profil güncellendi" : "Profile updated");
    } catch (error) {
      toast.error(language === "tr" ? "Güncelleme başarısız" : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error(language === "tr" ? "Şifreler eşleşmiyor" : "Passwords don't match");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error(language === "tr" ? "Şifre en az 6 karakter olmalı" : "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (error) throw error;

      toast.success(language === "tr" ? "Şifre değiştirildi" : "Password changed");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (error) {
      toast.error(language === "tr" ? "Şifre değiştirilemedi" : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#1a1a1a] border-white/[0.08] p-8">
      <h2 className="text-2xl font-bold text-white mb-6">
        {language === "tr" ? "Profil Bilgileri" : "Profile Information"}
      </h2>

      <div className="space-y-8">
        {/* Profile Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            {language === "tr" ? "Kişisel Bilgiler" : "Personal Information"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">{language === "tr" ? "Ad Soyad" : "Full Name"}</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="bg-[#2a2a2a] border-white/[0.08] text-white"
              />
            </div>

            <div>
              <Label className="text-white">{language === "tr" ? "E-posta" : "Email"}</Label>
              <Input
                value={formData.email}
                disabled
                className="bg-[#2a2a2a] border-white/[0.08] text-white opacity-50"
              />
            </div>
          </div>

          <Button
            onClick={handleUpdateProfile}
            disabled={loading}
            className="bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
          >
            <Save className="w-4 h-4 mr-2" />
            {language === "tr" ? "Profili Güncelle" : "Update Profile"}
          </Button>
        </div>

        {/* Password Change */}
        <div className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {language === "tr" ? "Şifre Değiştir" : "Change Password"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">{language === "tr" ? "Mevcut Şifre" : "Current Password"}</Label>
              <Input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="bg-[#2a2a2a] border-white/[0.08] text-white"
              />
            </div>

            <div>
              <Label className="text-white">{language === "tr" ? "Yeni Şifre" : "New Password"}</Label>
              <Input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="bg-[#2a2a2a] border-white/[0.08] text-white"
              />
            </div>

            <div>
              <Label className="text-white">{language === "tr" ? "Şifre Tekrar" : "Confirm Password"}</Label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="bg-[#2a2a2a] border-white/[0.08] text-white"
              />
            </div>
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={loading || !formData.newPassword}
            className="bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
          >
            <Lock className="w-4 h-4 mr-2" />
            {language === "tr" ? "Şifreyi Değiştir" : "Change Password"}
          </Button>
        </div>

        {/* Referral Code */}
        <div className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {language === "tr" ? "Referans Kodunuz" : "Your Referral Code"}
          </h3>
          <p className="text-sm text-[#999999]">
            {language === "tr"
              ? "Arkadaşlarınızı davet edin ve kazanç elde edin. Detaylar için Ortaklık Programı bölümüne bakın."
              : "Invite your friends and earn. Check the Affiliate Program section for details."}
          </p>
        </div>
      </div>
    </Card>
  );
}
