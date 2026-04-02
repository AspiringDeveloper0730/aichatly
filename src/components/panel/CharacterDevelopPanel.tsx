
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { upload } from "@zoerai/integration";
import { X, Upload, Loader2, FileText, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

// Allowed file types that match the DB TRAINING_FILE_TYPE enum
const ALLOWED_FILE_EXTENSIONS = [".pdf", ".txt", ".doc", ".docx"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type TrainingFileType = "pdf" | "txt" | "doc";

function getFileType(fileName: string): TrainingFileType {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (ext === "txt") return "txt";
  // doc and docx both map to "doc" enum value
  return "doc";
}

interface TrainingFile {
  id?: string;
  name: string;
  url: string;
  size: number;
  fileType: TrainingFileType;
  isNew?: boolean;
}

interface CharacterDevelopPanelProps {
  characterId: string;
  characterName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function CharacterDevelopPanel({
  characterId,
  characterName,
  onClose,
  onSaved,
}: CharacterDevelopPanelProps) {
  const { language } = useLanguage();
  const [existingFiles, setExistingFiles] = useState<TrainingFile[]>([]);
  const [newFiles, setNewFiles] = useState<TrainingFile[]>([]);
  const [manualText, setManualText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  const fetchExistingFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .from("character_training_files")
        .select("*")
        .eq("character_id", characterId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: TrainingFile[] = (data || []).map((f) => ({
        id: f.id,
        name: f.file_name,
        url: f.storage_path,
        size: f.file_size_bytes,
        fileType: getFileType(f.file_name),
      }));

      setExistingFiles(mapped);
    } catch (err) {
      console.error("Error fetching training files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [characterId]);

  useEffect(() => {
    fetchExistingFiles();
  }, [fetchExistingFiles]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const successfulFiles: TrainingFile[] = [];
    const failedCount = { value: 0 };

    try {
      for (const file of Array.from(files)) {
        try {
          const result = await upload.uploadWithPresignedUrl(file, {
            maxSize: 10 * 1024 * 1024,
            allowedExtensions: ALLOWED_FILE_EXTENSIONS,
          });

          if (result.success && result.url) {
            successfulFiles.push({
              name: file.name,
              url: result.url,
              size: file.size,
              fileType: getFileType(file.name),
              isNew: true,
            });
          } else if (!result.success) {
            failedCount.value += 1;
            console.error(`Upload failed for ${file.name}:`, result.error);
          }
          // If success but no url — treat as silent skip, not an error
        } catch (fileErr) {
          failedCount.value += 1;
          console.error(`Upload error for ${file.name}:`, fileErr);
        }
      }

      if (successfulFiles.length > 0) {
        setNewFiles((prev) => [...prev, ...successfulFiles]);
        toast.success(
          language === "tr"
            ? `${successfulFiles.length} dosya yüklendi`
            : `${successfulFiles.length} file(s) uploaded`
        );
      }

      if (failedCount.value > 0) {
        toast.error(
          language === "tr"
            ? `${failedCount.value} dosya yüklenemedi`
            : `${failedCount.value} file(s) failed to upload`
        );
      }
    } finally {
      setIsUploading(false);
      // Reset input so same files can be re-selected
      e.target.value = "";
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from("character_training_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;

      setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success(language === "tr" ? "Dosya silindi" : "File deleted");
    } catch (err) {
      console.error("Delete file error:", err);
      toast.error(language === "tr" ? "Dosya silinemedi" : "Failed to delete file");
    }
  };

  const handleSave = async () => {
    const hasNewFiles = newFiles.length > 0;
    const hasManualText = manualText.trim().length > 0;

    if (!hasNewFiles && !hasManualText) {
      toast.error(
        language === "tr"
          ? "Lütfen en az bir dosya yükleyin veya metin girin"
          : "Please upload at least one file or enter text"
      );
      return;
    }

    setIsSaving(true);
    try {
      const inserts: Record<string, unknown>[] = [];

      for (const file of newFiles) {
        inserts.push({
          character_id: characterId,
          file_name: file.name,
          file_type: file.fileType,
          file_size_bytes: file.size,
          storage_path: file.url,
          is_processed: false,
        });
      }

      if (hasManualText) {
        inserts.push({
          character_id: characterId,
          file_name: `manual_text_${Date.now()}.txt`,
          file_type: "txt",
          file_size_bytes: new Blob([manualText]).size,
          storage_path: `manual://${Date.now()}`,
          extracted_text: manualText,
          is_processed: true,
        });
      }

      if (inserts.length > 0) {
        const { error } = await supabase
          .from("character_training_files")
          .insert(inserts);

        if (error) throw error;
      }

      // Dispatch file upload quota event (count = number of actual file inserts, not manual text)
      const fileCount = newFiles.length;
      if (fileCount > 0) {
        window.dispatchEvent(
          new CustomEvent("fileUploaded", { detail: { count: fileCount } })
        );
      }

      // Broadcast sync event
      window.dispatchEvent(
        new CustomEvent("characterDeveloped", {
          detail: { characterId },
        })
      );

      toast.success(
        language === "tr" ? "Eğitim verileri kaydedildi!" : "Training data saved!"
      );

      setNewFiles([]);
      setManualText("");
      await fetchExistingFiles();
      onSaved();
    } catch (err) {
      console.error("Save training files error:", err);
      toast.error(language === "tr" ? "Kaydetme başarısız" : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canSave = newFiles.length > 0 || manualText.trim().length > 0;

  return (
    <Card className="bg-[#1e1e1e] border-white/[0.08] p-6 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">
            {language === "tr" ? "Karakteri Geliştir" : "Develop Character"}
          </h3>
          <p className="text-sm text-[#999999] mt-1">{characterName}</p>
        </div>
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
        {/* Upload Button */}
        <div>
          <Label className="text-white mb-3 block">
            {language === "tr" ? "Eğitim Dosyası Yükle" : "Upload Training Files"}
          </Label>
          <label>
            <Button
              asChild
              className="w-full bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
              disabled={isUploading}
            >
              <span>
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
              </span>
            </Button>
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
          <p className="text-xs text-[#999999] mt-2">
            {language === "tr"
              ? "Desteklenen formatlar: PDF, TXT, Word (.doc, .docx) — Maks. 10MB"
              : "Supported formats: PDF, TXT, Word (.doc, .docx) — Max 10MB"}
          </p>
        </div>

        {/* New Files (pending save) */}
        {newFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-white">
              {language === "tr" ? "Yeni Dosyalar (Kaydedilmedi)" : "New Files (Unsaved)"}{" "}
              ({newFiles.length})
            </Label>
            {newFiles.map((file, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#2a2a2a] rounded-lg flex items-center justify-between border border-[#6366f1]/30"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-[#6366f1] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{file.name}</p>
                    <p className="text-[#999999] text-xs">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  onClick={() => removeNewFile(idx)}
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Manual Text Input */}
        <div>
          <Label className="text-white mb-2 block">
            {language === "tr" ? "Manuel Metin Girişi" : "Manual Text Input"}
          </Label>
          <Textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={
              language === "tr"
                ? "Karaktere öğretmek istediğiniz bilgileri buraya yazın..."
                : "Write information you want to teach the character here..."
            }
            className="bg-[#2a2a2a] border-white/[0.08] text-white"
            rows={5}
          />
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || !canSave}
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
                {language === "tr" ? "Eğitim Verilerini Kaydet" : "Save Training Data"}
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

        {/* Existing Files */}
        {isLoadingFiles ? (
          <div className="text-center py-4 text-[#999999] text-sm">
            {language === "tr" ? "Dosyalar yükleniyor..." : "Loading files..."}
          </div>
        ) : existingFiles.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-white">
              {language === "tr" ? "Mevcut Eğitim Dosyaları" : "Existing Training Files"}{" "}
              ({existingFiles.length})
            </Label>
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="p-3 bg-[#2a2a2a] rounded-lg flex items-center justify-between border border-white/[0.08]"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-[#999999] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{file.name}</p>
                    <p className="text-[#999999] text-xs">
                      {formatFileSize(file.size)} · {file.fileType.toUpperCase()}
                    </p>
                  </div>
                </div>
                {file.id && (
                  <Button
                    onClick={() => handleDeleteExistingFile(file.id!)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-white/[0.08] rounded-lg">
            <FileText className="w-10 h-10 text-[#666666] mx-auto mb-2" />
            <p className="text-[#999999] text-sm">
              {language === "tr"
                ? "Henüz eğitim dosyası yüklenmemiş"
                : "No training files uploaded yet"}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
