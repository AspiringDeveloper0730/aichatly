
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { CampaignBanner } from "@/components/CampaignBanner";
import { SearchFilters } from "@/components/SearchFilters";
import { CharacterCard } from "@/components/CharacterCard";
import { Footer } from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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
}

interface Category {
  id: string;
  name_en: string;
  name_tr: string;
  slug: string;
}

export default function HomePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [characters, setCharacters] = useState<Character[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">("all");
  const [showAnimeOnly, setShowAnimeOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchAllPublishedCharacters = useCallback(async () => {
    const pageSize = 1000;
    let from = 0;
    const allCharacters: Character[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allCharacters.push(...(data as Character[]));

      if (data.length < pageSize) break;
      from += pageSize;
    }

    return allCharacters;
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      // Avoid clearing the UI if a later re-fetch returns temporarily empty.
      // (Prevents "cards disappear after loading" UX.)
      setIsLoadingCharacters(characters.length === 0);
      try {
        const [categoriesResult, charactersResult] = await Promise.all([
          supabase
            .from("categories")
            .select("*")
            .order("display_order", { ascending: true }),
          fetchAllPublishedCharacters(),
        ]);

        if (categoriesResult.data) {
          setCategories(categoriesResult.data);
        }

        setCharacters((prev) => {
          if (Array.isArray(charactersResult) && charactersResult.length > 0) {
            return charactersResult;
          }
          // If next fetch returns empty but we already have data, keep the existing UI.
          return prev;
        });
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    loadAllData();
  }, [fetchAllPublishedCharacters, user]);

  const fetchUserInteractions = useCallback(async () => {
    if (!userId) return;

    try {
      const [likesRes, favoritesRes] = await Promise.all([
        supabase.from("likes").select("character_id").eq("user_id", userId),
        supabase.from("favorites").select("character_id").eq("user_id", userId),
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
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserInteractions();
    } else {
      setUserLikes(new Set());
      setUserFavorites(new Set());
    }
  }, [userId, fetchUserInteractions]);

  const filteredCharacters = useMemo(() => {
    const selectedCategoryObj = selectedCategory
      ? categories.find((c) => String(c.id) === String(selectedCategory)) ?? null
      : null;

    const selectedCategorySearchTerms = selectedCategoryObj
      ? [selectedCategoryObj.name_en, selectedCategoryObj.name_tr, selectedCategoryObj.slug]
          .filter(Boolean)
          .map((s) => s!.toLowerCase().trim())
      : [];

    return characters.filter((character) => {
      const query = searchQuery.trim().toLowerCase();

      if (query) {
        const matchesName = (character.name ?? "").toLowerCase().includes(query);
        const matchesOccupation =
          (character.occupation_en ?? "").toLowerCase().includes(query) ||
          (character.occupation_tr ?? "").toLowerCase().includes(query);
        
        if (!matchesName && !matchesOccupation) return false;
      }

      if (selectedGender !== "all" && character.gender !== selectedGender) {
        return false;
      }

      if (showAnimeOnly && !character.is_anime) {
        return false;
      }

      // "Profession" chip filtering is backed by categories; match against character occupations.
      if (selectedCategoryObj && selectedCategorySearchTerms.length > 0) {
        const occupationEn = character.occupation_en?.toLowerCase() ?? "";
        const occupationTr = character.occupation_tr?.toLowerCase() ?? "";

        const matchesProfession = selectedCategorySearchTerms.some(
          (term) => occupationEn.includes(term) || occupationTr.includes(term)
        );

        if (!matchesProfession) return false;
      }

      return true;
    });
  }, [characters, searchQuery, selectedGender, showAnimeOnly, selectedCategory, categories]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col w-full max-w-[100vw] overflow-x-hidden">
      <Navbar />

      <main className="pt-20 pb-12 flex-1 bg-[#121212] w-full">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Banner wrapper — no fixed minHeight on desktop; the banner-outer handles its own height */}
          <div className="mb-6">
            <CampaignBanner />
          </div>

          <div className="mb-0 md:mb-4 pb-0">
            <SearchFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedGender={selectedGender}
              onGenderChange={setSelectedGender}
              showAnimeOnly={showAnimeOnly}
              onAnimeToggle={() => setShowAnimeOnly(!showAnimeOnly)}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categories={categories}
            />
          </div>

          {isLoadingCharacters ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-0">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/[0.08]">
                  <Skeleton className="w-full h-full bg-[#2a2a2a]" />
                </div>
              ))}
            </div>
          ) : filteredCharacters.length === 0 ? (
            <div className="text-center py-20 mt-0" style={{ minHeight: "400px" }}>
              <p className="text-[#999999] text-lg">
                {t("common.noCharacters")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-0">
              {filteredCharacters.map((character) => (
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
