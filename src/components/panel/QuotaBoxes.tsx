
"use client";

import React from "react";
import { MessageSquare, Users, FileText, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import type { UserQuota } from "@/hooks/useUserQuota";

interface QuotaBoxesProps {
  quota: UserQuota | null;
  loading: boolean;
}

interface QuotaBoxProps {
  icon: React.ReactNode;
  labelEn: string;
  labelTr: string;
  used: number;
  limit: number;
  subLabelEn?: string;
  subLabelTr?: string;
  subUsed?: number;
  subLimit?: number;
}

function QuotaBox({
  icon,
  labelEn,
  labelTr,
  used,
  limit,
  subLabelEn,
  subLabelTr,
  subUsed,
  subLimit,
}: QuotaBoxProps) {
  const { language } = useLanguage();
  const remaining = Math.max(0, limit - used);
  const isExpired = remaining === 0;
  const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  const label = language === "tr" ? labelTr : labelEn;
  const subLabel = language === "tr" ? subLabelTr : subLabelEn;

  const expiredText = language === "tr" ? "Tükendi" : "Expired";
  const warningText =
    language === "tr"
      ? "Haklarınız tükendi. Paketinizi yükseltin veya yeni bir tane satın alın."
      : "Your rights have expired. Upgrade your package or purchase a new one.";

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
          isExpired
            ? "bg-red-500/10 border-red-500/30"
            : "bg-[#2a2a2a] border-white/[0.08]"
        }`}
      >
        {/* Icon */}
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
            isExpired
              ? "bg-red-500/20"
              : "bg-gradient-to-br from-[#6366f1] to-[#a855f7]"
          }`}
        >
          {icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#999999] mb-1">{label}</p>
          {isExpired ? (
            <p className="text-lg font-bold text-red-400">{expiredText}</p>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">
                {remaining.toLocaleString()}
              </span>
              <span className="text-sm text-[#666666]">
                / {limit.toLocaleString()}
              </span>
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isExpired
                  ? "bg-red-500"
                  : percentage > 80
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Sub-label (daily limit for files) */}
          {subLabel && subLimit !== undefined && subUsed !== undefined && (
            <p className="text-xs text-[#666666] mt-1">
              {subLabel}:{" "}
              <span className="text-[#999999]">
                {Math.max(0, subLimit - subUsed)}/{subLimit}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Expired warning */}
      {isExpired && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{warningText}</p>
        </div>
      )}
    </div>
  );
}

export function QuotaBoxes({ quota, loading }: QuotaBoxesProps) {
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-[#2a2a2a] rounded-xl border border-white/[0.08] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!quota) {
    return (
      <div className="p-4 bg-[#2a2a2a] rounded-xl border border-white/[0.08] text-center">
        <p className="text-sm text-[#999999]">
          {language === "tr"
            ? "Aktif paket bulunamadı. Kota bilgisi görüntülenemiyor."
            : "No active package found. Quota information unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* SMS Quota */}
      <QuotaBox
        icon={<MessageSquare className="w-5 h-5 text-white" />}
        labelEn="Total SMS Rights"
        labelTr="Toplam SMS Hakkı"
        used={quota.sms_used}
        limit={quota.sms_limit}
      />

      {/* Character Creation Quota */}
      <QuotaBox
        icon={<Users className="w-5 h-5 text-white" />}
        labelEn="Total Character Creation Rights"
        labelTr="Toplam Karakter Oluşturma Hakkı"
        used={quota.character_creation_used}
        limit={quota.character_creation_limit}
      />

      {/* File Upload Quota */}
      <QuotaBox
        icon={<FileText className="w-5 h-5 text-white" />}
        labelEn="Total PDF/File Upload Rights"
        labelTr="Toplam PDF/Dosya Yükleme Hakkı"
        used={quota.file_upload_total_used}
        limit={quota.file_upload_total_limit}
        subLabelEn="Daily remaining"
        subLabelTr="Günlük kalan"
        subUsed={quota.file_upload_used_today}
        subLimit={quota.file_upload_daily_limit}
      />
    </div>
  );
}
