
"use client";

import React, { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { upload } from "@zoerai/integration";
import { X, Upload, Loader2, Save } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

// Internal enum values — language-independent, match DB enums exactly
type CharacterType = "human" | "ai" | "anime" | "animal" | "fantasy";
type SpeechLength = "short" | "medium" | "long";
type SpeechTone = "formal" | "informal" | "funny" | "harsh";

const VALID_CHARACTER_TYPES: CharacterType[] = ["human", "ai", "anime", "animal", "fantasy"];
const VALID_SPEECH_LENGTHS: SpeechLength[] = ["short", "medium", "long"];
const VALID_SPEECH_TONES: SpeechTone[] = ["formal", "informal", "funny", "harsh"];

export interface EditableCharacter {
  id: string;
  name: string;
  occupation_en: string | null;
  occupation_tr: string | null;
  image_url: string;
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

interface CharacterEditPanelProps {
  character: EditableCharacter;
  onClose: () => void;
  onSaved: (updated: EditableCharacter) => void;
}

function safeCharacterType(val: unknown): CharacterType {
  if (typeof val === "string" && VALID_CHARACTER_TYPES.includes(val as CharacterType)) {
    return val as CharacterType;
  }
  return "ai";
}

function safeSpeechLength(val: unknown): SpeechLength {
  if (typeof val === "string" && VALID_SPEECH_LENGTHS.includes(val as SpeechLength)) {
    return val as SpeechLength;
  }
  return "medium";
}

function safeSpeechTone(val: unknown): SpeechTone {
  if (typeof val === "string" && VALID_SPEECH_TONES.includes(val as SpeechTone)) {
    return val as SpeechTone;
  }
  return "informal";
}

export function CharacterEditPanel({ character, onClose, onSaved }: CharacterEditPanelProps) {
  const { language } = useLanguage();

  const [name, setName] = useState(character.name || "");
  const [occupation, setOccupation] = useState(character.occupation_en || "");
  const [imageUrl, setImageUrl] = useState(character.image_url);
  const [characterType, setCharacterType] = useState<CharacterType>(
    safeCharacterType(character.character_type)
  );
  const [personality, setPersonality] = useState(character.description_en || "");
  const [instructions, setInstructions] = useState(character.character_instructions || "");
  const [systemMessage, setSystemMessage] = useState(character.system_message || "");
  const [speechLength, setSpeechLength] = useState<SpeechLength>(
    safeSpeechLength(character.speech_length)
  );
  const [speechTone, setSpeechTone] = useState<SpeechTone>(
    safeSpeechTone(character.speech_tone)
  );
  const [emojiUsage, setEmojiUsage] = useState<boolean>(character.emoji_usage ?? false);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCharacterTypeChange = useCallback((val: string) => {
    setCharacterType(safeCharacterType(val));
  }, []);

  const handleSpeechLengthChange = useCallback((val: string) => {
    setSpeechLength(safeSpeechLength(val));
  }, []);

  const handleSpeechToneChange = useCallback((val: string) => {
    setSpeechTone(safeSpeechTone(val));
  }, []);

  const handleEmojiUsageChange = useCallback((val: string) => {
    setEmojiUsage(val === "on");
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await upload.uploadWithPresignedUrl(file, {
        maxSize: 5 * 1024 * 1024,
        allowedExtensions: [".png", ".jpg", ".jpeg"],
      });

      if (result.success && result.url) {
        setImageUrl(result.url);
        toast.success(language === "tr" ? "Görsel yüklendi!" : "Image uploaded!");
      } else if (!result.success) {
        toast.error(
          result.error ||
            (language === "tr" ? "Görsel yüklenemedi" : "Failed to upload image")
        );
      }
      // If result.success is true but url is missing, silently ignore (edge case)
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error(language === "tr" ? "Görsel yükleme hatası" : "Image upload error");
    } finally {
      setIsUploadingImage(false);
      // Reset input so same file can be re-selected
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    const trimmedInstructions = instructions.trim();
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error(language === "tr" ? "İsim boş bırakılamaz" : "Name cannot be empty");
      return;
    }

    if (!trimmedInstructions) {
      toast.error(
        language === "tr"
          ? "Karakter talimatları boş bırakılamaz"
          : "Character instructions cannot be empty"
      );
      return;
    }

    setIsSaving(true);
    try {
      // Only send columns that actually exist in the DB schema
      // character_type is stored as is_anime boolean in the DB
      const isAnime = characterType === "anime";

      const updates: Record<string, unknown> = {
        name: trimmedName,
        occupation_en: occupation,
        occupation_tr: occupation,
        image_url: imageUrl,
        is_anime: isAnime,
        description_en: personality,
        description_tr: personality,
        character_instructions: trimmedInstructions,
        system_message: systemMessage.trim() || null,
        speech_length: speechLength,
        speech_tone: speechTone,
        emoji_usage: emojiUsage,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("characters")
        .update(updates)
        .eq("id", character.id);

      if (error) throw error;

      const updatedCharacter: EditableCharacter = {
        ...character,
        name: trimmedName,
        occupation_en: occupation,
        occupation_tr: occupation,
        image_url: imageUrl,
        character_type: characterType,
        description_en: personality,
        description_tr: personality,
        character_instructions: trimmedInstructions,
        system_message: systemMessage.trim() || null,
        speech_length: speechLength,
        speech_tone: speechTone,
        emoji_usage: emojiUsage,
      };

      // Broadcast live sync event to all panels
      window.dispatchEvent(
        new CustomEvent("characterUpdated", {
          detail: { characterId: character.id, character: updatedCharacter },
        })
      );

      toast.success(language === "tr" ? "Karakter güncellendi!" : "Character updated!");
      onSaved(updatedCharacter);
    } catch (err) {
      console.error("Save error:", err);
      toast.error(language === "tr" ? "Kaydetme başarısız" : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-[#1e1e1e] border-white/[0.08] p-6 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">
          {language === "tr" ? "Karakteri Düzenle" : "Edit Character"}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/[0.05]"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Image + Basic Info */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-white/[0.08]">
              <Image
                src={imageUrl}
                alt={name}
                fill
                className="object-cover"
                sizes="128px"
              />
            </div>
            <label>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-white/[0.08] text-white hover:bg-[#2a2a2a] cursor-pointer"
                disabled={isUploadingImage}
              >
                <span>
                  {isUploadingImage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {language === "tr" ? "Görsel Değiştir" : "Change Image"}
                </span>
              </Button>
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploadingImage}
              />
            </label>
          </div>

          {/* Name + Occupation + Type */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white mb-2 block">
                {language === "tr" ? "İsim *" : "Name *"}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#2a2a2a] border-white/[0.08] text-white"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                {language === "tr" ? "Meslek" : "Occupation"}
              </Label>
              <Input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="bg-[#2a2a2a] border-white/[0.08] text-white"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-white mb-2 block">
                {language === "tr" ? "Karakter Tipi" : "Character Type"}
              </Label>
              <Select value={characterType} onValueChange={handleCharacterTypeChange}>
                <SelectTrigger className="bg-[#2a2a2a] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-white/[0.08]">
                  <SelectItem value="human">
                    {language === "tr" ? "İnsan" : "Human"}
                  </SelectItem>
                  <SelectItem value="ai">
                    {language === "tr" ? "Yapay Zeka" : "Artificial Intelligence"}
                  </SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                  <SelectItem value="animal">
                    {language === "tr" ? "Hayvan" : "Animal"}
                  </SelectItem>
                  <SelectItem value="fantasy">
                    {language === "tr" ? "Fantezi" : "Fantasy"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Personality */}
        <div>
          <Label className="text-white mb-2 block">
            {language === "tr" ? "Kişilik Açıklaması" : "Personality Description"}
          </Label>
          <Textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            className="bg-[#2a2a2a] border-white/[0.08] text-white"
            rows={3}
          />
        </div>

        {/* AI Brain */}
        <div className="p-4 bg-[#2a2a2a] rounded-lg border border-[#6366f1]/20 space-y-4">
          <h4 className="text-white font-semibold">
            {language === "tr" ? "AI BEYNİ" : "AI BRAIN"}
          </h4>

          <div>
            <Label className="text-white mb-2 block">
              {language === "tr" ? "Karakter Talimatları *" : "Character Instructions *"}
            </Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={
                language === "tr"
                  ? "Bu karakterin uzmanlık alanını, konuşma tarzını ve sınırlarını girin..."
                  : "Enter this character's specialization, speech style, and boundaries..."
              }
              className="bg-[#1a1a1a] border-white/[0.08] text-white"
              rows={4}
            />
            <p className="text-xs text-[#999999] mt-1">
              {language === "tr"
                ? "Zorunlu alan. AI her mesajda bu talimatları kullanır."
                : "Required. AI uses these instructions in every message."}
            </p>
          </div>

          <div>
            <Label className="text-white mb-2 block">
              {language === "tr"
                ? "Sistem Mesajı (İlk Karşılama Mesajı)"
                : "System Message (First Welcome Message)"}
            </Label>
            <Textarea
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              placeholder={
                language === "tr"
                  ? "Sohbet açıldığında gönderilecek ilk mesaj (isteğe bağlı)"
                  : "First message sent when chat opens (optional)"
              }
              className="bg-[#1a1a1a] border-white/[0.08] text-white"
              rows={3}
            />
          </div>
        </div>

        {/* Behavior Settings */}
        <div className="p-4 bg-[#2a2a2a] rounded-lg border border-white/[0.08] space-y-4">
          <h4 className="text-white font-semibold">
            {language === "tr" ? "KONUŞMA AYARLARI" : "BEHAVIOR SETTINGS"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white mb-2 block text-sm">
                {language === "tr" ? "Konuşma Uzunluğu" : "Conversation Length"}
              </Label>
              <Select value={speechLength} onValueChange={handleSpeechLengthChange}>
                <SelectTrigger className="bg-[#1a1a1a] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-white/[0.08]">
                  <SelectItem value="short">
                    {language === "tr" ? "Kısa" : "Short"}
                  </SelectItem>
                  <SelectItem value="medium">
                    {language === "tr" ? "Orta" : "Medium"}
                  </SelectItem>
                  <SelectItem value="long">
                    {language === "tr" ? "Uzun" : "Long"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white mb-2 block text-sm">
                {language === "tr" ? "Ton" : "Tone"}
              </Label>
              <Select value={speechTone} onValueChange={handleSpeechToneChange}>
                <SelectTrigger className="bg-[#1a1a1a] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-white/[0.08]">
                  <SelectItem value="formal">
                    {language === "tr" ? "Resmi" : "Formal"}
                  </SelectItem>
                  <SelectItem value="informal">
                    {language === "tr" ? "Gayri Resmi" : "Informal"}
                  </SelectItem>
                  <SelectItem value="funny">
                    {language === "tr" ? "Komik" : "Funny"}
                  </SelectItem>
                  <SelectItem value="harsh">
                    {language === "tr" ? "Sert" : "Harsh"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white mb-2 block text-sm">
                {language === "tr" ? "Emoji Kullanımı" : "Emoji Usage"}
              </Label>
              <Select
                value={emojiUsage ? "on" : "off"}
                onValueChange={handleEmojiUsageChange}
              >
                <SelectTrigger className="bg-[#1a1a1a] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-white/[0.08]">
                  <SelectItem value="on">
                    {language === "tr" ? "Açık" : "On"}
                  </SelectItem>
                  <SelectItem value="off">
                    {language === "tr" ? "Kapalı" : "Off"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !instructions.trim()}
            className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === "tr" ? "Kaydediliyor..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {language === "tr" ? "Kaydet" : "Save"}
              </>
            )}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="border-white/[0.08] text-white hover:bg-[#2a2a2a]"
          >
            {language === "tr" ? "İptal" : "Cancel"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
