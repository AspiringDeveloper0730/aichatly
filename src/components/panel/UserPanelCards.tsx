
"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, Users, TrendingUp, Package, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PanelSection } from "@/app/panel/page";

interface UserPanelCardsProps {
  activeSection: PanelSection;
  onSectionChange: (section: PanelSection) => void;
}

export function UserPanelCards({ activeSection, onSectionChange }: UserPanelCardsProps) {
  const { language } = useLanguage();

  const cards = [
    {
      id: "create-character" as const,
      icon: Sparkles,
      titleEn: "Create Character",
      titleTr: "Karakter Oluştur",
      gradient: "from-[#6366f1] to-[#a855f7]",
      special: true,
    },
    {
      id: "my-characters" as const,
      icon: Users,
      titleEn: "My Characters",
      titleTr: "Karakterlerim",
      gradient: "from-[#8b5cf6] to-[#ec4899]",
    },
    {
      id: "affiliate" as const,
      icon: TrendingUp,
      titleEn: "Affiliate Program",
      titleTr: "Ortaklık Programı",
      gradient: "from-[#10b981] to-[#3b82f6]",
    },
    {
      id: "packages" as const,
      icon: Package,
      titleEn: "Package Details",
      titleTr: "Paket Detayları",
      gradient: "from-[#f59e0b] to-[#ef4444]",
    },
    {
      id: "profile" as const,
      icon: UserCircle,
      titleEn: "Profile Information",
      titleTr: "Profil Bilgileri",
      gradient: "from-[#06b6d4] to-[#8b5cf6]",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const title = language === "tr" ? card.titleTr : card.titleEn;
        const isActive = activeSection === card.id;

        return (
          <Card
            key={card.id}
            onClick={() => onSectionChange(card.id)}
            className={cn(
              "relative cursor-pointer transition-all duration-300 overflow-hidden group",
              "bg-[#1a1a1a] border-white/[0.08] hover:border-white/[0.2]",
              "hover:scale-105 hover:shadow-2xl",
              isActive && "ring-2 ring-[#6366f1] scale-105 shadow-2xl",
              card.special && "pulse-button glow-create-character"
            )}
          >
            {/* Gradient Background */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity",
                card.gradient
              )}
            />

            {/* Content */}
            <div className="relative p-6 flex flex-col items-center justify-center gap-4 min-h-[140px]">
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br transition-transform group-hover:scale-110",
                  card.gradient
                )}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-base font-bold text-white text-center">{title}</h3>
            </div>

            {/* Active Indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] to-[#a855f7]" />
            )}
          </Card>
        );
      })}
    </div>
  );
}
