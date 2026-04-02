
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  UserPlus,
  Globe,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const menuItems = [
    { icon: Home, label: t("nav.home"), href: "/", onClick: null },
    { icon: MessageSquare, label: t("sidebar.chat"), href: "/chat", onClick: null },
    { icon: UserPlus, label: t("sidebar.createCharacter"), href: "/create-character", onClick: null },
  ];

  // Mobile Sidebar (Hamburger Menu)
  if (isMobile) {
    return (
      <>
        {/* Hamburger Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="fixed top-20 left-4 z-50 bg-background/80 backdrop-blur-sm border border-border shadow-lg"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>

        {/* Mobile Sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <div className="flex flex-col h-full p-4 pt-8">
              {/* Menu Items */}
              <div className="flex-1 space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <div key={item.href}>
                      {item.onClick ? (
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            item.onClick(e);
                            setMobileOpen(false);
                          }}
                          className={cn(
                            "w-full justify-start gap-3 h-12 rounded-xl transition-smooth hover:scale-[1.02]",
                            isActive
                              ? "bg-gradient-to-r from-[oklch(0.55_0.22_264)] to-[oklch(0.55_0.25_300)] text-white border-l-4 border-[oklch(0.55_0.25_300)] glow-blue-purple"
                              : "hover:bg-sidebar-accent"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </Button>
                      ) : (
                        <Link href={item.href} onClick={() => setMobileOpen(false)}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-3 h-12 rounded-xl transition-smooth hover:scale-[1.02]",
                              isActive
                                ? "bg-gradient-to-r from-[oklch(0.55_0.22_264)] to-[oklch(0.55_0.25_300)] text-white border-l-4 border-[oklch(0.55_0.25_300)] glow-blue-purple"
                                : "hover:bg-sidebar-accent"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}

                {/* Language Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-12 rounded-xl transition-smooth hover:scale-[1.02] hover:bg-sidebar-accent"
                    >
                      <Globe className="w-5 h-5" />
                      <span className="font-medium">{t("sidebar.language")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem
                      onClick={() => setLanguage("en")}
                      className={cn(language === "en" && "bg-accent")}
                    >
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setLanguage("tr")}
                      className={cn(language === "tr" && "bg-accent")}
                    >
                      Türkçe
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-20 bottom-0 bg-sidebar border-r border-sidebar-border z-40 transition-smooth-long overflow-hidden",
          isOpen ? "w-[220px]" : "w-[70px]"
        )}
      >
        <div className="flex flex-col h-full p-4">
          {/* Menu Items */}
          <div className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <div key={item.href}>
                  {item.onClick ? (
                    <Button
                      variant="ghost"
                      onClick={item.onClick}
                      className={cn(
                        "w-full h-11 rounded-xl transition-smooth hover:scale-[1.03]",
                        isOpen ? "justify-start gap-3 px-3" : "justify-center px-0",
                        isActive
                          ? "bg-gradient-to-r from-[oklch(0.55_0.22_264)] to-[oklch(0.55_0.25_300)] text-white border-l-4 border-[oklch(0.55_0.25_300)] glow-blue-purple"
                          : "hover:bg-sidebar-accent"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {isOpen && <span className="font-medium truncate">{item.label}</span>}
                    </Button>
                  ) : (
                    <Link href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full h-11 rounded-xl transition-smooth hover:scale-[1.03]",
                          isOpen ? "justify-start gap-3 px-3" : "justify-center px-0",
                          isActive
                            ? "bg-gradient-to-r from-[oklch(0.55_0.22_264)] to-[oklch(0.55_0.25_300)] text-white border-l-4 border-[oklch(0.55_0.25_300)] glow-blue-purple"
                            : "hover:bg-sidebar-accent"
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {isOpen && <span className="font-medium truncate">{item.label}</span>}
                      </Button>
                    </Link>
                  )}
                </div>
              );
            })}

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-11 rounded-xl transition-smooth hover:scale-[1.03] hover:bg-sidebar-accent",
                    isOpen ? "justify-start gap-3 px-3" : "justify-center px-0"
                  )}
                >
                  <Globe className="w-5 h-5 flex-shrink-0" />
                  {isOpen && <span className="font-medium truncate">{t("sidebar.language")}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuItem
                  onClick={() => setLanguage("en")}
                  className={cn(language === "en" && "bg-accent")}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLanguage("tr")}
                  className={cn(language === "tr" && "bg-accent")}
                >
                  Türkçe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className={cn(
          "fixed top-24 z-50 transition-smooth-long rounded-r-xl bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-accent",
          isOpen ? "left-[220px]" : "left-[70px]"
        )}
      >
        <ChevronLeft
          className={cn(
            "w-5 h-5 transition-smooth",
            !isOpen && "rotate-180"
          )}
        />
      </Button>
    </>
  );
}
