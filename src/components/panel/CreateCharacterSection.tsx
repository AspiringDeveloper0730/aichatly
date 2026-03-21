
"use client";

import React, { useState, useEffect, useRef } from "react";
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
import {
  Sparkles,
  Upload,
  RefreshCw,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { upload } from "@zoerai/integration";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;

type CharacterType = "human" | "ai" | "anime" | "animal" | "fantasy";
type SpeechLength = "short" | "medium" | "long";
type SpeechTone = "formal" | "informal" | "funny" | "harsh";
type Gender = "male" | "female" | "";

interface CharacterFormData {
  name: string;
  profession: string;
  age: string;
  gender: Gender;
  hairColor: string;
  eyeColor: string;
  country: string;
  personality: string;
  characterType: CharacterType;
  characterInstructions: string;
  systemMessage: string;
  speechLength: SpeechLength;
  speechTone: SpeechTone;
  emojiUsage: boolean;
}

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

// Internal-key-only safe guards — never compare against translated labels
const VALID_CHARACTER_TYPES: CharacterType[] = ["human", "ai", "anime", "animal", "fantasy"];
const VALID_SPEECH_LENGTHS: SpeechLength[] = ["short", "medium", "long"];
const VALID_SPEECH_TONES: SpeechTone[] = ["formal", "informal", "funny", "harsh"];

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

function safeGender(val: unknown): Gender {
  if (val === "male" || val === "female") return val;
  return "";
}

const DEFAULT_FORM: CharacterFormData = {
  name: "",
  profession: "",
  age: "",
  gender: "",
  hairColor: "",
  eyeColor: "",
  country: "",
  personality: "",
  characterType: "ai",
  characterInstructions: "",
  systemMessage: "Example: Hello, I am here to help you regarding my profession. You can write your question in detail.",
  speechLength: "medium",
  speechTone: "informal",
  emojiUsage: false,
};

export function CreateCharacterSection() {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Step 1
  const [simplePrompt, setSimplePrompt] = useState("");
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [characterData, setCharacterData] = useState<CharacterFormData>(DEFAULT_FORM);

  // Step 2
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [generationCount, setGenerationCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Step 3
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation state
  const [characterInstructionsError, setCharacterInstructionsError] = useState(false);

  // Step 4
  const [createdCharacterId, setCreatedCharacterId] = useState<string>("");

  useEffect(() => {
    if (user) {
      loadOrCreateSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadOrCreateSession = async () => {
    console.log("loadOrCreateSession")
    if (!user) return;
    try {
      const { data: existingSession, error } = await supabase
        .from("character_creation_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (existingSession) {
        setSessionId(existingSession.id);
        setCurrentStep(existingSession.step_number as Step);
        setSimplePrompt(existingSession.original_prompt || "");
        setOptimizedPrompt(existingSession.optimized_prompt || "");
        setGenerationCount(existingSession.generation_attempts || 0);
        setSelectedImage(existingSession.selected_image_url || "");
        
        // Restore createdCharacterId if character was already created
        if (existingSession.character_id) {
          setCreatedCharacterId(existingSession.character_id);
        }

        if (existingSession.form_data) {
          // Restore form data using safe guards so internal keys are always valid
          const fd = existingSession.form_data as Partial<CharacterFormData>;
          setCharacterData({
            name: fd.name || "",
            profession: fd.profession || "",
            age: fd.age || "",
            gender: safeGender(fd.gender),
            hairColor: fd.hairColor || "",
            eyeColor: fd.eyeColor || "",
            country: fd.country || "",
            personality: fd.personality || "",
            characterType: safeCharacterType(fd.characterType),
            characterInstructions: fd.characterInstructions || "",
            systemMessage: fd.systemMessage || "Example: Hello, I am here to help you regarding my profession. You can write your question in detail.",
            speechLength: safeSpeechLength(fd.speechLength),
            speechTone: safeSpeechTone(fd.speechTone),
            emojiUsage: typeof fd.emojiUsage === "boolean" ? fd.emojiUsage : false,
          });
        }
      } else {
        const { data: newSession, error: createError } = await supabase
          .from("character_creation_sessions")
          .insert({
            user_id: user.id,
            step_number: 1,
            generation_attempts: 0,
            is_completed: false,
          })
          .select()
          .maybeSingle();

        if (createError) throw createError;
        if (newSession) setSessionId(newSession.id);
      }
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const updateSession = async (updates: Record<string, unknown>) => {
    if (!sessionId) return;
    try {
      await supabase
        .from("character_creation_sessions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error updating session:", error);
    }
  };

  // Update a single field in characterData using the internal key — language-independent
  const updateField = <K extends keyof CharacterFormData>(key: K, value: CharacterFormData[K]) => {
    setCharacterData((prev) => ({ ...prev, [key]: value }));
  };

  const handleOptimizePrompt = async () => {
    if (!simplePrompt.trim()) {
      toast.error(language === "tr" ? "Lütfen bir açıklama girin" : "Please enter a description");
      return;
    }

    setIsOptimizing(true);
    try {
      const words = simplePrompt.toLowerCase();
      let optimized = `Professional portrait of ${simplePrompt}, `;
      const updates: Partial<CharacterFormData> = {};

      if (words.includes("doctor") || words.includes("physician")) {
        updates.profession = "Doctor";
        optimized += "medical professional in white coat, ";
      } else if (words.includes("teacher") || words.includes("professor")) {
        updates.profession = "Teacher";
        optimized += "educator in professional attire, ";
      } else if (words.includes("engineer")) {
        updates.profession = "Engineer";
        optimized += "technical professional, ";
      } else if (words.includes("artist")) {
        updates.profession = "Artist";
        optimized += "creative professional, ";
      } else if (words.includes("lawyer")) {
        updates.profession = "Lawyer";
        optimized += "legal professional in formal suit, ";
      }

      if (words.includes("male") || words.includes("man") || words.includes("he")) {
        updates.gender = "male";
      } else if (words.includes("female") || words.includes("woman") || words.includes("she")) {
        updates.gender = "female";
      }

      if (words.includes("young")) {
        updates.age = "25-30";
      } else if (words.includes("middle-aged")) {
        updates.age = "40-50";
      } else if (words.includes("senior") || words.includes("elderly")) {
        updates.age = "60+";
      }

      optimized +=
        "detailed facial features, professional photography, high quality, 4K resolution, studio lighting, neutral background, realistic style";

      setOptimizedPrompt(optimized);
      setCharacterData((prev) => ({ ...prev, ...updates }));

      await updateSession({
        original_prompt: simplePrompt,
        optimized_prompt: optimized,
        form_data: { ...characterData, ...updates },
      });

      toast.success(language === "tr" ? "Prompt optimize edildi!" : "Prompt optimized!");
    } catch (error) {
      console.error("Optimization error:", error);
      toast.error(language === "tr" ? "Optimizasyon başarısız" : "Optimization failed");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAutoFillFields = () => {
    const suggestions: Partial<CharacterFormData> = {
      hairColor: characterData.gender === "female" ? "Brown" : "Black",
      eyeColor: "Brown",
      country: "United States",
      personality: "Friendly, Professional, Helpful",
      characterInstructions: `You are ${characterData.name || "a helpful assistant"}${
        characterData.profession ? `, a ${characterData.profession}` : ""
      }. You provide accurate, helpful, and professional responses. Always maintain a respectful and supportive tone. Your expertise lies in ${
        characterData.profession || "general assistance"
      }, and you're here to help users with their questions and concerns.`,
    };

    if (!characterData.age) suggestions.age = "25-35";

    setCharacterData((prev) => ({ ...prev, ...suggestions }));
    toast.success(language === "tr" ? "Alanlar otomatik dolduruldu" : "Fields auto-filled");
  };

  const handleGenerateImage = async () => {
    // Check if user is premium
    if (!profile?.is_premium) {
      toast.error(
        language === "tr"
          ? "Sadece premium kullanıcılar görsel oluşturabilir"
          : "Only premium user can create image"
      );
      return;
    }

    if (generationCount >= 2) {
      toast.error(
        language === "tr"
          ? "Maksimum 2 görsel oluşturabilirsiniz"
          : "Maximum 2 images allowed"
      );
      return;
    }

    const promptToUse = optimizedPrompt || simplePrompt;
    if (!promptToUse) {
      toast.error(language === "tr" ? "Lütfen bir prompt girin" : "Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptToUse,
          aspectRatio: "1:1",
        }),
      });

      const result = await response.json();

      if (result.success && result.imageUrl) {
        setGeneratedImages((prev) => [...prev, result.imageUrl!]);
        setSelectedImage(result.imageUrl);
        setUploadedImage("");
        const newCount = generationCount + 1;
        setGenerationCount(newCount);

        await updateSession({
          generation_attempts: newCount,
          selected_image_url: result.imageUrl,
        });

        toast.success(language === "tr" ? "Görsel oluşturuldu!" : "Image generated!");
      } else {
        toast.error(
          result.error ||
            (language === "tr" ? "Görsel oluşturulamadı" : "Failed to generate image")
        );
      }
    } catch (error) {
      console.error("Image generation error:", error);
      toast.error(
        language === "tr" ? "Görsel oluşturma hatası" : "Image generation error"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await upload.uploadWithPresignedUrl(file, {
        maxSize: 5 * 1024 * 1024,
        allowedExtensions: [".png", ".jpg", ".jpeg"],
      });
      console.log("result", result)
      if (result.success && result.url) {
        setUploadedImage(result.url);
        setSelectedImage(result.url);
        // Update session asynchronously without blocking
        updateSession({ selected_image_url: result.url }).catch((err) => {
          console.error("Error updating session:", err);
        });
        toast.success(language === "tr" ? "Görsel yüklendi!" : "Image uploaded!");
      } else if (!result.success) {
        toast.error(
          result.error ||
            (language === "tr" ? "Görsel yüklenemedi" : "Failed to upload image")
        );
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error(language === "tr" ? "Görsel yükleme hatası" : "Image upload error");
    } finally {
      setIsUploadingImage(false);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handleDeleteUploadedImage = () => {
    setUploadedImage("");
    if (selectedImage === uploadedImage) setSelectedImage("");
    toast.success(
      language === "tr" ? "Yüklenen görsel silindi" : "Uploaded image deleted"
    );
  };

  const handleFileUploadClick = () => {
    // Check if user is premium before opening file picker
    if (!profile?.is_premium) {
      toast.error(
        language === "tr"
          ? "Bu özellik sadece premium kullanıcılar içindir. Metni oluşturduktan sonra 'Karakterlerim' bölümünden yükleyebilirsiniz."
          : "This feature is for premium users only. You can upload text from the 'My Characters' section after creation."
      );
      return;
    }

    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await upload.uploadWithPresignedUrl(file, {
          maxSize: 10 * 1024 * 1024,
          allowedExtensions: [".pdf", ".txt", ".doc", ".docx"],
        });

        if (result.success && result.url) {
          return { name: file.name, url: result.url, size: file.size, type: file.type };
        }
        return null;
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((r): r is UploadedFile => r !== null);

      if (successfulUploads.length > 0) {
        setUploadedFiles((prev) => [...prev, ...successfulUploads]);
        // Dispatch file upload quota event
        window.dispatchEvent(
          new CustomEvent("fileUploaded", { detail: { count: successfulUploads.length } })
        );
        toast.success(
          language === "tr"
            ? `${successfulUploads.length} dosya yüklendi!`
            : `${successfulUploads.length} files uploaded!`
        );
      }

      const failedCount = files.length - successfulUploads.length;
      if (failedCount > 0) {
        toast.error(
          language === "tr"
            ? `${failedCount} dosya yüklenemedi`
            : `${failedCount} file(s) failed to upload`
        );
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error(language === "tr" ? "Dosya yükleme hatası" : "File upload error");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateCharacter = async () => {
    if (!user) return;

    if (!characterData.name || !selectedImage) {
      toast.error(
        language === "tr" ? "İsim ve görsel gerekli" : "Name and image required"
      );
      return;
    }

    if (!characterData.characterInstructions.trim()) {
      toast.error(
        language === "tr"
          ? "Karakter talimatları gerekli"
          : "Character instructions required"
      );
      return;
    }

    setLoading(true);
    try {
      // Check if we're updating an existing character (only if createdCharacterId is set)
      let existingCharacter = null;
      console.log("createdCharacterId", createdCharacterId)
      if (createdCharacterId) {
        const { data: char } = await supabase
          .from("characters")
          .select("id")
          .eq("id", createdCharacterId)
          .eq("creator_id", user.id)
          .maybeSingle();
        existingCharacter = char;
      }

      // Check character creation limit based on the user's active package tier.
      // Only applies when creating a new character (not updating an existing one).
      if (!existingCharacter) {
        // 1) Get user's active package tier
        const { data: userQuota, error: quotaTierError } = await supabase
          .from("user_quotas")
          .select("package_tier")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (quotaTierError) throw quotaTierError;

        const packageTier = userQuota?.package_tier ?? (profile?.is_premium ? "starter" : "free");

        // 2) Get character creation limit for that tier
        const { data: quotaDef, error: quotaDefError } = await supabase
          .from("package_quota_definitions")
          .select("character_creation_limit")
          .eq("package_tier", packageTier)
          .maybeSingle();

        if (quotaDefError) throw quotaDefError;

        const characterCreationLimit =
          quotaDef?.character_creation_limit ?? (profile?.is_premium ? null : 2);

        // 3) Count how many characters the user already has
        const { data: existingCharacters, error: countError } = await supabase
          .from("characters")
          .select("id")
          .eq("creator_id", user.id)
          .is("deleted_at", null);

        if (countError) throw countError;

        const characterCount = existingCharacters?.length ?? 0;

        // 4) Block if count reached/exceeded the tier limit
        if (
          typeof characterCreationLimit === "number" &&
          characterCount >= characterCreationLimit
        ) {
          toast.error(
            language === "tr"
              ? `${packageTier} kullanıcıları en fazla ${characterCreationLimit} karakter oluşturabilir`
              : `${packageTier} users can have only ${characterCreationLimit} characters`
          );
          setLoading(false);
          return;
        }
      }

      // Check if character with same profession already exists
      if (characterData.profession) {
        const { data: allUserCharacters, error: professionError } = await supabase
          .from("characters")
          .select("id, occupation_en, occupation_tr")
          .eq("creator_id", user.id);

        if (professionError) throw professionError;

        // Normalize the profession for comparison (case-insensitive, trimmed)
        const normalizedProfession = characterData.profession.toLowerCase().trim();

        // Check if any character has the same profession
        const hasDuplicateProfession = allUserCharacters?.some((char) => {
          const occupationEnMatch =
            char.occupation_en?.toLowerCase().trim() === normalizedProfession;
          const occupationTrMatch =
            char.occupation_tr?.toLowerCase().trim() === normalizedProfession;
          return occupationEnMatch || occupationTrMatch;
        }) || false;

        console.log("hasDuplicateProfession", hasDuplicateProfession)
        if (hasDuplicateProfession) {
          toast.error(
            language === "tr"
              ? `Zaten ${characterData.profession} mesleğine sahip bir karakteriniz var`
              : `You already have a character with profession ${characterData.profession}`
          );
          setLoading(false);
          return;
        }
      }

      const characterDataToSave = {
        creator_id: user.id,
        name: characterData.name,
        occupation_en: characterData.profession,
        occupation_tr: characterData.profession,
        description_en: optimizedPrompt || simplePrompt,
        description_tr: optimizedPrompt || simplePrompt,
        gender: characterData.gender || null,
        image_url: selectedImage,
        is_anime: characterData.characterType === "anime",
        is_published: false,
        character_instructions: characterData.characterInstructions,
        system_message: characterData.systemMessage || null,
        speech_length: characterData.speechLength,
        speech_tone: characterData.speechTone,
        emoji_usage: characterData.emojiUsage,
        age: characterData.age || null,
        country: characterData.country || null,
        updated_at: new Date().toISOString(),
      };

      let character;
      let characterError;

      if (existingCharacter) {
        // Update existing character (exclude creator_id and is_published from update to preserve existing values)
        const { creator_id, is_published, ...updateData } = characterDataToSave;
        const { data: updatedCharacter, error: updateError } = await supabase
          .from("characters")
          .update(updateData)
          .eq("id", existingCharacter.id)
          .select()
          .maybeSingle();

        character = updatedCharacter;
        characterError = updateError;
      } else {
        // Create new character
        const { data: newCharacter, error: insertError } = await supabase
          .from("characters")
          .insert(characterDataToSave)
          .select()
          .maybeSingle();

        character = newCharacter;
        characterError = insertError;
      } 

      if (characterError) throw characterError;
      if (!character) throw new Error("Character creation failed");

      setCreatedCharacterId(character.id);

      // Dispatch character creation quota event
      window.dispatchEvent(new CustomEvent("characterCreated"));

      if (uploadedFiles.length > 0) {
        const fileInserts = uploadedFiles.map((file) => ({
          character_id: character.id,
          file_name: file.name,
          file_type: file.name.endsWith(".pdf")
            ? "pdf"
            : file.name.endsWith(".txt")
            ? "txt"
            : "doc",
          file_size_bytes: file.size,
          storage_path: file.url,
          is_processed: false,
        }));

        await supabase.from("character_training_files").insert(fileInserts);
      }

      await updateSession({
        character_id: character.id,
        step_number: 4,
        is_completed: false,
      });

      setCurrentStep(4);
      toast.success(language === "tr" ? "Karakter oluşturuldu!" : "Character created!");
    } catch (error) {
      console.error("Character creation error:", error);
      toast.error(
        language === "tr" ? "Karakter oluşturulamadı" : "Failed to create character"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePublishCharacter = async () => {
    if (!createdCharacterId) {
      toast.error(
        language === "tr"
          ? "Karakter ID bulunamadı. Lütfen karakteri tekrar oluşturun."
          : "Character ID not found. Please create the character again."
      );
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("characters")
        .update({ is_published: true })
        .eq("id", createdCharacterId);

      if (error) throw error;

      await updateSession({ is_completed: true });
      toast.success(language === "tr" ? "Karakter yayınlandı!" : "Character published!");

      setTimeout(() => resetForm(), 2000);
    } catch (error) {
      console.error("Publishing error:", error);
      toast.error(language === "tr" ? "Yayınlama başarısız" : "Publishing failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = async () => {
    // Mark existing session as completed before resetting
    if (sessionId) {
      await supabase
        .from("character_creation_sessions")
        .update({ is_completed: true })
        .eq("id", sessionId);
    }

      // Reset all state immediately
      setCurrentStep(1);
      setSimplePrompt("");
      setOptimizedPrompt("");
      setCharacterData(DEFAULT_FORM);
      setGeneratedImages([]);
      setSelectedImage("");
      setUploadedImage("");
      setGenerationCount(0);
      setUploadedFiles([]);
      setCreatedCharacterId("");
      setSessionId(null);
      
      // Create a new session with step 1
      if (user) {
        const { data: newSession, error: createError } = await supabase
          .from("character_creation_sessions")
          .insert({
            user_id: user.id,
            step_number: 1,
            generation_attempts: 0,
            is_completed: false,
          })
          .select()
          .maybeSingle();

      if (createError) {
        console.error("Error creating new session:", createError);
      } else if (newSession) {
        setSessionId(newSession.id);
      }
    }
  };

  // Navigation — no validation blocking on step transitions
  const goToNextStep = () => {
    // Validate Character Instructions when moving from step 1 to step 2
    if (currentStep === 1) {
      if (!characterData.characterInstructions.trim()) {
        setCharacterInstructionsError(true);
        return;
      }
      setCharacterInstructionsError(false);
    }

    if (currentStep < 4) {
      const nextStep = (currentStep + 1) as Step;
      setCurrentStep(nextStep);
      updateSession({ step_number: nextStep, form_data: characterData });
    }
  };

  // Disable certain AI helpers for non-human/AI character types
  const isHelperAIDisabled =
    characterData.characterType === "anime" ||
    characterData.characterType === "animal" ||
    characterData.characterType === "fantasy";

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as Step;
      setCurrentStep(prevStep);
      updateSession({ step_number: prevStep });
    }
  };

  return (
    <Card className="bg-[#1a1a1a] border-white/[0.08] p-4 md:p-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8 gap-2">
        {[1, 2, 3, 4].map((step, index) => (
          <React.Fragment key={step}>
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
                currentStep >= step
                  ? "bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white"
                  : "bg-[#2a2a2a] text-[#666666]"
              )}
            >
              {currentStep > step ? <Check className="w-5 h-5" /> : step}
            </div>
            {index < 3 && (
              <div
                className={cn(
                  "w-8 md:w-16 h-1 transition-all",
                  currentStep > step
                    ? "bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
                    : "bg-[#2a2a2a]"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: Character Details ── */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {language === "tr" ? "Karakter Detayları" : "Character Details"}
            </h2>
            <p className="text-[#999999]">
              {language === "tr"
                ? "Karakteriniz için temel bilgileri girin"
                : "Enter basic information for your character"}
            </p>
          </div>

          <div className="space-y-4">
            {/* Simple Prompt */}
            <div>
              <Label className="text-white mb-2 block">
                {language === "tr" ? "Basit Açıklama" : "Simple Description"}
              </Label>
              <Textarea
                value={simplePrompt}
                onChange={(e) => setSimplePrompt(e.target.value)}
                placeholder={
                  language === "tr"
                    ? "Örn: Genç bir kadın doktor karakteri olsun"
                    : "e.g., Let it be a young female doctor character"
                }
                className="bg-[#2a2a2a] border-white/[0.08] text-white"
                rows={3}
              />
              <Button
                onClick={handleOptimizePrompt}
                disabled={isOptimizing || !simplePrompt.trim() || isHelperAIDisabled}
                className="mt-2 bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === "tr" ? "Optimize Ediliyor..." : "Optimizing..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === "tr" ? "AI ile Optimize Et" : "Optimize with AI"}
                  </>
                )}
              </Button>
            </div>

            {/* Optimized Prompt Display */}
            {optimizedPrompt && (
              <div className="p-4 bg-[#2a2a2a] rounded-lg border border-[#6366f1]/20">
                <Label className="text-white mb-2 block">
                  {language === "tr" ? "Optimize Edilmiş Prompt" : "Optimized Prompt"}
                </Label>
                <p className="text-sm text-[#cccccc]">{optimizedPrompt}</p>
              </div>
            )}

            {/* Character Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">
                  {language === "tr" ? "İsim *" : "Name *"}
                </Label>
                <Input
                  value={characterData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder={language === "tr" ? "Karakter adı" : "Character name"}
                  className="bg-[#2a2a2a] border-white/[0.08] text-white"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">
                  {language === "tr" ? "Meslek" : "Profession"}
                </Label>
                <Input
                  value={characterData.profession}
                  onChange={(e) => updateField("profession", e.target.value)}
                  placeholder={language === "tr" ? "Örn: Doktor" : "e.g., Doctor"}
                  className="bg-[#2a2a2a] border-white/[0.08] text-white"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">
                  {language === "tr" ? "Yaş" : "Age"}
                </Label>
                <Input
                  value={characterData.age}
                  onChange={(e) => updateField("age", e.target.value)}
                  placeholder={language === "tr" ? "Örn: 25-30" : "e.g., 25-30"}
                  className="bg-[#2a2a2a] border-white/[0.08] text-white"
                />
              </div>

              {/* Gender — value is always the internal key "male" | "female" */}
              <div>
                <Label className="text-white mb-2 block">
                  {language === "tr" ? "Cinsiyet" : "Gender"}
                </Label>
                <Select
                  value={characterData.gender}
                  onValueChange={(val) => updateField("gender", safeGender(val))}
                >
                  <SelectTrigger className="bg-[#2a2a2a] border-white/[0.08] text-white">
                    <SelectValue
                      placeholder={language === "tr" ? "Seçiniz" : "Select"}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-white/[0.08]">
                    <SelectItem value="male">
                      {language === "tr" ? "Erkek" : "Male"}
                    </SelectItem>
                    <SelectItem value="female">
                      {language === "tr" ? "Kadın" : "Female"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white mb-2 block">
                  {language === "tr" ? "Saç Rengi" : "Hair Color"}
                </Label>
                <Input
                  value={characterData.hairColor}
                  onChange={(e) => updateField("hairColor", e.target.value)}
                  placeholder={language === "tr" ? "Örn: Kahverengi" : "e.g., Brown"}
                  className="bg-[#2a2a2a] border-white/[0.08] text-white"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">
                  {language === "tr" ? "Göz Rengi" : "Eye Color"}
                </Label>
                <Input
                  value={characterData.eyeColor}
                  onChange={(e) => updateField("eyeColor", e.target.value)}
                  placeholder={language === "tr" ? "Örn: Mavi" : "e.g., Blue"}
                  className="bg-[#2a2a2a] border-white/[0.08] text-white"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">
                  {language === "tr" ? "Ülke" : "Country"}
                </Label>
                <Input
                  value={characterData.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder={language === "tr" ? "Örn: Türkiye" : "e.g., United States"}
                  className="bg-[#2a2a2a] border-white/[0.08] text-white"
                />
              </div>

              {/* Character Type — value is always the internal key */}
              <div>
                <Label className="text-white mb-2 block">
                  {language === "tr" ? "Karakter Tipi" : "Character Type"}
                </Label>
                <Select
                  value={characterData.characterType}
                  onValueChange={(val) => updateField("characterType", safeCharacterType(val))}
                >
                  <SelectTrigger className="bg-[#2a2a2a] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-white/[0.08]">
                    <SelectItem value="human">
                      {language === "tr" ? "İnsan" : "Human"}
                    </SelectItem>
                    <SelectItem value="ai">
                      {language === "tr" ? "Yapay Zeka" : "AI"}
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

            {/* Personality */}
            <div>
              <Label className="text-white mb-2 block">
                {language === "tr" ? "Kişilik" : "Personality"}
              </Label>
              <Textarea
                value={characterData.personality}
                onChange={(e) => updateField("personality", e.target.value)}
                placeholder={
                  language === "tr"
                    ? "Örn: Arkadaş canlısı, profesyonel, yardımsever"
                    : "e.g., Friendly, professional, helpful"
                }
                className="bg-[#2a2a2a] border-white/[0.08] text-white"
                rows={2}
              />
            </div>

            {/* CHARACTER INSTRUCTIONS — mandatory */}
            <div>
              <Label className="text-white mb-2 block">
                {language === "tr" ? "KARAKTER TALİMATLARI *" : "CHARACTER INSTRUCTIONS *"}
              </Label>
              <Textarea
                value={characterData.characterInstructions}
                onChange={(e) => {
                  updateField("characterInstructions", e.target.value);
                  if (characterInstructionsError && e.target.value.trim()) {
                    setCharacterInstructionsError(false);
                  }
                }}
                placeholder={
                  language === "tr"
                    ? "Bu karakterin uzmanlık alanını, konuşma tarzını ve sınırlarını girin..."
                    : "Example: This character is a professional doctor who provides informative and guiding support on general health topics. Responses are given in a scientific, clear, and reassuring manner. The character does not make definitive diagnoses, does not recommend medication dosages, and will always refer the user to a healthcare facility in emergencies. The character only discusses medical topics and does not go beyond their area of expertise."
                }
                className={cn(
                  "bg-[#2a2a2a] border-white/[0.08] text-white",
                  characterInstructionsError && "border-red-500"
                )}
                rows={4}
              />
              <p className="text-xs text-[#999999] mt-1">
                {language === "tr"
                  ? "Bu alan zorunludur. AI her mesajda bu talimatları kullanacaktır."
                  : "This field is required. AI will use these instructions in every message."}
              </p>
            </div>

            {/* SYSTEM MESSAGE — optional */}
            <div>
              <Label className="text-white mb-2 block">
                {language === "tr"
                  ? "SİSTEM MESAJI (İlk Karşılama Mesajı)"
                  : "SYSTEM MESSAGE (First Welcome Message)"}
              </Label>
              <Textarea
                value={characterData.systemMessage}
                onChange={(e) => updateField("systemMessage", e.target.value)}
                placeholder={
                  language === "tr"
                    ? "Sohbet açıldığında karakterin göndereceği ilk mesaj (isteğe bağlı)"
                    : "First message the character will send when chat opens (optional)"
                }
                className="bg-[#2a2a2a] border-white/[0.08] text-white"
                rows={3}
              />
              <p className="text-xs text-[#999999] mt-1">
                {language === "tr"
                  ? "Boş bırakılırsa, karakter otomatik olarak bir karşılama mesajı oluşturacaktır."
                  : "If left empty, the character will automatically generate a welcome message."}
              </p>
            </div>

            {/* SPEECH SETTINGS — optional */}
            <div className="p-4 bg-[#2a2a2a] rounded-lg border border-white/[0.08] space-y-4">
              <Label className="text-white text-lg font-semibold">
                {language === "tr"
                  ? "KONUŞMA AYARLARI (İsteğe Bağlı)"
                  : "SPEECH SETTINGS (Optional)"}
              </Label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Speech Length — value is always the internal key */}
                <div>
                  <Label className="text-white mb-2 block text-sm">
                    {language === "tr" ? "Konuşma Uzunluğu" : "Speech Length"}
                  </Label>
                  <Select
                    value={characterData.speechLength}
                    onValueChange={(val) =>
                      updateField("speechLength", safeSpeechLength(val))
                    }
                  >
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

                {/* Tone — value is always the internal key */}
                <div>
                  <Label className="text-white mb-2 block text-sm">
                    {language === "tr" ? "Ton" : "Tone"}
                  </Label>
                  <Select
                    value={characterData.speechTone}
                    onValueChange={(val) =>
                      updateField("speechTone", safeSpeechTone(val))
                    }
                  >
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

                {/* Emoji Usage — value is always "on" | "off" */}
                <div>
                  <Label className="text-white mb-2 block text-sm">
                    {language === "tr" ? "Emoji Kullanımı" : "Emoji Usage"}
                  </Label>
                  <Select
                    value={characterData.emojiUsage ? "on" : "off"}
                    onValueChange={(val) => updateField("emojiUsage", val === "on")}
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

            <Button
              onClick={handleAutoFillFields}
              variant="outline"
              disabled={isHelperAIDisabled}
              className="w-full border-white/[0.08] text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {language === "tr" ? "AI ile Otomatik Doldur" : "AutoFill with AI"}
            </Button>
          </div>

          <Button
            onClick={goToNextStep}
            className="w-full bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
          >
            {language === "tr" ? "Sonraki Adım" : "Next Step"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* ── STEP 2: Image Generation / Upload ── */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {language === "tr" ? "Görsel Oluştur veya Yükle" : "Generate or Upload Image"}
            </h2>
            <p className="text-[#999999]">
              {language === "tr"
                ? `AI ile görsel oluşturun (${generationCount}/2 kullanıldı) veya kendi görselinizi yükleyin`
                : `Generate image with AI (${generationCount}/2 used) or upload your own image`}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <Button
                onClick={handleGenerateImage}
                disabled={isGenerating || generationCount >= 2}
                className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === "tr" ? "Oluşturuluyor..." : "Generating..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === "tr"
                      ? `Görsel Oluştur (${generationCount}/2)`
                      : `Generate Image (${generationCount}/2)`}
                  </>
                )}
              </Button>

              {generationCount >= 2 && (
                <Button
                  onClick={handleGenerateImage}
                  disabled={isGenerating}
                  variant="outline"
                  className="flex-1 border-white/[0.08]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {language === "tr" ? "Yeniden Oluştur" : "Recreate"}
                </Button>
              )}
            </div>

            <label>
              <Button
                asChild
                variant="outline"
                className="w-full border-white/[0.08] text-white hover:bg-[#2a2a2a]"
                disabled={isUploadingImage}
              >
                <span>
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === "tr" ? "Yükleniyor..." : "Uploading..."}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {language === "tr"
                        ? "Görsel Yükle (PNG, JPG, JPEG)"
                        : "Upload Image (PNG, JPG, JPEG)"}
                    </>
                  )}
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

          {/* Uploaded Image */}
          {uploadedImage && (
            <div className="space-y-2">
              <Label className="text-white">
                {language === "tr" ? "Yüklenen Görsel" : "Uploaded Image"}
              </Label>
              <div className="relative w-full max-w-md mx-auto aspect-square rounded-lg overflow-hidden border-2 border-[#6366f1]">
                <Image
                  src={uploadedImage}
                  alt="Uploaded"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 448px"
                  unoptimized
                />
                <Button
                  onClick={handleDeleteUploadedImage}
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Generated Images Grid */}
          {generatedImages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-white">
                {language === "tr" ? "Oluşturulan Görseller" : "Generated Images"}
              </Label>
              <div className="grid grid-cols-2 gap-4">
                {generatedImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all hover:scale-105",
                      selectedImage === img
                        ? "border-[#6366f1] ring-2 ring-[#6366f1]/50"
                        : "border-transparent"
                    )}
                  >
                    <Image
                      src={img}
                      alt={`Generated ${idx + 1}`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 50vw, 224px"
                      unoptimized
                    />
                    {selectedImage === img && (
                      <div className="absolute inset-0 bg-[#6366f1]/20 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[#6366f1] flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedImage && generationCount === 0 && !uploadedImage && (
            <div className="text-center py-12 border-2 border-dashed border-white/[0.08] rounded-lg">
              <ImageIcon className="w-12 h-12 text-[#666666] mx-auto mb-4" />
              <p className="text-[#999999]">
                {language === "tr"
                  ? "AI ile görsel oluşturun veya kendi görselinizi yükleyin"
                  : "Generate an image with AI or upload your own image"}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={goToPreviousStep}
              variant="outline"
              className="flex-1 border-white/[0.08]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === "tr" ? "Geri" : "Back"}
            </Button>
            <Button
              onClick={goToNextStep}
              className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
            >
              {language === "tr" ? "Sonraki Adım" : "Next Step"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Training Files ── */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {language === "tr" ? "Eğitim Dosyaları" : "Training Files"}
            </h2>
            <p className="text-[#999999]">
              {language === "tr"
                ? "Karakterinizi eğitmek için PDF, Word veya TXT dosyaları yükleyin (İsteğe bağlı)"
                : "Upload PDF, Word, or TXT files to train your character (Optional)"}
            </p>
          </div>

          <div>
            <Button
              onClick={handleFileUploadClick}
              className="w-full bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === "tr" ? "Yükleniyor..." : "Uploading..."}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {language === "tr"
                    ? "Dosya Yükle (PDF, Word, TXT)"
                    : "Upload Files (PDF, Word, TXT)"}
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {uploadedFiles.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-white">
                {language === "tr" ? "Yüklenen Dosyalar" : "Uploaded Files"} (
                {uploadedFiles.length})
              </Label>
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#2a2a2a] rounded-lg flex items-center justify-between border border-white/[0.08]"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-[#6366f1] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{file.name}</p>
                      <p className="text-[#999999] text-xs">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeFile(idx)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-white/[0.08] rounded-lg">
              <FileText className="w-12 h-12 text-[#666666] mx-auto mb-4" />
              <p className="text-[#999999]">
                {language === "tr"
                  ? "Henüz dosya yüklenmedi. Bu adım isteğe bağlıdır."
                  : "No files uploaded yet. This step is optional."}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={goToPreviousStep}
              variant="outline"
              className="flex-1 border-white/[0.08]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === "tr" ? "Geri" : "Back"}
            </Button>
            <Button
              onClick={handleCreateCharacter}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === "tr" ? "Oluşturuluyor..." : "Creating..."}
                </>
              ) : (
                <>
                  {language === "tr" ? "Karakteri Oluştur" : "Create Character"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Share & Publish ── */}
      {currentStep === 4 && (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full flex items-center justify-center">
            <Check className="w-10 h-10 text-white" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {language === "tr" ? "Karakter Hazır!" : "Character Ready!"}
            </h2>
            <p className="text-[#999999]">
              {language === "tr"
                ? "Karakteriniz başarıyla oluşturuldu. Şimdi yayınlayabilir veya daha sonra düzenleyebilirsiniz."
                : "Your character has been created successfully. You can now publish it or edit it later."}
            </p>
          </div>

          {selectedImage && (
            <div className="max-w-xs mx-auto">
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-[#6366f1]">
                <Image
                  src={selectedImage}
                  alt={characterData.name}
                  fill
                  className="object-contain"
                  sizes="320px"
                  unoptimized
                />
              </div>
              <h3 className="text-xl font-bold text-white mt-4">{characterData.name}</h3>
              {characterData.profession && (
                <p className="text-[#999999]">{characterData.profession}</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handlePublishCharacter}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === "tr" ? "Yayınlanıyor..." : "Publishing..."}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {language === "tr" ? "Yayınla ve Paylaş" : "Publish & Share"}
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                resetForm().catch(console.error);
              }}
              variant="outline"
              className="w-full border-white/[0.08]"
            >
              {language === "tr" ? "Yeni Karakter Oluştur" : "Create New Character"}
            </Button>
          </div>

          <div className="p-4 bg-[#2a2a2a] rounded-lg border border-white/[0.08] text-left">
            <h4 className="text-white font-semibold mb-2">
              {language === "tr" ? "Yayınlandıktan Sonra:" : "After Publishing:"}
            </h4>
            <ul className="text-sm text-[#999999] space-y-1">
              <li>
                ✓{" "}
                {language === "tr"
                  ? "Ana sayfada 'Tümü' sekmesinde görünür"
                  : "Appears in 'All' tab on homepage"}
              </li>
              <li>
                ✓{" "}
                {language === "tr"
                  ? "İlgili kategorilerde otomatik paylaşılır"
                  : "Automatically shared in relevant categories"}
              </li>
              <li>
                ✓{" "}
                {language === "tr"
                  ? "'Karakterlerim' bölümünde görünür"
                  : "Appears in 'My Characters' section"}
              </li>
              <li>
                ✓{" "}
                {language === "tr"
                  ? "İstediğiniz zaman düzenleyebilirsiniz"
                  : "Can be edited anytime"}
              </li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
