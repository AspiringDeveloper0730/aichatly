
"use client";

/**
 * QuotaTracker — invisible component mounted in the user panel.
 * Listens for quota-related custom events dispatched by other components
 * and updates the user_quotas table accordingly.
 *
 * Events consumed:
 *   - "smsUsed"          → dispatched by ChatMiddlePanel when user sends a message
 *   - "characterCreated" → dispatched by CreateCharacterSection when character is saved
 *   - "fileUploaded"     → dispatched by CharacterDevelopPanel when files are saved
 */

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserQuota } from "@/hooks/useUserQuota";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export function QuotaTracker() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { decrementSms, decrementCharacterCreation, decrementFileUpload, quota } =
    useUserQuota(user?.id);

  useEffect(() => {
    const handleSmsUsed = async () => {
      await decrementSms();
    };

    const handleCharacterCreated = async () => {
      await decrementCharacterCreation();
    };

    const handleFileUploaded = async (e: Event) => {
      const event = e as CustomEvent;
      const count: number = event?.detail?.count ?? 1;

      for (let i = 0; i < count; i++) {
        const allowed = await decrementFileUpload();
        if (!allowed) {
          toast.error(
            language === "tr"
              ? "Günlük dosya yükleme limitinize ulaştınız."
              : "You have reached your daily file upload limit."
          );
          break;
        }
      }
    };

    window.addEventListener("smsUsed", handleSmsUsed);
    window.addEventListener("characterCreated", handleCharacterCreated);
    window.addEventListener("fileUploaded", handleFileUploaded);

    return () => {
      window.removeEventListener("smsUsed", handleSmsUsed);
      window.removeEventListener("characterCreated", handleCharacterCreated);
      window.removeEventListener("fileUploaded", handleFileUploaded);
    };
  }, [decrementSms, decrementCharacterCreation, decrementFileUpload, language]);

  // Warn user when quota is nearly exhausted (≤10% remaining)
  useEffect(() => {
    if (!quota) return;

    const smsRemaining = quota.sms_limit - quota.sms_used;
    const charRemaining = quota.character_creation_limit - quota.character_creation_used;

    if (smsRemaining === 0) {
      // Already expired — QuotaBoxes shows the warning inline
    } else if (smsRemaining <= Math.ceil(quota.sms_limit * 0.1) && smsRemaining > 0) {
      // Low SMS warning — only show once per session via sessionStorage
      const key = `quota_sms_low_warned_${quota.id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        toast.warning(
          language === "tr"
            ? `SMS hakkınız azalıyor: ${smsRemaining} mesaj kaldı.`
            : `SMS quota running low: ${smsRemaining} messages remaining.`
        );
      }
    }

    if (charRemaining === 0) {
      // Expired — shown inline
    } else if (charRemaining === 1) {
      const key = `quota_char_low_warned_${quota.id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        toast.warning(
          language === "tr"
            ? "Son karakter oluşturma hakkınız kaldı."
            : "Only 1 character creation right remaining."
        );
      }
    }
  }, [quota, language]);

  return null; // Invisible component
}
