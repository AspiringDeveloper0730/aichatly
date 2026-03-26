"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const isEmail = (input: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    if (!isEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Check if user exists by email or username
      let userEmail = email;
      
      // If input is not an email, try to find email from username
      if (!isEmail(email)) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("full_name", email)
          .maybeSingle();
        
        if (profileError || !profileData?.email) {
          // Don't reveal if user exists or not for security
          setEmailSent(true);
          setLoading(false);
          return;
        }
        
        userEmail = profileData.email;
      }

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        // Don't reveal if user exists or not for security
        console.error("Password reset error:", error);
      }

      // Always show success message for security (don't reveal if email exists)
      setEmailSent(true);
      toast.success(t("auth.resetLinkSent"));
    } catch (error: any) {
      console.error("Password reset error:", error);
      // Still show success for security
      setEmailSent(true);
      toast.success(t("auth.resetLinkSent"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <Image
              src="/Logo.png"
              alt="Logo"
              width={200}
              height={68}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Form */}
        <div className="bg-card p-8 rounded-2xl border border-border shadow-xl">
          {emailSent ? (
            <div className="space-y-4 text-center">
              <h1 className="text-2xl font-bold">{t("auth.resetPasswordTitle")}</h1>
              <p className="text-muted-foreground">
                {t("auth.resetLinkSent")}
              </p>
              <p className="text-sm text-muted-foreground">
                If an account with that email exists, you will receive a password reset link shortly.
              </p>
              <Button
                asChild
                className="w-full gradient-blue-purple text-white hover:opacity-90"
              >
                <Link href="/login">{t("auth.backToLogin")}</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">
                {t("auth.resetPasswordTitle")}
              </h1>
              <p className="text-center text-muted-foreground mb-6">
                {t("auth.resetPasswordDescription")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">{t("auth.emailOrUsername")}</Label>
                  <Input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1"
                    placeholder="Enter email or username"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-blue-purple text-white hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </span>
                  ) : (
                    t("auth.sendResetLink")
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-primary hover:underline"
                >
                  {t("auth.backToLogin")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
