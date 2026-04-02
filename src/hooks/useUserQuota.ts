
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserQuota {
  id: string;
  user_id: string;
  subscription_id: string | null;
  package_tier: string;
  sms_used: number;
  sms_limit: number;
  character_creation_used: number;
  character_creation_limit: number;
  file_upload_used_today: number;
  file_upload_daily_limit: number;
  file_upload_total_used: number;
  file_upload_total_limit: number;
  period_start: string;
  period_end: string | null;
  daily_reset_at: string;
  is_active: boolean;
}

export function useUserQuota(userId: string | undefined) {
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuota = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_quotas")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("[useUserQuota] fetch error:", error);
        setLoading(false);
        return;
      }

      if (!data) {
        setQuota(null);
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      // Check expiration first
      const isExpired =
        data.period_end != null && new Date() > new Date(data.period_end);

      if (data.daily_reset_at !== today) {
        // Daily reset needed
        const updates: Record<string, unknown> = {
          file_upload_used_today: 0,
          daily_reset_at: today,
        };

        // Free tier: reset SMS limit to base 10 and clear used count
        if (data.package_tier === "free") {
          updates.sms_limit = 10;
          updates.sms_used = 0;
        }

        // Mark expired
        if (isExpired) {
          updates.is_active = false;
        }

        const { data: updated } = await supabase
          .from("user_quotas")
          .update(updates)
          .eq("id", data.id)
          .select()
          .maybeSingle();

        if (updated && updated.is_active) {
          setQuota(updated as UserQuota);
        } else {
          setQuota(null);
        }
      } else {
        // No daily reset needed — just check expiration
        if (isExpired) {
          await supabase
            .from("user_quotas")
            .update({ is_active: false })
            .eq("id", data.id);
          setQuota(null);
        } else {
          setQuota(data as UserQuota);
        }
      }
    } catch (err) {
      console.error("[useUserQuota] unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  // Increment SMS usage by 1
  const decrementSms = useCallback(async () => {
    if (!quota) return;
    if (quota.sms_used >= quota.sms_limit) return;

    const newUsed = quota.sms_used + 1;
    setQuota((prev) => (prev ? { ...prev, sms_used: newUsed } : prev));

    try {
      await supabase
        .from("user_quotas")
        .update({ sms_used: newUsed, updated_at: new Date().toISOString() })
        .eq("id", quota.id);
    } catch (err) {
      console.error("[useUserQuota] decrementSms error:", err);
      setQuota((prev) => (prev ? { ...prev, sms_used: quota.sms_used } : prev));
    }
  }, [quota]);

  // Increment character creation usage by 1
  const decrementCharacterCreation = useCallback(async () => {
    if (!quota) return;
    if (quota.character_creation_used >= quota.character_creation_limit) return;

    const newUsed = quota.character_creation_used + 1;
    setQuota((prev) =>
      prev ? { ...prev, character_creation_used: newUsed } : prev
    );

    try {
      await supabase
        .from("user_quotas")
        .update({
          character_creation_used: newUsed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quota.id);
    } catch (err) {
      console.error("[useUserQuota] decrementCharacterCreation error:", err);
      setQuota((prev) =>
        prev
          ? { ...prev, character_creation_used: quota.character_creation_used }
          : prev
      );
    }
  }, [quota]);

  // Increment file upload usage — returns false if daily limit exceeded
  const decrementFileUpload = useCallback(async (): Promise<boolean> => {
    if (!quota) return true;

    if (quota.file_upload_used_today >= quota.file_upload_daily_limit) {
      return false;
    }

    const newToday = quota.file_upload_used_today + 1;
    const newTotal = quota.file_upload_total_used + 1;
    setQuota((prev) =>
      prev
        ? {
            ...prev,
            file_upload_used_today: newToday,
            file_upload_total_used: newTotal,
          }
        : prev
    );

    try {
      await supabase
        .from("user_quotas")
        .update({
          file_upload_used_today: newToday,
          file_upload_total_used: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quota.id);
      return true;
    } catch (err) {
      console.error("[useUserQuota] decrementFileUpload error:", err);
      setQuota((prev) =>
        prev
          ? {
              ...prev,
              file_upload_used_today: quota.file_upload_used_today,
              file_upload_total_used: quota.file_upload_total_used,
            }
          : prev
      );
      return true;
    }
  }, [quota]);

  return {
    quota,
    loading,
    fetchQuota,
    decrementSms,
    decrementCharacterCreation,
    decrementFileUpload,
  };
}
