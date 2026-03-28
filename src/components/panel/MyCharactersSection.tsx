
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Edit,
  Trash2,
  MessageSquare,
  Eye,
  Sparkles,
  Heart,
  Star,
  Search,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CharacterEditPanel, type EditableCharacter } from "@/components/panel/CharacterEditPanel";
import { CharacterDevelopPanel } from "@/components/panel/CharacterDevelopPanel";

type CharacterType = "human" | "ai" | "anime" | "animal" | "fantasy";
type SpeechLength = "short" | "medium" | "long";
type SpeechTone = "formal" | "informal" | "funny" | "harsh";

interface Character {
  id: string;
  name: string;
  occupation_en: string | null;
  occupation_tr: string | null;
  image_url: string;
  is_published: boolean;
  is_anime: boolean;
  likes_count: number;
  favorites_count: number;
  chat_count: number;
  created_at: string;
  character_type: CharacterType;
  description_en: string | null;
  description_tr: string | null;
  character_instructions: string;
  system_message: string | null;
  speech_length: SpeechLength;
  speech_tone: SpeechTone;
  emoji_usage: boolean;
  gender: "male" | "female" | null;
}

type ActivePanel = { type: "edit" | "develop"; characterId: string } | null;

function toEditableCharacter(c: Character): EditableCharacter {
  // Derive character_type from is_anime flag for display purposes
  let characterType: CharacterType = c.character_type || "ai";
  if (c.is_anime && characterType !== "anime") {
    characterType = "anime";
  }
  return {
    id: c.id,
    name: c.name,
    occupation_en: c.occupation_en,
    occupation_tr: c.occupation_tr,
    image_url: c.image_url,
    character_type: characterType,
    description_en: c.description_en,
    description_tr: c.description_tr,
    character_instructions: c.character_instructions,
    system_message: c.system_message,
    speech_length: c.speech_length,
    speech_tone: c.speech_tone,
    emoji_usage: c.emoji_usage,
    gender: c.gender,
  };
}

