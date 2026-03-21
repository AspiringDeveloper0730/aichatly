"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const timeouts: NodeJS.Timeout[] = [];

    // Listen for auth state changes (when user clicks reset link)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === "PASSWORD_RECOVERY" && session) {
        setIsValidToken(true);
      } else if (event === "SIGNED_IN" && session) {
        // Check if this is a recovery session
        const { data: { user } } = await supabase.auth.getUser();
        if (user && mounted) {
          setIsValidToken(true);
        }
      }
    });

    // Check initial session state and hash fragments
    const checkSession = async () => {
      try {
        // Check if we have hash fragments in the URL (Supabase password reset links)
        const hash = window.location.hash;
        const hasRecoveryHash = hash && (hash.includes("type=recovery") || hash.includes("access_token"));
        
        if (hasRecoveryHash) {
          // Supabase automatically processes hash fragments, but we need to wait
          // Check immediately first, then try multiple times with increasing delays
          let foundSession = false;
          
          // Immediate check
          const immediateCheck = async () => {
            if (!mounted || foundSession) return;
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                foundSession = true;
                setIsValidToken(true);
              }
            } catch (err) {
              console.error("Immediate session check error:", err);
            }
          };
          
          immediateCheck();
          
          // Then check with delays
          const checkAttempts = [100, 500, 1000, 2000, 3000];
          
          checkAttempts.forEach((delay, index) => {
            const timeout = setTimeout(async () => {
              if (!mounted || foundSession) return;
              
              try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (session) {
                  foundSession = true;
                  setIsValidToken(true);
                } else if (index === checkAttempts.length - 1 && !foundSession) {
                  // Last attempt failed - check one more time after a longer delay
                  setTimeout(async () => {
                    if (!mounted) return;
                    const { data: { session: finalSession } } = await supabase.auth.getSession();
                    setIsValidToken(!!finalSession);
                  }, 2000);
                }
              } catch (err) {
                console.error("Session check error:", err);
                if (index === checkAttempts.length - 1 && mounted) {
                  setIsValidToken(false);
                }
              }
            }, delay);
            
            timeouts.push(timeout);
          });
        } else {
          // No hash fragments - check session normally
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidToken(true);
          } else {
            setIsValidToken(false);
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
        if (mounted) {
          setIsValidToken(false);
        }
      }
    };

    // Wait for page to be fully loaded before checking
    if (typeof window !== "undefined") {
      if (document.readyState === "complete") {
        checkSession();
      } else {
        window.addEventListener("load", checkSession);
      }
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      timeouts.forEach(timeout => clearTimeout(timeout));
      if (typeof window !== "undefined") {
        window.removeEventListener("load", checkSession);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      toast.success(t("auth.passwordUpdated"));
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (error: any) {
      console.error("Password update error:", error);
      toast.error(error.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="bg-card p-8 rounded-2xl border border-border shadow-xl text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8">
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

          <div className="bg-card p-8 rounded-2xl border border-border shadow-xl text-center space-y-4">
            <h1 className="text-2xl font-bold">Invalid or Expired Link</h1>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                asChild
                className="w-full gradient-blue-purple text-white hover:opacity-90"
              >
                <Link href="/forgot-password">Request New Reset Link</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full"
              >
                <Link href="/login">{t("auth.backToLogin")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-center mb-6">
            {t("auth.resetPasswordTitle")}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">{t("auth.newPassword")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
                placeholder="Enter new password"
                disabled={loading}
                autoFocus
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1"
                placeholder="Confirm new password"
                disabled={loading}
                minLength={6}
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
                  Updating...
                </span>
              ) : (
                t("auth.updatePassword")
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
        </div>
      </div>
    </div>
  );
}
