
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, isAdmin, loading: authLoading, roleLoading } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect based on AuthContext state when user is logged in
  useEffect(() => {
    if (!authLoading && !roleLoading && user) {
      router.replace(isAdmin ? "/admin" : "/panel");
    }
  }, [authLoading, roleLoading, user, isAdmin, router]);

  const isEmail = (input: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const normalizedIdentifier = emailOrUsername.trim();
      const isEmailInput = isEmail(normalizedIdentifier);
      let loginEmail = normalizedIdentifier;

      if (!isEmailInput) {
        // Username login: find email first
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .ilike("full_name", normalizedIdentifier)
          .maybeSingle();

        if (profileError || !profileData?.email) {
          throw new Error("Invalid email or password");
        }

        loginEmail = profileData.email;
      }

      // Login with email
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.toLowerCase(),
        password,
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("email not confirmed")) {
          throw new Error("Please confirm your email before logging in.");
        }
        throw new Error("Invalid email or password");
      }

      // Success - let the useEffect handle redirect
      toast.success("Login successful!");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Invalid email or password");
    } finally {
      // Always reset loading state, even on success
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/popup-callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const popupWindow = window.open(data.url, "google-login", "width=500,height=600");

        const closePopupAndCleanup = () => {
          popupWindow?.close();
          window.removeEventListener("message", onMessage);
        };

        const onMessage = (messageEvent: MessageEvent) => {
          if (messageEvent.origin !== window.location.origin) return;
          if (messageEvent.data?.type === "google-oauth-success") {
            closePopupAndCleanup();
          }
        };

        window.addEventListener("message", onMessage);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            closePopupAndCleanup();
            subscription.unsubscribe();
            toast.success("Google sign-in successful!");
            // Let the useEffect handle redirect
          }
        });

        setTimeout(() => {
          if (popupWindow && !popupWindow.closed) {
            closePopupAndCleanup();
          }
        }, 60000);
      }
    } catch (error: any) {
      toast.error(error?.message || "Google sign-in failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
            <div className="w-10 h-10 rounded-lg gradient-blue-purple flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-[oklch(0.55_0.22_264)] to-[oklch(0.55_0.25_300)] bg-clip-text text-transparent">
              Aichatly
            </span>
          </Link>
        </div>

        {/* Form */}
        <div className="bg-card p-8 rounded-2xl border border-border shadow-xl">
          <h1 className="text-2xl font-bold text-center mb-6">{t("auth.signIn")}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="emailOrUsername">{t("auth.emailOrUsername")}</Label>
              <Input
                id="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                className="mt-1"
                placeholder="Enter email or username"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
                placeholder="Enter password"
                disabled={loading}
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
                  Signing in...
                </span>
              ) : (
                t("auth.signIn")
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">OR</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("auth.googleSignIn")}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="text-primary hover:underline">
              {t("auth.signUp")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