export function MyCharactersSection() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMyCharacters = useCallback(async (userId: string) => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("creator_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCharacters((data as Character[]) || []);
    } catch (error) {
      console.error("Failed to load characters:", error);
      toast.error(
        language === "tr" ? "Karakterler yüklenemedi" : "Failed to load characters"
      );
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (user?.id) {
      fetchMyCharacters(user.id);
    } else {
      // If user becomes null/undefined, clear characters and stop loading
      setCharacters([]);
      setLoading(false);
    }
  }, [user?.id, fetchMyCharacters]);

  useEffect(() => {
    setActivePanel(null);
  }, [language]);

  // Listen for live sync events from edit/develop panels
  useEffect(() => {
    const handleCharacterUpdated = (event: Event) => {
      const e = event as CustomEvent;
      const updated = e.detail?.character as Partial<EditableCharacter & { is_published: boolean }> | undefined;
      if (!updated) return;

      setCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== updated.id) return c;
          return {
            ...c,
            name: updated.name ?? c.name,
            occupation_en: updated.occupation_en ?? c.occupation_en,
            occupation_tr: updated.occupation_tr ?? c.occupation_tr,
            image_url: updated.image_url ?? c.image_url,
            character_type: updated.character_type ?? c.character_type,
            is_anime: updated.character_type
              ? updated.character_type === "anime"
              : c.is_anime,
            description_en: updated.description_en ?? c.description_en,
            description_tr: updated.description_tr ?? c.description_tr,
            character_instructions:
              updated.character_instructions ?? c.character_instructions,
            system_message: updated.system_message ?? c.system_message,
            speech_length: updated.speech_length ?? c.speech_length,
            speech_tone: updated.speech_tone ?? c.speech_tone,
            emoji_usage: updated.emoji_usage ?? c.emoji_usage,
            is_published: updated.is_published ?? c.is_published,
          };
        })
      );
    };

    const handleCharacterDeveloped = () => {
      if (user?.id) {
        fetchMyCharacters(user.id);
      }
    };

    window.addEventListener("characterUpdated", handleCharacterUpdated);
    window.addEventListener("characterDeveloped", handleCharacterDeveloped);

    return () => {
      window.removeEventListener("characterUpdated", handleCharacterUpdated);
      window.removeEventListener("characterDeveloped", handleCharacterDeveloped);
    };
  }, [fetchMyCharacters, user?.id]);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        language === "tr"
          ? "Bu karakteri silmek istediğinizden emin misiniz?"
          : "Are you sure you want to delete this character?"
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("characters")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success(language === "tr" ? "Karakter silindi" : "Character deleted");
      setCharacters((prev) => prev.filter((c) => c.id !== id));

      if (activePanel?.characterId === id) {
        setActivePanel(null);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(language === "tr" ? "Silme başarısız" : "Delete failed");
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("characters")
        .update({ is_published: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        currentStatus
          ? language === "tr"
            ? "Karakter gizlendi"
            : "Character unpublished"
          : language === "tr"
          ? "Karakter yayınlandı"
          : "Character published"
      );

      setCharacters((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_published: !currentStatus } : c))
      );

      window.dispatchEvent(
        new CustomEvent("characterUpdated", {
          detail: { characterId: id, character: { id, is_published: !currentStatus } },
        })
      );
    } catch (error) {
      console.error("Toggle publish error:", error);
      toast.error(language === "tr" ? "İşlem başarısız" : "Operation failed");
    }
  };

  const togglePanel = (type: "edit" | "develop", characterId: string) => {
    if (activePanel?.type === type && activePanel?.characterId === characterId) {
      setActivePanel(null);
    } else {
      setActivePanel({ type, characterId });
    }
  };

  const handleEditSaved = (updated: EditableCharacter) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== updated.id) return c;
        return {
          ...c,
          name: updated.name,
          occupation_en: updated.occupation_en,
          occupation_tr: updated.occupation_tr,
          image_url: updated.image_url,
          character_type: updated.character_type,
          is_anime: updated.character_type === "anime",
          description_en: updated.description_en,
          description_tr: updated.description_tr,
          character_instructions: updated.character_instructions,
          system_message: updated.system_message,
          speech_length: updated.speech_length,
          speech_tone: updated.speech_tone,
          emoji_usage: updated.emoji_usage,
        };
      })
    );
    setActivePanel(null);
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredCharacters = characters.filter((character) => {
    if (!normalizedSearch) return true;

    const haystack = [
      character.name,
      character.occupation_en ?? "",
      character.occupation_tr ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  if (loading) {
    return (
      <Card className="bg-[#1a1a1a] border-white/[0.08] p-8">
        <div className="text-center text-white">
          {language === "tr" ? "Yükleniyor..." : "Loading..."}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1a1a] border-white/[0.08] p-8">
      <h2 className="text-2xl font-bold text-white mb-6">
        {language === "tr" ? "Karakterlerim" : "My Characters"}
      </h2>

      {characters.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#999999] mb-4">
            {language === "tr"
              ? "Henüz karakter oluşturmadınız"
              : "You haven't created any characters yet"}
          </p>
          <Link href="/panel?section=create-character">
            <Button className="bg-gradient-to-r from-[#6366f1] to-[#a855f7]">
              {language === "tr" ? "İlk Karakterini Oluştur" : "Create Your First Character"}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === "tr"
                  ? "İsim veya mesleğe göre ara..."
                  : "Search by name or occupation..."
              }
              className="pl-10 bg-[#2a2a2a] border-white/[0.08] text-white placeholder:text-[#999999]"
            />
          </div>

          {filteredCharacters.length === 0 ? (
            <div className="text-center py-8 text-[#999999]">
              {language === "tr"
                ? "Aramanızla eşleşen karakter bulunamadı"
                : "No characters match your search"}
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCharacters.map((character) => {
              const occupation =
                language === "tr" ? character.occupation_tr : character.occupation_en;
              const isEditOpen =
                activePanel?.type === "edit" && activePanel?.characterId === character.id;
              const isDevelopOpen =
                activePanel?.type === "develop" && activePanel?.characterId === character.id;

              return (
                <div key={character.id} className="flex flex-col gap-0">
                  <Card
                    className={cn(
                      "bg-[#2a2a2a] border-white/[0.08] overflow-hidden transition-all",
                      (isEditOpen || isDevelopOpen) && "ring-2 ring-[#6366f1]"
                    )}
                  >
                    <div className="relative aspect-[10/7]">
                      <Image
                        src={character.image_url}
                        alt={character.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized
                      />
                      <div className="absolute top-2 right-2">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-semibold",
                            character.is_published
                              ? "bg-green-500 text-white"
                              : "bg-gray-500 text-white"
                          )}
                        >
                          {character.is_published
                            ? language === "tr"
                              ? "Yayında"
                              : "Published"
                            : language === "tr"
                            ? "Taslak"
                            : "Draft"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-bold text-white line-clamp-1">
                            {character.name}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                              <Heart
                                className="w-3.5 h-3.5"
                                style={{ fill: "#ef4444", color: "#ef4444" }}
                              />
                              <span className="text-[11px] text-white font-medium">
                                {character.likes_count ?? 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                              <Star
                                className="w-3.5 h-3.5"
                                style={{ fill: "#facc15", color: "#facc15" }}
                              />
                              <span className="text-[11px] text-white font-medium">
                                {character.favorites_count ?? 0}
                              </span>
                            </div>
                            <div
                              className="flex items-center gap-1 px-2 py-1 rounded-full"
                              style={{ background: "linear-gradient(135deg, #34d399, #10b981)" }}
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-white" />
                              <span className="text-[11px] text-white font-medium">
                                {character.chat_count ?? 0}
                              </span>
                            </div>
                          </div>
                        </div>
                        {occupation && (
                          <p className="text-sm text-[#999999]">{occupation}</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() =>
                            handleTogglePublish(character.id, character.is_published)
                          }
                          variant="outline"
                          size="sm"
                          className="border-white/[0.08]"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {character.is_published
                            ? language === "tr"
                              ? "Gizle"
                              : "Hide"
                            : language === "tr"
                            ? "Yayınla"
                            : "Publish"}
                        </Button>
                        <Link href={`/chat/${character.id}`}>
                          <Button
                            size="sm"
                            className="w-full bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {language === "tr" ? "Sohbet" : "Chat"}
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "border-white/[0.08]",
                            isEditOpen && "bg-[#6366f1]/20 border-[#6366f1]/50"
                          )}
                          onClick={() => togglePanel("edit", character.id)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          {language === "tr" ? "Düzenle" : "Edit"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "border-white/[0.08]",
                            isDevelopOpen && "bg-[#a855f7]/20 border-[#a855f7]/50"
                          )}
                          onClick={() => togglePanel("develop", character.id)}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          {language === "tr" ? "Geliştir" : "Develop"}
                        </Button>
                      </div>

                      <Button
                        onClick={() => handleDelete(character.id)}
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {language === "tr" ? "Sil" : "Delete"}
                      </Button>
                    </div>
                  </Card>

                  {/* Inline Edit Panel */}
                  {isEditOpen && (
                    <CharacterEditPanel
                      key={`edit-${character.id}-${language}`}
                      character={toEditableCharacter(character)}
                      onClose={() => setActivePanel(null)}
                      onSaved={handleEditSaved}
                    />
                  )}

                  {/* Inline Develop Panel */}
                  {isDevelopOpen && (
                    <CharacterDevelopPanel
                      key={`develop-${character.id}-${language}`}
                      characterId={character.id}
                      characterName={character.name}
                      onClose={() => setActivePanel(null)}
                      onSaved={() => {
                        setActivePanel(null);
                        if (user?.id) {
                          fetchMyCharacters(user.id);
                        }
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}
    </Card>
  );
}
