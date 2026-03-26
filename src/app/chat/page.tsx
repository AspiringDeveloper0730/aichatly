
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CharacterCard } from "@/components/CharacterCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Character {
  id: string;
  name: string;
  occupation_en: string | null;
  occupation_tr: string | null;
  character_type: "ai" | "real";
  gender: "male" | "female" | null;
  image_url: string;
  is_anime: boolean;
  likes_count: number;
  favorites_count: number;
}

export default function ChatPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    loadCharacters();
  }, [user, loading]);

  const loadCharacters = async () => {
    try {
      if (user) {
        const { data: latestConversation, error: conversationError } = await supabase
          .from("conversations")
          .select("character_id")
          .eq("user_id", user.id)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!conversationError && latestConversation?.character_id) {
          router.replace(`/chat/${latestConversation.character_id}`);
          return;
        }
      }

      const [charactersResult, likesResult, favoritesResult] = await Promise.all([
        supabase
          .from("characters")
          .select("*")
          .eq("is_published", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        user ? supabase.from("likes").select("character_id").eq("user_id", user.id) : Promise.resolve({ data: null }),
        user ? supabase.from("favorites").select("character_id").eq("user_id", user.id) : Promise.resolve({ data: null })
      ]);

      if (charactersResult.data) {
        setCharacters(charactersResult.data);
      }

      if (likesResult.data) {
        setUserLikes(new Set(likesResult.data.map((l) => l.character_id)));
      }

      if (favoritesResult.data) {
        setUserFavorites(new Set(favoritesResult.data.map((f) => f.character_id)));
      }
    } catch (error) {
      console.error("Error loading characters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserInteractions = async () => {
    if (!user) return;

    try {
      const [likesRes, favoritesRes] = await Promise.all([
        supabase.from("likes").select("character_id").eq("user_id", user.id),
        supabase.from("favorites").select("character_id").eq("user_id", user.id),
      ]);

      if (likesRes.data) {
        setUserLikes(new Set(likesRes.data.map((l) => l.character_id)));
      }

      if (favoritesRes.data) {
        setUserFavorites(new Set(favoritesRes.data.map((f) => f.character_id)));
      }
    } catch (error) {
      console.error("Error fetching user interactions:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col w-full max-w-[100vw] overflow-x-hidden">
      <Navbar />

      <main className="pt-20 pb-12 flex-1 bg-[#121212] w-full">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t("common.selectCharacter") || "Select a Character to Chat"}
            </h1>
            <p className="text-[#999999] text-lg">
              {t("common.chooseCharacterDescription") || "Choose a character below to start your conversation"}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/[0.08]">
                  <Skeleton className="w-full h-full bg-[#2a2a2a]" />
                </div>
              ))}
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-20" style={{ minHeight: "400px" }}>
              <p className="text-[#999999] text-lg">
                {t("common.noCharacters") || "No characters available"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  isLiked={userLikes.has(character.id)}
                  isFavorited={userFavorites.has(character.id)}
                  onLikeToggle={fetchUserInteractions}
                  onFavoriteToggle={fetchUserInteractions}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
