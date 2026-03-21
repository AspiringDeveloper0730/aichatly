
"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, User, Heart, Star, MessageSquare, Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Character {
  id: string;
  name: string;
  occupation_en: string | null;
  occupation_tr: string | null;
  description_en: string | null;
  description_tr: string | null;
  character_type: "ai" | "real";
  gender: "male" | "female" | null;
  image_url: string;
  is_anime: boolean;
  likes_count: number;
  favorites_count: number;
  chat_count?: number;
  age?: string | null;
  country?: string | null;
}

interface ChatRightPanelProps {
  character: Character;
  messageCount?: number;
  onClose?: () => void;
}

export function ChatRightPanel({ character, messageCount = 0, onClose }: ChatRightPanelProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [likesCount, setLikesCount] = useState(character.likes_count || 0);
  const [favoritesCount, setFavoritesCount] = useState(character.favorites_count || 0);
  const [isLoadingLike, setIsLoadingLike] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const occupation = language === "tr" ? character.occupation_tr : character.occupation_en;
  const description = language === "tr" ? character.description_tr : character.description_en;
  const chatCount = character.chat_count || 0;

  // Load user's like and favorite status
  useEffect(() => {
    if (user) {
      loadUserStatus();
    }
  }, [user, character.id]);

  // Listen for interaction updates from main page
  useEffect(() => {
    const handleInteractionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.characterId === character.id) {
        if (customEvent.detail.type === 'like') {
          setIsLiked(customEvent.detail.isActive);
          setLikesCount(customEvent.detail.count);
        } else if (customEvent.detail.type === 'favorite') {
          setIsFavorited(customEvent.detail.isActive);
          setFavoritesCount(customEvent.detail.count);
        }
      }
    };

    window.addEventListener('interactionUpdated', handleInteractionUpdate);

    return () => {
      window.removeEventListener('interactionUpdated', handleInteractionUpdate);
    };
  }, [character.id]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showShareMenu]);

  const loadUserStatus = async () => {
    if (!user) return;

    try {
      // Check if liked
      const { data: likeData } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("character_id", character.id)
        .maybeSingle();

      setIsLiked(!!likeData);

      // Check if favorited
      const { data: favoriteData } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("character_id", character.id)
        .maybeSingle();

      setIsFavorited(!!favoriteData);

      // Fetch latest counts from database
      const { data: charData } = await supabase
        .from("characters")
        .select("likes_count, favorites_count")
        .eq("id", character.id)
        .maybeSingle();

      if (charData) {
        setLikesCount(charData.likes_count);
        setFavoritesCount(charData.favorites_count);
      }
    } catch (error) {
      console.error("Error loading user status:", error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error(
        language === "tr"
          ? "Beğenmek için giriş yapmalısınız"
          : "You must sign in to like"
      );
      return;
    }

    setIsLoadingLike(true);

    const newLikedState = !isLiked;
    const newCount = newLikedState ? likesCount + 1 : likesCount - 1;

    // Optimistic update
    setIsLiked(newLikedState);
    setLikesCount(newCount);

    try {
      if (newLikedState) {
        const { error } = await supabase
          .from("likes")
          .insert({ user_id: user.id, character_id: character.id });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("character_id", character.id);

        if (error) throw error;
      }

      // Persist the computed count to the characters table
      const { data: charData, error: countError } = await supabase
        .from("characters")
        .update({ likes_count: newCount })
        .select("likes_count")
        .eq("id", character.id)
        .maybeSingle();

      if (countError) throw countError;

      if (charData) {
        setLikesCount(charData.likes_count);
        
        // Broadcast update to main page
        window.dispatchEvent(new CustomEvent('interactionUpdated', {
          detail: {
            characterId: character.id,
            type: 'like',
            isActive: newLikedState,
            count: charData.likes_count
          }
        }));
      }

      toast.success(
        newLikedState
          ? (language === "tr" ? "Beğenildi" : "Liked")
          : (language === "tr" ? "Beğeni kaldırıldı" : "Like removed")
      );
    } catch (error) {
      // Revert on error
      setIsLiked(!newLikedState);
      setLikesCount(likesCount);
      console.error("Error toggling like:", error);
      toast.error(
        language === "tr" ? "Bir hata oluştu" : "An error occurred"
      );
    } finally {
      setIsLoadingLike(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      toast.error(
        language === "tr"
          ? "Favorilere eklemek için giriş yapmalısınız"
          : "You must sign in to add to favorites"
      );
      return;
    }

    setIsLoadingFavorite(true);

    const newFavoritedState = !isFavorited;
    const newCount = newFavoritedState ? favoritesCount + 1 : favoritesCount - 1;

    // Optimistic update
    setIsFavorited(newFavoritedState);
    setFavoritesCount(newCount);

    try {
      if (newFavoritedState) {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, character_id: character.id });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("character_id", character.id);

        if (error) throw error;
      }

      // Persist the computed count to the characters table
      const { data: charData, error: countError } = await supabase
        .from("characters")
        .update({ favorites_count: newCount })
        .select("favorites_count")
        .eq("id", character.id)
        .maybeSingle();

      if (countError) throw countError;

      if (charData) {
        setFavoritesCount(charData.favorites_count);
        
        // Broadcast update to main page
        window.dispatchEvent(new CustomEvent('interactionUpdated', {
          detail: {
            characterId: character.id,
            type: 'favorite',
            isActive: newFavoritedState,
            count: charData.favorites_count
          }
        }));
      }

      toast.success(
        newFavoritedState
          ? (language === "tr" ? "Favorilere eklendi" : "Added to favorites")
          : (language === "tr" ? "Favorilerden kaldırıldı" : "Removed from favorites")
      );
    } catch (error) {
      // Revert on error
      setIsFavorited(!newFavoritedState);
      setFavoritesCount(favoritesCount);
      console.error("Error toggling favorite:", error);
      toast.error(
        language === "tr" ? "Bir hata oluştu" : "An error occurred"
      );
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const handleShareClick = () => {
    setShowShareMenu(!showShareMenu);
  };

  const handleSocialShare = (platform: "facebook" | "twitter" | "whatsapp" | "telegram") => {
    // Use the current page URL which will include all the meta tags
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareTitle = `${character.name}${occupation ? ` - ${occupation}` : ""}`;
    const shareDescription = description || `Chat with ${character.name} on AiChatly`;
    const shareText = `${shareTitle}\n${shareDescription}`;
    
    let url = "";

    switch (platform) {
      case "facebook":
        // Facebook uses Open Graph meta tags automatically
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "twitter":
        // Twitter uses Twitter Card meta tags automatically
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case "whatsapp":
        // WhatsApp uses Open Graph meta tags for preview
        url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
        break;
      case "telegram":
        // Telegram uses Open Graph meta tags for preview
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
    }

    if (url) {
      window.open(url, "_blank", "width=600,height=400");
      setShowShareMenu(false);
      toast.success(
        language === "tr" ? "Paylaşım penceresi açıldı" : "Share window opened"
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#111111]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
        <h2 className="text-lg font-bold text-white">
          {language === "tr" ? "Karakter Detayları" : "Character Details"}
        </h2>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/[0.05]"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Character Image */}
          <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden">
            <Image
              src={character.image_url}
              alt={character.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* Character Name & Occupation */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">{character.name}</h1>
            {occupation && (
              <p className="text-base text-[#999999]">{occupation}</p>
            )}
          </div>

          {/* Description */}
          {description && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                {language === "tr" ? "Hakkında" : "About"}
              </h3>
              <p className="text-sm text-[#cccccc] leading-relaxed">
                {description}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg p-3 text-center">
              <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-xs text-[#999999]">
                {language === "tr" ? "Beğeni" : "Likes"}
              </p>
              <p className="text-lg font-bold text-white">{likesCount}</p>
            </div>
            <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg p-3 text-center">
              <Star className="w-5 h-5 text-[#facc15] mx-auto mb-1" />
              <p className="text-xs text-[#999999]">
                {language === "tr" ? "Favori" : "Favorites"}
              </p>
              <p className="text-lg font-bold text-white">{favoritesCount}</p>
            </div>
            <div 
              className="border border-white/[0.08] rounded-lg p-3 text-center bg-[#1a1a1a]"
            >
              <MessageSquare className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-white">
                {language === "tr" ? "Mesaj" : "Messages"}
              </p>
              <p className="text-lg font-bold text-white">{messageCount}</p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              {language === "tr" ? "Bilgiler" : "Information"}
            </h3>
            
            {character.gender && (
              <div className="flex items-center justify-between py-2 border-b border-white/[0.08]">
                <span className="text-sm text-[#999999]">
                  {language === "tr" ? "Cinsiyet" : "Gender"}
                </span>
                <span className="text-sm text-white capitalize">{character.gender}</span>
              </div>
            )}

            {character.age && (
              <div className="flex items-center justify-between py-2 border-b border-white/[0.08]">
                <span className="text-sm text-[#999999]">
                  {language === "tr" ? "Yaş" : "Age"}
                </span>
                <span className="text-sm text-white">{character.age}</span>
              </div>
            )}

            {character.country && (
              <div className="flex items-center justify-between py-2 border-b border-white/[0.08]">
                <span className="text-sm text-[#999999]">
                  {language === "tr" ? "Ülke" : "Country"}
                </span>
                <span className="text-sm text-white">{character.country}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-b border-white/[0.08]">
              <span className="text-sm text-[#999999]">
                {language === "tr" ? "Stil" : "Style"}
              </span>
              <span className="text-sm text-white">
                {character.is_anime 
                  ? (language === "tr" ? "Anime" : "Anime") 
                  : (language === "tr" ? "Gerçekçi" : "Realistic")}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#999999]">
                {language === "tr" ? "Tip" : "Type"}
              </span>
              <span className="text-sm text-white capitalize">
                {character.character_type === "ai" 
                  ? (language === "tr" ? "Yapay Zeka" : "AI") 
                  : (language === "tr" ? "Gerçek" : "Real")}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {/* Add to Favorites Button with Star Icon */}
            <Button 
              onClick={handleFavorite}
              disabled={isLoadingFavorite}
              className={cn(
                "w-full text-white transition-colors",
                isFavorited
                  ? "bg-gradient-to-r from-[#facc15] to-[#eab308] hover:from-[#eab308] hover:to-[#ca8a04]"
                  : "bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#4f46e5] hover:to-[#9333ea]"
              )}
            >
              <Star 
                className="w-4 h-4 mr-2" 
                fill={isFavorited ? "currentColor" : "none"}
              />
              {isLoadingFavorite 
                ? (language === "tr" ? "Yükleniyor..." : "Loading...") 
                : isFavorited 
                  ? (language === "tr" ? "Favorilerden Çıkar" : "Remove from Favorites")
                  : (language === "tr" ? "Favorilere Ekle" : "Add to Favorites")}
            </Button>

            {/* Rate Character Button with Heart Icon */}
            <Button 
              onClick={handleLike}
              disabled={isLoadingLike}
              variant="outline" 
              className={cn(
                "w-full border-white/[0.08] transition-colors",
                isLiked
                  ? "bg-red-600/10 text-red-500 border-red-500/30 hover:bg-red-600/20"
                  : "text-white hover:bg-white/[0.05]"
              )}
            >
              <Heart 
                className="w-4 h-4 mr-2" 
                fill={isLiked ? "currentColor" : "none"}
              />
              {isLoadingLike 
                ? (language === "tr" ? "Yükleniyor..." : "Loading...") 
                : isLiked 
                  ? (language === "tr" ? "Beğeniyi Kaldır" : "Unlike")
                  : (language === "tr" ? "Karakteri Beğen" : "Rate Character")}
            </Button>

            {/* Share Character Button with Dropdown Menu */}
            <div className="relative" ref={shareMenuRef}>
              <Button 
                onClick={handleShareClick}
                variant="outline" 
                className="w-full border-white/[0.08] text-white hover:bg-white/[0.05]"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {language === "tr" ? "Karakteri Paylaş" : "Share Character"}
              </Button>

              {/* Share Menu Dropdown */}
              {showShareMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a1a] border border-white/[0.08] rounded-lg shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => handleSocialShare("facebook")}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/[0.05] transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </button>
                  <button
                    onClick={() => handleSocialShare("twitter")}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/[0.05] transition-colors flex items-center gap-3 border-t border-white/[0.08]"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Twitter / X
                  </button>
                  <button
                    onClick={() => handleSocialShare("whatsapp")}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/[0.05] transition-colors flex items-center gap-3 border-t border-white/[0.08]"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleSocialShare("telegram")}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/[0.05] transition-colors flex items-center gap-3 border-t border-white/[0.08]"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Telegram
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
