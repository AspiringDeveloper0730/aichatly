
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Star, Users, ArrowLeft, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

interface Character {
  id: string;
  name: string;
  occupation_en: string | null;
  occupation_tr: string | null;
  image_url: string;
}

interface Conversation {
  id: string;
  character_id: string;
  last_message_at: string;
  character?: Character;
}

interface ChatLeftPanelProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  isGuest?: boolean;
  onClose?: () => void;
}

export const ChatLeftPanel = React.memo(function ChatLeftPanel({
  conversations,
  currentConversationId,
  onConversationSelect,
  isGuest = false,
  onClose,
}: ChatLeftPanelProps) {
  const { language } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"recent" | "favorites" | "characters">("recent");
  const [favoriteCharacters, setFavoriteCharacters] = useState<Character[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [userCharacters, setUserCharacters] = useState<Character[]>([]);
  const [isLoadingUserCharacters, setIsLoadingUserCharacters] = useState(false);

  const tabs = [
    { id: "recent" as const, label: language === "tr" ? "Son Konuşmalar" : "Recent Conversations", icon: Clock },
    { id: "favorites" as const, label: language === "tr" ? "Favoriler" : "Favorites", icon: Star },
    { id: "characters" as const, label: language === "tr" ? "Karakterler" : "Characters", icon: Users },
  ];

  // Load favorite characters when Favorites tab is selected
  useEffect(() => {
    if (activeTab === "favorites" && !isGuest) {
      loadFavoriteCharacters();
    }
    if (activeTab === "characters" && !isGuest) {
      loadUserCharacters();
    }
  }, [activeTab, isGuest]);

  const loadFavoriteCharacters = async () => {
    setIsLoadingFavorites(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: favorites } = await supabase
        .from("favorites")
        .select("character_id")
        .eq("user_id", user.id);

      if (favorites && favorites.length > 0) {
        const characterIds = favorites.map((f) => f.character_id);
        const { data: characters } = await supabase
          .from("characters")
          .select("id, name, occupation_en, occupation_tr, image_url")
          .in("id", characterIds)
          .eq("is_published", true)
          .is("deleted_at", null);

        if (characters) {
          setFavoriteCharacters(characters);
        }
      } else {
        setFavoriteCharacters([]);
      }
    } catch (error) {
      console.error("Error loading favorite characters:", error);
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const loadUserCharacters = async () => {
    setIsLoadingUserCharacters(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserCharacters([]);
        return;
      }

      const { data: characters, error } = await supabase
        .from("characters")
        .select("id, name, occupation_en, occupation_tr, image_url")
        .eq("creator_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setUserCharacters(characters ?? []);
    } catch (error) {
      console.error("Error loading user's characters:", error);
      setUserCharacters([]);
    } finally {
      setIsLoadingUserCharacters(false);
    }
  };

  // Get unique characters from recent conversations (most recent first)
  const getUniqueRecentCharacters = () => {
    const uniqueCharacters = new Map<string, Conversation>();
    
    // Sort by last_message_at descending (most recent first)
    const sortedConversations = [...conversations].sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    // Keep only the first occurrence of each character
    sortedConversations.forEach((conv) => {
      if (conv.character && !uniqueCharacters.has(conv.character_id)) {
        uniqueCharacters.set(conv.character_id, conv);
      }
    });

    return Array.from(uniqueCharacters.values());
  };

  const handleCharacterClick = async (characterId: string) => {
    // Navigate to chat with this character
    router.push(`/chat/${characterId}`);
  };

  const uniqueRecentConversations = getUniqueRecentCharacters();

  return (
    <div className="h-full flex flex-col">
      {/* Header with Back Arrow */}
      <div className="p-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
            aria-label={language === "tr" ? "Ana Sayfaya Dön" : "Back to Home"}
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-lg font-bold text-white">
            {language === "tr" ? "Sohbetler" : "Chats"}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-auto flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
              aria-label={language === "tr" ? "Paneli kapat" : "Close panel"}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs - Reduced size */}
      <div className="flex border-b border-white/[0.08]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-medium transition-smooth overflow-hidden",
                activeTab === tab.id
                  ? "text-white border-b-2 border-[#6366f1] bg-white/[0.02]"
                  : "text-[#999999] hover:text-white hover:bg-white/[0.02]"
              )}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Recent Conversations Tab */}
          {activeTab === "recent" && (
            <>
              {uniqueRecentConversations.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-[#666666]" />
                  <p className="text-sm text-[#666666]">
                    {language === "tr" 
                      ? "Henüz konuşma yok"
                      : "No conversations yet"}
                  </p>
                </div>
              ) : (
                uniqueRecentConversations.map((conversation) => {
                  const character = conversation.character;
                  if (!character) return null;

                  const occupation = language === "tr" ? character.occupation_tr : character.occupation_en;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleCharacterClick(character.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg transition-smooth text-left",
                        "hover:bg-white/[0.02] border border-transparent"
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={character.image_url}
                          alt={character.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {character.name}
                        </h3>
                        {occupation && (
                          <p className="text-xs text-[#999999] truncate">
                            {occupation}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}

          {/* Favorites Tab */}
          {activeTab === "favorites" && (
            <>
              {isGuest ? (
                <div className="text-center py-8 px-4">
                  <Star className="w-12 h-12 mx-auto mb-3 text-[#666666]" />
                  <p className="text-sm text-[#666666]">
                    {language === "tr" 
                      ? "Favorileri görmek için giriş yapın"
                      : "Sign in to view favorites"}
                  </p>
                </div>
              ) : isLoadingFavorites ? (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-[#666666]">
                    {language === "tr" ? "Yükleniyor..." : "Loading..."}
                  </p>
                </div>
              ) : favoriteCharacters.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Star className="w-12 h-12 mx-auto mb-3 text-[#666666]" />
                  <p className="text-sm text-[#666666]">
                    {language === "tr"
                      ? "Henüz favori yok"
                      : "No favorites yet"}
                  </p>
                </div>
              ) : (
                favoriteCharacters.map((character) => {
                  const occupation = language === "tr" ? character.occupation_tr : character.occupation_en;

                  return (
                    <button
                      key={character.id}
                      onClick={() => handleCharacterClick(character.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg transition-smooth text-left",
                        "hover:bg-white/[0.02] border border-transparent"
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={character.image_url}
                          alt={character.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {character.name}
                        </h3>
                        {occupation && (
                          <p className="text-xs text-[#999999] truncate">
                            {occupation}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}

          {/* Characters Tab */}
          {activeTab === "characters" && (
            <>
              {isGuest ? (
                <div className="text-center py-8 px-4">
                  <Users className="w-12 h-12 mx-auto mb-3 text-[#666666]" />
                  <p className="text-sm text-[#666666]">
                    {language === "tr"
                      ? "Karakterlerinizi görmek için giriş yapın"
                      : "Sign in to view your characters"}
                  </p>
                </div>
              ) : isLoadingUserCharacters ? (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-[#666666]">
                    {language === "tr" ? "Yükleniyor..." : "Loading..."}
                  </p>
                </div>
              ) : userCharacters.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Users className="w-12 h-12 mx-auto mb-3 text-[#666666]" />
                  <p className="text-sm text-[#666666]">
                    {language === "tr" ? "Henüz karakter oluşturmadınız" : "You haven't created any characters yet"}
                  </p>
                </div>
              ) : (
                userCharacters.map((character) => {
                  const occupation = language === "tr" ? character.occupation_tr : character.occupation_en;
                  return (
                    <button
                      key={character.id}
                      onClick={() => handleCharacterClick(character.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg transition-smooth text-left",
                        "hover:bg-white/[0.02] border border-transparent"
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={character.image_url}
                          alt={character.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {character.name}
                        </h3>
                        {occupation && (
                          <p className="text-xs text-[#999999] truncate">
                            {occupation}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
