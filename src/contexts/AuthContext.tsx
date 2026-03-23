
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { getUserAdminStatus } from "@/lib/admin-utils";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  language: string | null;
  is_premium: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  roleLoading: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<void>;
  signUp: (emailOrUsername: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // Initialize both to true — async session init happens immediately on mount,
  // so child components must wait before making any routing decisions.
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    // Initialize session — await profile + admin checks before clearing loading flags
    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          console.error("[Auth] getSession error:", error);
          setLoading(false);
          setRoleLoading(false);
          return;
        }

        if (!alive) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            await Promise.all([
              fetchProfile(session.user.id),
              checkAdminStatus(session.user.id),
            ]);
          } catch (err) {
            console.error("[Auth] background fetch error:", err);
          }
        }

        setLoading(false);
        setRoleLoading(false);
      })
      .catch((error) => {
        console.error("[Auth] init error:", error);
        setLoading(false);
        setRoleLoading(false);
      });

    const handleAuthStateChange = async (event: string, session: Session | null) => {
      if (!alive) {
        setRoleLoading(false);
        return;
      }

      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setIsAdmin(false);
        setRoleLoading(false);
        return;
      }

      // Token refresh events can be frequent; avoid re-querying profile/admin
      // to prevent unnecessary Supabase traffic and callback contention.
      if (event === "TOKEN_REFRESHED") {
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);
      try {
        await Promise.all([
          fetchProfile(nextUser.id),
          checkAdminStatus(nextUser.id),
        ]);
      } catch (err) {
        console.error("[Auth] auth change fetch error:", err);
      } finally {
        setRoleLoading(false);
      }
    };

    // Keep callback synchronous; schedule async work outside of Supabase callback
    // to avoid potential deadlocks with nested Supabase calls.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void handleAuthStateChange(event, session);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("[Auth] profile fetch error:", error);
        return;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("[Auth] profile fetch error:", error);
    }
  };

  const checkAdminStatus = async (userId: string) => {
    try {
      const adminStatus = await getUserAdminStatus(userId);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error("[Auth] admin check error:", error);
      setIsAdmin(false);
    }
  };

  const isEmail = (input: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  const signIn = async (emailOrUsername: string, password: string) => {
    const isEmailInput = isEmail(emailOrUsername);

    if (isEmailInput) {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password,
      });

      if (error) {
        throw new Error("Invalid email or password");
      }
    } else {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("full_name", emailOrUsername)
        .maybeSingle();

      if (profileError || !profileData?.email) {
        throw new Error("Invalid email or password");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password,
      });

      if (error) {
        throw new Error("Invalid email or password");
      }
    }
  };

  const signUp = async (emailOrUsername: string, password: string) => {
    const isEmailInput = isEmail(emailOrUsername);

    const email = isEmailInput
      ? emailOrUsername
      : `${emailOrUsername}@aichatly.temp`;

    const username = isEmailInput ? email.split("@")[0] : emailOrUsername;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/panel`,
        data: {
          full_name: username,
          email_confirmed: true,
        },
      },
    });

    if (error) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes("already registered") ||
        errorMessage.includes("already exists")
      ) {
        throw new Error(
          "This email is already registered. Please login instead."
        );
      }
      throw new Error(error.message || "Registration failed");
    }

    if (data.session) {
      return;
    }

    if (data.user) {
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw new Error("Registration successful! Please try logging in.");
        }

        return;
      } catch (loginError: any) {
        throw new Error("Registration successful! Please try logging in.");
      }
    }

    throw new Error("Registration completed. Please try logging in.");
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    // Immediately clear local auth state so UI always reflects logout,
    // even if auth listener events are delayed.
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setRoleLoading(false);
    setLoading(false);

    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (data?.url) {
      const popupWindow = window.open(
        data.url,
        "google-login",
        "width=500,height=600"
      );

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          popupWindow?.close();
          subscription.unsubscribe();
        }
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        roleLoading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
