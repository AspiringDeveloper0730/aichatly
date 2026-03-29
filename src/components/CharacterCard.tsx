
"use client";

import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star, MessageSquare, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

interface Character {
  id: string;
  name: string;
  occupation_en: string | null;
  occupation_tr: string | null;
  character_type: "human" | "ai" | "anime" | "animal" | "fantasy";
  gender: "male" | "female" | null;
  image_url: string;
  is_anime: boolean;
  likes_count: number;
  favorites_count: number;
  chat_count?: number;
  is_published?: boolean;
}

interface CharacterCardProps {
  character: Character;
  isLiked?: boolean;
  isFavorited?: boolean;
  onLikeToggle?: () => void;
  onFavoriteToggle?: () => void;
}

// Helper function to get message count from database or localStorage
async function getMessageCount(characterId: string, userId: string | null): Promise<number> {
  if (userId) {
    // Authenticated user - count only user-sent messages in this character conversation.
    try {
      const { data: conversations, error: conversationsError } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("character_id", characterId);

      if (conversationsError) throw conversationsError;
      if (!conversations || conversations.length === 0) return 0;

      const conversationIds = conversations.map((conversation) => conversation.id);

      const { count, error: messagesCountError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .eq("sender_type", "user");

      if (messagesCountError) throw messagesCountError;
      return count || 0;
    } catch (error) {
      console.error("Error fetching message count:", error);
      return 0;
    }
  } else {
    // Guest user - count only user-sent messages in localStorage.
    try {
      const guestConvsStored = localStorage.getItem("guest_conversations");
      const guestConvs = guestConvsStored ? JSON.parse(guestConvsStored) : [];
      const characterConversationIds = guestConvs
        .filter((c: any) => c.character_id === characterId && c.id)
        .map((c: any) => c.id);
      if (characterConversationIds.length === 0) return 0;

      const guestMessagesStored = localStorage.getItem("guest_messages");
      const guestMessages = guestMessagesStored ? JSON.parse(guestMessagesStored) : [];
      return guestMessages.filter(
        (m: any) =>
          m.sender_type === "user" &&
          characterConversationIds.includes(m.conversation_id)
      ).length;
    } catch (error) {
      console.error("Error loading guest message count:", error);
      return 0;
    }
  }
}

// Helper function to get character type label
function getCharacterTypeLabel(characterType: Character["character_type"], language: string) {
  if (characterType === "human") {
    return language === "tr" ? "GERÇEK İNSAN" : "REAL HUMAN";
  }
  // For ai, anime, animal, fantasy - all show "ARTIFICIAL INTELLIGENCE"
  return language === "tr" ? "YAPAY ZEKA" : "ARTIFICIAL INTELLIGENCE";
}

export function CharacterCard({
  character,
  isLiked = false,
  isFavorited = false,
  onLikeToggle,
  onFavoriteToggle,
}: CharacterCardProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(isLiked);
  const [favorited, setFavorited] = useState(isFavorited);
  const [likesCount, setLikesCount] = useState(character.likes_count);
  const [favoritesCount, setFavoritesCount] = useState(character.favorites_count);
  const [messageCount, setMessageCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginAction, setLoginAction] = useState<"like" | "favorite" | null>(null);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [favoriteAnimating, setFavoriteAnimating] = useState(false);

  const occupation = language === "tr" ? character.occupation_tr : character.occupation_en;
  const characterTypeLabel = getCharacterTypeLabel(character.character_type, language);
  const isPublished = Boolean(character.is_published);
  const useAiButtonBackground = isPublished && messageCount === 0;
  const useFavoriteButtonBackground = isPublished && favoritesCount === 0;
  const useLikeButtonBackground = isPublished && likesCount === 0;
  const useSmsButtonBackground = isPublished && messageCount === 0;

  // Load message count on mount and when user changes
  useEffect(() => {
    loadMessageCount();
  }, [character.id, user]);

  // Listen for message count updates from chat page
  useEffect(() => {
    const handleMessageCountUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.characterId === character.id) {
        setMessageCount(customEvent.detail.count);
      }
    };

    window.addEventListener('messageCountUpdated', handleMessageCountUpdate);

    return () => {
      window.removeEventListener('messageCountUpdated', handleMessageCountUpdate);
    };
  }, [character.id]);

  // Listen for like/favorite updates from chat page
  useEffect(() => {
    const handleInteractionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.characterId === character.id) {
        if (customEvent.detail.type === 'like') {
          setLiked(customEvent.detail.isActive);
          setLikesCount(customEvent.detail.count);
        } else if (customEvent.detail.type === 'favorite') {
          setFavorited(customEvent.detail.isActive);
          setFavoritesCount(customEvent.detail.count);
        }
      }
    };

    window.addEventListener('interactionUpdated', handleInteractionUpdate);

    return () => {
      window.removeEventListener('interactionUpdated', handleInteractionUpdate);
    };
  }, [character.id]);

  const loadMessageCount = async () => {
    const count = await getMessageCount(character.id, user?.id || null);
    setMessageCount(count);
  };

  // Sync local state with props when they change
  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked]);

  useEffect(() => {
    setFavorited(isFavorited);
  }, [isFavorited]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      setLoginAction("like");
      setShowLoginDialog(true);
      return;
    }

    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 600);

    const newLikedState = !liked;
    const newCount = newLikedState ? likesCount + 1 : likesCount - 1;

    // Optimistic update
    setLiked(newLikedState);
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
        
        // Broadcast update to chat page
        window.dispatchEvent(new CustomEvent('interactionUpdated', {
          detail: {
            characterId: character.id,
            type: 'like',
            isActive: newLikedState,
            count: charData.likes_count
          }
        }));
      }

      onLikeToggle?.();
    } catch (error) {
      // Revert on error
      setLiked(!newLikedState);
      setLikesCount(likesCount);
      console.error("Error toggling like:", error);
    }
  }, [user, liked, likesCount, character.id, onLikeToggle]);

  const handleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      setLoginAction("favorite");
      setShowLoginDialog(true);
      return;
    }

    setFavoriteAnimating(true);
    setTimeout(() => setFavoriteAnimating(false), 600);

    const newFavoritedState = !favorited;
    const newCount = newFavoritedState ? favoritesCount + 1 : favoritesCount - 1;

    // Optimistic update
    setFavorited(newFavoritedState);
    setFavoritesCount(newCount);

    try {
      if (newFavoritedState) {
        const { error } = await supabase
          .from("favorites")
          .upsert(
            { user_id: user.id, character_id: character.id },
            { onConflict: "user_id,character_id", ignoreDuplicates: true }
          );

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("character_id", character.id);

        if (error) throw error;
      }

      // Always resolve from DB to avoid drift (e.g. duplicate insert race).
      const { count: dbFavoritesCount, error: favoritesCountError } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("character_id", character.id);

      if (favoritesCountError) throw favoritesCountError;

      const resolvedCount = dbFavoritesCount ?? Math.max(0, newCount);

      // Persist the computed count to the characters table
      const { data: charData, error: countError } = await supabase
        .from("characters")
        .update({ favorites_count: resolvedCount })
        .select("favorites_count")
        .eq("id", character.id)
        .maybeSingle();

      if (countError) throw countError;

      const finalCount = charData?.favorites_count ?? resolvedCount;
      setFavoritesCount(finalCount);

      // Broadcast update to chat page
      window.dispatchEvent(new CustomEvent('interactionUpdated', {
        detail: {
          characterId: character.id,
          type: 'favorite',
          isActive: newFavoritedState,
          count: finalCount
        }
      }));

      onFavoriteToggle?.();
    } catch (error) {
      // Revert on error
      setFavorited(!newFavoritedState);
      setFavoritesCount(favoritesCount);
      console.error("Error toggling favorite:", error);
    }
  }, [user, favorited, favoritesCount, character.id, onFavoriteToggle]);

  return (
    <>
      <div 
        className={cn(
          "group relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#1a1a1a] shadow-lg cursor-pointer",
          "transition-all duration-300 ease-out",
          isHovered && "shadow-[0_0_30px_rgba(139,92,246,0.3),0_0_60px_rgba(168,85,247,0.2)]"
        )}
        style={{ minHeight: "400px" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background Layer - This scales on hover */}
        <div 
          className={cn(
            "absolute inset-0 transition-transform duration-300 ease-out",
            isHovered && "scale-[1.03]"
          )}
        >
          {/* Character Image */}
          <div className="absolute inset-0">
            <Image
              src={character.image_url}
              alt={character.name}
              fill
              className={cn(
                "object-cover transition-transform duration-500 ease-out",
                isHovered && "scale-105"
              )}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              priority={false}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          </div>

          {/* Hover Glow Effect */}
          {isHovered && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-t from-purple-600/10 via-transparent to-blue-600/10 animate-pulse" />
            </div>
          )}
        </div>

        {/* Content Layer - This stays fixed (no scale) */}
        <div className="relative h-full flex flex-col justify-between p-4 z-10">
          {/* Top Section - Character Type Label (Top-Left) and Favorite (Top-Right) */}
          <div className="flex items-start justify-between gap-2">
            {/* Top-Left: Character Type Label */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs backdrop-blur-sm",
                "transition-all duration-300",
                useAiButtonBackground
                  ? "text-white"
                  : character.character_type === "human"
                  ? "bg-orange-500/80 text-white"
                  : "bg-purple-600/80 text-white"
              )}
              style={
                useAiButtonBackground
                  ? { background: "linear-gradient(to right, rgb(147 51 234), rgb(37 99 235))" }
                  : undefined
              }
            >
              {character.character_type === "human" ? (
                <>
                  <User className="w-3.5 h-3.5" />
                  <span>{characterTypeLabel}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{characterTypeLabel}</span>
                </>
              )}
            </div>

            {/* Top-Right: Favorite Icon */}
            <button
              onClick={handleFavorite}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm flex-shrink-0",
                !useFavoriteButtonBackground && "bg-black/40"
              )}
              style={{
                ...(useFavoriteButtonBackground
                  ? { background: "linear-gradient(to right, rgb(147 51 234), rgb(37 99 235))" }
                  : {}),
                animation: favoriteAnimating ? "scaleAnimation 0.6s ease-in-out" : "none"
              }}
            >
              <Star
                className="w-4 h-4"
                style={{
                // Favorite icon should always render yellow (regardless of `favorited` state)
                fill: "#facc15",
                color: "#facc15",
                transition: "all 0.3s ease"
                }}
              />
              <span className="text-xs text-white font-medium">{favoritesCount}</span>
            </button>
          </div>

          {/* Bottom Section */}
          <div className="space-y-3">
            {/* Character Info */}
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white drop-shadow-lg line-clamp-1">
                {character.name}
              </h3>
              {occupation && (
                <p className="text-sm font-bold text-white drop-shadow-md line-clamp-2">
                  {occupation}
                </p>
              )}
            </div>

            {/* Bottom Row: Like (Left) + Chat Button (Center) + Message Count (Right) */}
            <div className="flex items-center justify-between gap-2">
              {/* Bottom-Left: Like Icon */}
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm flex-shrink-0",
                  !useLikeButtonBackground && "bg-black/40"
                )}
                style={{
                  ...(useLikeButtonBackground
                    ? { background: "linear-gradient(to right, rgb(147 51 234), rgb(37 99 235))" }
                    : {}),
                  animation: likeAnimating ? "scaleAnimation 0.6s ease-in-out" : "none"
                }}
              >
                <Heart
                  className="w-4 h-4"
                  style={{
                    // Like icon should always render red
                    fill: "#ef4444",
                    color: "#ef4444",
                    transition: "all 0.3s ease"
                  }}
                />
                <span className="text-xs text-white font-medium">{likesCount}</span>
              </button>

              {/* Center: Chat Button */}
              <Link href={`/chat/${character.id}`} className="flex-1 flex justify-center">
                <Button
                  className="h-8 px-6 rounded-full font-semibold text-sm text-white whitespace-nowrap shadow-lg"
                  style={{
                    background: "linear-gradient(to right, rgb(147 51 234), rgb(37 99 235))",
                    transition: "none"
                  }}
                >
                  {t("character.chat")}
                </Button>
              </Link>

              {/* Bottom-Right: Message Count Badge with Blue/Purple Gradient */}
              <div 
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
                style={{
                  background: useSmsButtonBackground
                    ? "linear-gradient(to right, rgb(147 51 234), rgb(37 99 235))"
                    : "linear-gradient(135deg, #34d399, #10b981)",
                }}
              >
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-xs text-white font-medium">{messageCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {language === "tr" ? "Ücretsiz Hesap Oluşturun" : "Create a Free Account"}
            </DialogTitle>
            <DialogDescription className="text-[#999999]">
              {loginAction === "like" && (
                language === "tr" 
                  ? "Karakterleri beğenmek için ücretsiz bir hesap oluşturun."
                  : "Create a free account to like characters."
              )}
              {loginAction === "favorite" && (
                language === "tr"
                  ? "Karakterleri favorilere eklemek için ücretsiz bir hesap oluşturun."
                  : "Create a free account to save characters to favorites."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => router.push("/register")}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700"
            >
              {language === "tr" ? "Kayıt Ol" : "Sign Up"}
            </Button>
            <Button
              onClick={() => router.push("/login")}
              variant="outline"
              className="w-full border-white/[0.08] text-white hover:bg-white/[0.05]"
            >
              {language === "tr" ? "Giriş Yap" : "Sign In"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes scaleAnimation {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }
      `}</style>
    </>
  );
}
