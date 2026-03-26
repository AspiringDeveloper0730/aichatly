
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Menu, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const NAV_LOGO = {
  src: "/Logo.png",
  width: 180,
  height: 60,
  className: "h-11 md:h-12 w-auto object-contain",
};

export function Navbar() {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkViewport = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1200);
    };
    
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleMenuClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      handleMenuClose();
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error(language === "tr" ? "Çıkış yapılamadı" : "Logout failed");
    }
  }, [signOut, handleMenuClose, router, language]);

  const menuItems = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.prices"), href: "/pricing" },
    { label: t("nav.contact"), href: "/contact" },
    { label: t("nav.faq"), href: "/faq" },
    { label: t("sidebar.chat"), href: "/chat" },
    { label: "Blog", href: "/blog" },
  ];

  if (!mounted) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-[1000] w-full h-[72px] bg-[#0A0A1F] border-b border-border shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src={NAV_LOGO.src}
              alt="Logo"
              width={NAV_LOGO.width}
              height={NAV_LOGO.height}
              className={NAV_LOGO.className}
              priority
            />
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] w-full h-[72px] bg-[#0A0A1F] border-b border-border shadow-sm">
      {!isMobile && !isTablet && (
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src={NAV_LOGO.src}
              alt="Logo"
              width={NAV_LOGO.width}
              height={NAV_LOGO.height}
              className={NAV_LOGO.className}
              priority
            />
          </Link>

          <div className="flex items-center gap-8">
            {menuItems.map((item) => (
              <div key={item.href}>
                {item.onClick ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={item.onClick}
                    className="text-base font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 whitespace-nowrap"
                  >
                    {item.label}
                  </Button>
                ) : (
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-base font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 whitespace-nowrap"
                    >
                      {item.label}
                    </Button>
                  </Link>
                )}
              </div>
            ))}

            <Link href="/panel?section=create-character">
              <button className="create-character-btn whitespace-nowrap">
                {t("sidebar.createCharacter")}
              </button>
            </Link>
          </div>

          <div className="flex items-center gap-5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-base font-medium text-foreground hover:bg-transparent hover:text-foreground active:bg-transparent active:text-foreground transition-all duration-300 whitespace-nowrap"
                >
                  <Globe className="w-4 h-4" />
                  <span>{t("sidebar.language")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem
                  onClick={() => setLanguage("en")}
                  className={cn(language === "en" && "bg-accent text-accent-foreground")}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLanguage("tr")}
                  className={cn(language === "tr" && "bg-accent text-accent-foreground")}
                >
                  Türkçe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-base font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 whitespace-nowrap"
                  >
                    {t("nav.profile")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border">
                  <DropdownMenuItem asChild>
                    <Link href="/panel">{t("nav.profile")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-base font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 whitespace-nowrap"
                >
                  {t("nav.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {(isMobile || isTablet) && (
        <div className="w-full max-w-[100vw] mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src={NAV_LOGO.src}
              alt="Logo"
              width={NAV_LOGO.width}
              height={NAV_LOGO.height}
              className={NAV_LOGO.className}
              priority
            />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-w-[48px] min-h-[48px] w-12 h-12 text-foreground hover:text-foreground hover:bg-accent flex-shrink-0"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>
      )}

      {isMobile && mobileMenuOpen && (
        <div className="fixed top-[72px] right-0 w-[36%] max-w-[280px] h-[calc(100vh-72px)] bg-[#0A0A1F] z-[2000] shadow-2xl overflow-y-auto border-l border-border">
          <div className="px-3 py-4 flex flex-col gap-2.5 items-center">
            {menuItems.map((item) => (
              <div key={item.href} className="w-full">
                {item.onClick ? (
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      item.onClick(e);
                      handleMenuClose();
                    }}
                    className="w-full text-sm font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 py-3 justify-center"
                  >
                    {item.label}
                  </Button>
                ) : (
                  <Link href={item.href} onClick={handleMenuClose}>
                    <Button
                      variant="ghost"
                      className="w-full text-sm font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 py-3 justify-center"
                    >
                      {item.label}
                    </Button>
                  </Link>
                )}
              </div>
            ))}

            <Link href="/panel?section=create-character" onClick={handleMenuClose} className="w-full">
              <button className="create-character-btn w-full py-3 text-sm text-center">
                {t("sidebar.createCharacter")}
              </button>
            </Link>

            <div className="flex flex-col gap-2 pt-3 border-t border-border w-full">
              <p className="text-xs font-medium text-muted-foreground text-center">
                {t("sidebar.language")}
              </p>
              <div className="flex flex-col gap-2 w-full">
                <Button
                  variant={language === "en" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLanguage("en");
                    handleMenuClose();
                  }}
                  className="w-full text-sm py-2"
                >
                  English
                </Button>
                <Button
                  variant={language === "tr" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLanguage("tr");
                    handleMenuClose();
                  }}
                  className="w-full text-sm py-2"
                >
                  Türkçe
                </Button>
              </div>
            </div>

            {user ? (
              <div className="flex flex-col gap-2 pt-3 border-t border-border w-full">
                <Link href="/panel" onClick={handleMenuClose}>
                  <Button
                    variant="ghost"
                    className="w-full text-sm font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 py-3"
                  >
                    {t("nav.profile")}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full text-sm font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 py-3"
                  onClick={handleSignOut}
                >
                  {t("nav.logout")}
                </Button>
              </div>
            ) : (
              <Link href="/login" onClick={handleMenuClose} className="w-full">
                <Button
                  variant="ghost"
                  className="w-full text-sm font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 py-3 border-t border-border mt-2"
                >
                  {t("nav.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {isTablet && mobileMenuOpen && (
        <div className="fixed top-[72px] right-0 w-[18%] max-w-[200px] h-[calc(100vh-72px)] bg-[#0A0A1F] z-[2000] shadow-2xl overflow-y-auto border-l border-border">
          <div className="px-2 py-3 flex flex-col gap-1.5 items-center">
            {menuItems.map((item) => (
              <div key={item.href} className="w-auto">
                {item.onClick ? (
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      item.onClick(e);
                      handleMenuClose();
                    }}
                    className="text-xs font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 py-2 px-3 h-auto whitespace-nowrap"
                  >
                    {item.label}
                  </Button>
                ) : (
                  <Link href={item.href} onClick={handleMenuClose}>
                    <Button
                      variant="ghost"
                      className="text-xs font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 py-2 px-3 h-auto whitespace-nowrap"
                    >
                      {item.label}
                    </Button>
                  </Link>
                )}
              </div>
            ))}

            <Link href="/panel?section=create-character" onClick={handleMenuClose} className="w-auto">
              <button className="create-character-btn py-2 px-3 text-xs text-center whitespace-nowrap">
                {t("sidebar.createCharacter")}
              </button>
            </Link>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-border w-full">
              <p className="text-[10px] font-medium text-muted-foreground text-center">
                {t("sidebar.language")}
              </p>
              <div className="flex flex-col gap-1.5 w-full items-center">
                <Button
                  variant={language === "en" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLanguage("en");
                    handleMenuClose();
                  }}
                  className="text-xs py-1.5 px-3 h-auto w-auto whitespace-nowrap"
                >
                  English
                </Button>
                <Button
                  variant={language === "tr" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLanguage("tr");
                    handleMenuClose();
                  }}
                  className="text-xs py-1.5 px-3 h-auto w-auto whitespace-nowrap"
                >
                  Türkçe
                </Button>
              </div>
            </div>

            {user ? (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-border w-full items-center">
                <Link href="/panel" onClick={handleMenuClose}>
                  <Button
                    variant="ghost"
                    className="text-xs font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 py-2 px-3 h-auto whitespace-nowrap"
                  >
                    {t("nav.profile")}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="text-xs font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 py-2 px-3 h-auto whitespace-nowrap"
                  onClick={handleSignOut}
                >
                  {t("nav.logout")}
                </Button>
              </div>
            ) : (
              <Link href="/login" onClick={handleMenuClose} className="w-auto">
                <Button
                  variant="ghost"
                  className="text-xs font-medium text-foreground hover:text-foreground hover:bg-accent transition-all duration-300 py-2 px-3 border-t border-border mt-1.5 h-auto whitespace-nowrap"
                >
                  {t("nav.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
