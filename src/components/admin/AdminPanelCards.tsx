
"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Users, Sparkles, Package, TrendingUp, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminSection } from "@/app/admin/page";

interface AdminPanelCardsProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}

export function AdminPanelCards({ activeSection, onSectionChange }: AdminPanelCardsProps) {
  const cards = [
    {
      id: "users" as const,
      icon: Users,
      title: "User Management",
      gradient: "from-[#6366f1] to-[#a855f7]",
    },
    {
      id: "characters" as const,
      icon: Sparkles,
      title: "Character Management",
      gradient: "from-[#8b5cf6] to-[#ec4899]",
    },
    {
      id: "packages" as const,
      icon: Package,
      title: "Package Management",
      gradient: "from-[#f59e0b] to-[#ef4444]",
    },
    {
      id: "referrals" as const,
      icon: TrendingUp,
      title: "Referral Management",
      gradient: "from-[#10b981] to-[#3b82f6]",
    },
    {
      id: "content" as const,
      icon: FileText,
      title: "Site Content Management",
      gradient: "from-[#06b6d4] to-[#8b5cf6]",
    },
    {
      id: "settings" as const,
      icon: Settings,
      title: "Settings",
      gradient: "from-[#ec4899] to-[#f59e0b]",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeSection === card.id;

        return (
          <Card
            key={card.id}
            onClick={() => onSectionChange(card.id)}
            className={cn(
              "relative cursor-pointer transition-all duration-300 overflow-hidden group",
              "bg-[#1a1a1a] border-white/[0.08] hover:border-white/[0.2]",
              "hover:scale-105 hover:shadow-2xl",
              isActive && "ring-2 ring-[#6366f1] scale-105 shadow-2xl"
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
              <h3 className="text-base font-bold text-white text-center">{card.title}</h3>
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
