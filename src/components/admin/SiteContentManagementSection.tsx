
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Tag,
  Image as ImageIcon,
  Save,
  Upload,
  MessageSquare,
  Settings,
  Eye,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { upload } from "@zoerai/integration";

interface SiteContent {
  id: string;
  content_key: string;
  content_type: string;
  title_en: string | null;
  title_tr: string | null;
  content_en: string | null;
  content_tr: string | null;
  placeholder_en: string | null;
  placeholder_tr: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface Banner {
  id: string;
  title_en: string | null;
  title_tr: string | null;
  description_en: string | null;
  description_tr: string | null;
  image_url: string;
  link_url: string | null;
  position: string;
  display_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  click_count: number;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name_en: string;
  name_tr: string;
  slug: string;
  icon_svg: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  description_en: string | null;
  description_tr: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

type ContentSection = "search" | "categories" | "banners" | null;

export function SiteContentManagementSection() {
  const [activeSection, setActiveSection] = useState<ContentSection>("search");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Site Content States
  const [siteContents, setSiteContents] = useState<SiteContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<SiteContent | null>(null);

  // Banner States
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Category States
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Free Chat Settings States
  const [freeChatSettings, setFreeChatSettings] = useState<{
    sms_free_chat_enabled: boolean;
    sms_free_chat_count: number;
    free_usage_enabled: boolean;
  }>({
    sms_free_chat_enabled: false,
    sms_free_chat_count: 5,
    free_usage_enabled: true,
  });

  // Fetch Site Contents
  const fetchSiteContents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      setSiteContents(data || []);
      if (data && data.length > 0 && !selectedContent) {
        setSelectedContent(data[0]);
      }
    } catch (error) {
      console.error("Error fetching site contents:", error);
      toast.error("Failed to load site contents");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Banners
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      setBanners(data || []);
      if (data && data.length > 0 && !selectedBanner) {
        setSelectedBanner(data[0]);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast.error("Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      setCategories(data || []);
      if (data && data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Free Chat Settings
  const fetchFreeChatSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .in("setting_key", [
          "sms_free_chat_enabled",
          "sms_free_chat_count",
          "free_usage_enabled",
        ]);

      if (error) throw error;

      const settings: any = {};
      data?.forEach((setting) => {
        if (setting.setting_type === "boolean") {
          settings[setting.setting_key] = setting.setting_value === "true";
        } else if (setting.setting_type === "number") {
          settings[setting.setting_key] = parseInt(setting.setting_value || "0");
        } else {
          settings[setting.setting_key] = setting.setting_value;
        }
      });

      setFreeChatSettings({
        sms_free_chat_enabled: settings.sms_free_chat_enabled ?? false,
        sms_free_chat_count: settings.sms_free_chat_count ?? 5,
        free_usage_enabled: settings.free_usage_enabled ?? true,
      });
    } catch (error) {
      console.error("Error fetching free chat settings:", error);
      toast.error("Failed to load free chat settings");
    }
  };

  // Save Site Content
  const handleSaveSiteContent = async () => {
    if (!selectedContent) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("site_content")
        .update({
          title_en: selectedContent.title_en,
          title_tr: selectedContent.title_tr,
          content_en: selectedContent.content_en,
          content_tr: selectedContent.content_tr,
          placeholder_en: selectedContent.placeholder_en,
          placeholder_tr: selectedContent.placeholder_tr,
          metadata: selectedContent.metadata,
          is_active: selectedContent.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedContent.id);

      if (error) throw error;

      toast.success("Content saved successfully");
      await fetchSiteContents();
    } catch (error) {
      console.error("Error saving site content:", error);
      toast.error("Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  // Save Banner
  const handleSaveBanner = async () => {
    if (!selectedBanner) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("banners")
        .update({
          title_en: selectedBanner.title_en,
          title_tr: selectedBanner.title_tr,
          description_en: selectedBanner.description_en,
          description_tr: selectedBanner.description_tr,
          link_url: selectedBanner.link_url,
          is_active: selectedBanner.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBanner.id);

      if (error) throw error;

      toast.success("Banner saved successfully");
      await fetchBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      toast.error("Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  // Upload Banner Image
  const handleBannerImageUpload = async (file: File) => {
    if (!selectedBanner) return;

    try {
      setUploadingBanner(true);

      const result = await upload.uploadWithPresignedUrl(file, {
        maxSize: 5 * 1024 * 1024,
        allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
      });

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      const { error } = await supabase
        .from("banners")
        .update({
          image_url: result.url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBanner.id);

      if (error) throw error;

      toast.success("Banner image uploaded successfully");
      setSelectedBanner({ ...selectedBanner, image_url: result.url || "" });
      await fetchBanners();
    } catch (error) {
      console.error("Error uploading banner image:", error);
      toast.error("Failed to upload banner image");
    } finally {
      setUploadingBanner(false);
    }
  };

  // Save Category
  const handleSaveCategory = async () => {
    if (!selectedCategory) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("categories")
        .update({
          name_en: selectedCategory.name_en,
          name_tr: selectedCategory.name_tr,
          slug: selectedCategory.slug,
          icon_svg: selectedCategory.icon_svg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCategory.id);

      if (error) throw error;

      toast.success("Category saved successfully");
      await fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  // Update Banner Order
  const handleUpdateBannerOrder = async (bannerId: string, direction: "up" | "down") => {
    const currentIndex = banners.findIndex((b) => b.id === bannerId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    try {
      const currentBanner = banners[currentIndex];
      const targetBanner = banners[targetIndex];

      await supabase
        .from("banners")
        .update({ display_order: targetBanner.display_order })
        .eq("id", currentBanner.id);

      await supabase
        .from("banners")
        .update({ display_order: currentBanner.display_order })
        .eq("id", targetBanner.id);

      toast.success("Banner order updated");
      await fetchBanners();
    } catch (error) {
      console.error("Error updating banner order:", error);
      toast.error("Failed to update banner order");
    }
  };

  // Save Free Chat Settings
  const handleSaveFreeChatSettings = async () => {
    try {
      setSaving(true);

      const settingsToUpdate = [
        {
          setting_key: "sms_free_chat_enabled",
          setting_value: String(freeChatSettings.sms_free_chat_enabled),
          setting_type: "boolean",
        },
        {
          setting_key: "sms_free_chat_count",
          setting_value: String(freeChatSettings.sms_free_chat_count),
          setting_type: "number",
        },
        {
          setting_key: "free_usage_enabled",
          setting_value: String(freeChatSettings.free_usage_enabled),
          setting_type: "boolean",
        },
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from("site_settings")
          .upsert(
            {
              ...setting,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "setting_key" }
          );

        if (error) throw error;
      }

      toast.success("Free chat settings saved successfully");
    } catch (error) {
      console.error("Error saving free chat settings:", error);
      toast.error("Failed to save free chat settings");
    } finally {
      setSaving(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSiteContents();
    fetchBanners();
    fetchCategories();
    fetchFreeChatSettings();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    const contentChannel = supabase
      .channel("site-content-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content" },
        () => fetchSiteContents()
      )
      .subscribe();

    const bannerChannel = supabase
      .channel("banners-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "banners" },
        () => fetchBanners()
      )
      .subscribe();

    const categoryChannel = supabase
      .channel("categories-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => fetchCategories()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contentChannel);
      supabase.removeChannel(bannerChannel);
      supabase.removeChannel(categoryChannel);
    };
  }, []);

  const renderLeftPanel = () => {
    return (
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Content Sections
          </h3>

          <div className="space-y-2">
            <Button
              onClick={() => setActiveSection("search")}
              variant={activeSection === "search" ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                activeSection === "search" && "bg-[#6366f1] hover:bg-[#5558e3]"
              )}
            >
              <Search className="w-4 h-4" />
              Main Search Box
            </Button>

            <Button
              onClick={() => setActiveSection("categories")}
              variant={activeSection === "categories" ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                activeSection === "categories" && "bg-[#6366f1] hover:bg-[#5558e3]"
              )}
            >
              <Tag className="w-4 h-4" />
              Category Buttons
            </Button>

            <Button
              onClick={() => setActiveSection("banners")}
              variant={activeSection === "banners" ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                activeSection === "banners" && "bg-[#6366f1] hover:bg-[#5558e3]"
              )}
            >
              <ImageIcon className="w-4 h-4" />
              Banners & Sliders
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const renderMiddlePanel = () => {
    if (activeSection === "search") {
      return (
        <Card className="lg:col-span-6 bg-[#1a1a1a] border-white/[0.08] p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Search className="w-6 h-6" />
                Main Search Box
              </h2>
              <Button
                onClick={handleSaveSiteContent}
                disabled={saving || !selectedContent}
                className="bg-[#10b981] hover:bg-[#059669]"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <ScrollArea className="h-[520px] pr-4">
              {loading ? (
                <div className="text-center py-8 text-[#999999]">Loading...</div>
              ) : !selectedContent ? (
                <div className="text-center py-8 text-[#999999]">No content found</div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title_en" className="text-white">
                      Title (English)
                    </Label>
                    <Input
                      id="title_en"
                      value={selectedContent.title_en || ""}
                      onChange={(e) =>
                        setSelectedContent({
                          ...selectedContent,
                          title_en: e.target.value,
                        })
                      }
                      className="bg-white/[0.05] border-white/[0.08] text-white"
                      placeholder="Enter title in English"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title_tr" className="text-white">
                      Title (Turkish)
                    </Label>
                    <Input
                      id="title_tr"
                      value={selectedContent.title_tr || ""}
                      onChange={(e) =>
                        setSelectedContent({
                          ...selectedContent,
                          title_tr: e.target.value,
                        })
                      }
                      className="bg-white/[0.05] border-white/[0.08] text-white"
                      placeholder="Enter title in Turkish"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="placeholder_en" className="text-white">
                      Placeholder (English)
                    </Label>
                    <Input
                      id="placeholder_en"
                      value={selectedContent.placeholder_en || ""}
                      onChange={(e) =>
                        setSelectedContent({
                          ...selectedContent,
                          placeholder_en: e.target.value,
                        })
                      }
                      className="bg-white/[0.05] border-white/[0.08] text-white"
                      placeholder="Enter placeholder text"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="placeholder_tr" className="text-white">
                      Placeholder (Turkish)
                    </Label>
                    <Input
                      id="placeholder_tr"
                      value={selectedContent.placeholder_tr || ""}
                      onChange={(e) =>
                        setSelectedContent({
                          ...selectedContent,
                          placeholder_tr: e.target.value,
                        })
                      }
                      className="bg-white/[0.05] border-white/[0.08] text-white"
                      placeholder="Enter placeholder text"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                    <Label htmlFor="is_active" className="text-white">
                      Active
                    </Label>
                    <Switch
                      id="is_active"
                      checked={selectedContent.is_active}
                      onCheckedChange={(checked) =>
                        setSelectedContent({
                          ...selectedContent,
                          is_active: checked,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </Card>
      );
    }

    if (activeSection === "categories") {
      return (
        <Card className="lg:col-span-6 bg-[#1a1a1a] border-white/[0.08] p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Tag className="w-6 h-6" />
                Category Buttons
              </h2>
              <Button
                onClick={handleSaveCategory}
                disabled={saving || !selectedCategory}
                className="bg-[#10b981] hover:bg-[#059669]"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <ScrollArea className="h-[520px] pr-4">
              {loading ? (
                <div className="text-center py-8 text-[#999999]">Loading...</div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-[#999999]">No categories found</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        onClick={() => setSelectedCategory(category)}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-all",
                          "hover:bg-white/[0.05] border",
                          selectedCategory?.id === category.id
                            ? "bg-white/[0.08] border-[#6366f1]"
                            : "border-white/[0.08]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {category.name_en}
                            </p>
                            <p className="text-xs text-[#999999]">{category.slug}</p>
                          </div>
                          <Badge variant="outline">{category.display_order}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedCategory && (
                    <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                      <div className="space-y-2">
                        <Label htmlFor="cat_name_en" className="text-white">
                          Name (English)
                        </Label>
                        <Input
                          id="cat_name_en"
                          value={selectedCategory.name_en}
                          onChange={(e) =>
                            setSelectedCategory({
                              ...selectedCategory,
                              name_en: e.target.value,
                            })
                          }
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cat_name_tr" className="text-white">
                          Name (Turkish)
                        </Label>
                        <Input
                          id="cat_name_tr"
                          value={selectedCategory.name_tr}
                          onChange={(e) =>
                            setSelectedCategory({
                              ...selectedCategory,
                              name_tr: e.target.value,
                            })
                          }
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cat_slug" className="text-white">
                          Slug
                        </Label>
                        <Input
                          id="cat_slug"
                          value={selectedCategory.slug}
                          onChange={(e) =>
                            setSelectedCategory({
                              ...selectedCategory,
                              slug: e.target.value,
                            })
                          }
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cat_icon" className="text-white">
                          Icon SVG
                        </Label>
                        <Textarea
                          id="cat_icon"
                          value={selectedCategory.icon_svg || ""}
                          onChange={(e) =>
                            setSelectedCategory({
                              ...selectedCategory,
                              icon_svg: e.target.value,
                            })
                          }
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </Card>
      );
    }

    if (activeSection === "banners") {
      return (
        <Card className="lg:col-span-6 bg-[#1a1a1a] border-white/[0.08] p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-6 h-6" />
                Banners & Sliders
              </h2>
              <Button
                onClick={handleSaveBanner}
                disabled={saving || !selectedBanner}
                className="bg-[#10b981] hover:bg-[#059669]"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <ScrollArea className="h-[520px] pr-4">
              {loading ? (
                <div className="text-center py-8 text-[#999999]">Loading...</div>
              ) : banners.length === 0 ? (
                <div className="text-center py-8 text-[#999999]">No banners found</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {banners.map((banner, index) => (
                      <div
                        key={banner.id}
                        onClick={() => setSelectedBanner(banner)}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-all",
                          "hover:bg-white/[0.05] border",
                          selectedBanner?.id === banner.id
                            ? "bg-white/[0.08] border-[#6366f1]"
                            : "border-white/[0.08]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={banner.image_url}
                            alt={banner.title_en || "Banner"}
                            className="w-16 h-16 rounded object-cover"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">
                              {banner.title_en || "Untitled Banner"}
                            </p>
                            <p className="text-xs text-[#999999]">
                              Order: {banner.display_order}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateBannerOrder(banner.id, "up");
                              }}
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateBannerOrder(banner.id, "down");
                              }}
                              disabled={index === banners.length - 1}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedBanner && (
                    <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                      <div className="space-y-2">
                        <Label className="text-white">Banner Image</Label>
                        <div className="relative">
                          <img
                            src={selectedBanner.image_url}
                            alt="Banner preview"
                            className="w-full h-48 rounded-lg object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleBannerImageUpload(file);
                                }}
                              />
                              <Button
                                type="button"
                                disabled={uploadingBanner}
                                className="bg-[#6366f1] hover:bg-[#5558e3]"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                {uploadingBanner ? "Uploading..." : "Upload New"}
                              </Button>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="banner_title_en" className="text-white">
                          Title (English)
                        </Label>
                        <Input
                          id="banner_title_en"
                          value={selectedBanner.title_en || ""}
                          onChange={(e) =>
                            setSelectedBanner({
                              ...selectedBanner,
                              title_en: e.target.value,
                            })
                          }
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="banner_title_tr" className="text-white">
                          Title (Turkish)
                        </Label>
                        <Input
                          id="banner_title_tr"
                          value={selectedBanner.title_tr || ""}
                          onChange={(e) =>
                            setSelectedBanner({
                              ...selectedBanner,
                              title_tr: e.target.value,
                            })
                          }
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="banner_desc_en" className="text-white">
                          Description (English)
                        </Label>
                        <Textarea
                          id="banner_desc_en"
                          value={selectedBanner.description_en || ""}
                          onChange={(e) =>
                            setSelectedBanner({
                              ...selectedBanner,
                              description_en: e.target.value,
                            })
                          }
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="banner_link" className="text-white">
                          Link URL
                        </Label>
                        <Input
                          id="banner_link"
                          value={selectedBanner.link_url || ""}
                          onChange={(e) =>
                            setSelectedBanner({
                              ...selectedBanner,
                              link_url: e.target.value,
                            })
                          }
                          className="bg-white/[0.05] border-white/[0.08] text-white"
                          placeholder="https://example.com"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                        <Label htmlFor="banner_active" className="text-white">
                          Active
                        </Label>
                        <Switch
                          id="banner_active"
                          checked={selectedBanner.is_active}
                          onCheckedChange={(checked) =>
                            setSelectedBanner({
                              ...selectedBanner,
                              is_active: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </Card>
      );
    }

    return null;
  };

  const renderRightPanel = () => {
    return (
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Free Chat Settings
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <div className="flex-1">
                <Label htmlFor="sms_enabled" className="text-white font-medium">
                  SMS Free Chat
                </Label>
                <p className="text-xs text-[#999999] mt-1">
                  Enable free chat via SMS verification
                </p>
              </div>
              <Switch
                id="sms_enabled"
                checked={freeChatSettings.sms_free_chat_enabled}
                onCheckedChange={(checked) =>
                  setFreeChatSettings({
                    ...freeChatSettings,
                    sms_free_chat_enabled: checked,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chat_count" className="text-white">
                Free Chat Count
              </Label>
              <Input
                id="chat_count"
                type="number"
                min="0"
                value={freeChatSettings.sms_free_chat_count}
                onChange={(e) =>
                  setFreeChatSettings({
                    ...freeChatSettings,
                    sms_free_chat_count: parseInt(e.target.value) || 0,
                  })
                }
                className="bg-white/[0.05] border-white/[0.08] text-white"
              />
              <p className="text-xs text-[#999999]">
                Number of free chats to grant per user
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <div className="flex-1">
                <Label htmlFor="free_usage" className="text-white font-medium">
                  Free Usage
                </Label>
                <p className="text-xs text-[#999999] mt-1">
                  Allow free usage without restrictions
                </p>
              </div>
              <Switch
                id="free_usage"
                checked={freeChatSettings.free_usage_enabled}
                onCheckedChange={(checked) =>
                  setFreeChatSettings({
                    ...freeChatSettings,
                    free_usage_enabled: checked,
                  })
                }
              />
            </div>

            <Button
              onClick={handleSaveFreeChatSettings}
              disabled={saving}
              className="w-full bg-[#10b981] hover:bg-[#059669]"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>

          {/* Preview Section */}
          <div className="pt-6 border-t border-white/[0.08]">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4" />
              Preview
            </h4>
            <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <p className="text-xs text-[#999999] mb-2">Current Settings:</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#999999]">SMS Free Chat:</span>
                  <Badge variant={freeChatSettings.sms_free_chat_enabled ? "default" : "outline"}>
                    {freeChatSettings.sms_free_chat_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#999999]">Free Chat Count:</span>
                  <span className="text-white font-medium">
                    {freeChatSettings.sms_free_chat_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#999999]">Free Usage:</span>
                  <Badge variant={freeChatSettings.free_usage_enabled ? "default" : "outline"}>
                    {freeChatSettings.free_usage_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {renderLeftPanel()}
      {renderMiddlePanel()}
      {renderRightPanel()}
    </div>
  );
}
