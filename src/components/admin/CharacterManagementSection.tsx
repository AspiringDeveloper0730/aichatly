
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Sparkles, 
  Trash2, 
  AlertCircle,
  User,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Character {
  id: string;
  creator_id: string;
  name: string;
  occupation_en: string | null;
  occupation_tr: string | null;
  description_en: string | null;
  description_tr: string | null;
  character_type: string;
  gender: string | null;
  image_url: string;
  is_anime: boolean;
  is_published: boolean;
  is_featured: boolean;
  likes_count: number;
  favorites_count: number;
  chat_count: number;
  created_at: string;
}

interface CharacterOwner {
  id: string;
  email: string | null;
  full_name: string | null;
}

export function CharacterManagementSection() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [characterOwner, setCharacterOwner] = useState<CharacterOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    characterId: string | null;
  }>({ open: false, characterId: null });

  // Fetch all characters
  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCharacters(data || []);
      
      // Auto-select first character if none selected
      if (data && data.length > 0 && !selectedCharacter) {
        setSelectedCharacter(data[0]);
      }
    } catch (error) {
      console.error("Error fetching characters:", error);
      toast.error("Failed to load characters");
    } finally {
      setLoading(false);
    }
  };

  // Fetch character owner details
  const fetchCharacterOwner = async (creatorId: string) => {
    try {
      setOwnerLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", creatorId)
        .maybeSingle();

      if (error) throw error;
      setCharacterOwner(data);
    } catch (error) {
      console.error("Error fetching character owner:", error);
      toast.error("Failed to load character owner");
      setCharacterOwner(null);
    } finally {
      setOwnerLoading(false);
    }
  };

  // Delete character (soft delete)
  const handleDeleteCharacter = async (characterId: string) => {
    try {
      const { error } = await supabase
        .from("characters")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", characterId);

      if (error) throw error;

      toast.success("Character deleted successfully");
      await fetchCharacters();
      
      // Clear selection if deleted character was selected
      if (selectedCharacter?.id === characterId) {
        const remainingCharacters = characters.filter(c => c.id !== characterId);
        setSelectedCharacter(remainingCharacters[0] || null);
      }
    } catch (error) {
      console.error("Error deleting character:", error);
      toast.error("Failed to delete character");
    }
  };

  // Initial load
  useEffect(() => {
    fetchCharacters();
  }, []);

  // Load owner details when character is selected
  useEffect(() => {
    if (selectedCharacter) {
      fetchCharacterOwner(selectedCharacter.creator_id);
    }
  }, [selectedCharacter]);

  // Real-time subscription for character updates
  useEffect(() => {
    const channel = supabase
      .channel("characters-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "characters",
        },
        () => {
          fetchCharacters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel - Character List */}
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Characters ({characters.length})
            </h3>
          </div>

          <ScrollArea className="h-[600px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-[#999999]">Loading characters...</div>
            ) : characters.length === 0 ? (
              <div className="text-center py-8 text-[#999999]">No characters found</div>
            ) : (
              <div className="space-y-2">
                {characters.map((character) => (
                  <div
                    key={character.id}
                    onClick={() => setSelectedCharacter(character)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all duration-200",
                      "hover:bg-white/[0.05] border border-transparent",
                      selectedCharacter?.id === character.id && "bg-white/[0.08] border-[#6366f1]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={character.image_url}
                        alt={character.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {character.name}
                        </p>
                        <p className="text-xs text-[#999999] truncate">
                          {character.occupation_en || "No occupation"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {character.is_featured && (
                            <Badge className="text-xs bg-gradient-to-r from-[#f59e0b] to-[#ef4444]">
                              Featured
                            </Badge>
                          )}
                          {character.is_published && (
                            <Badge variant="secondary" className="text-xs">
                              Published
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </Card>

      {/* Middle Panel - Character Details */}
      <Card className="lg:col-span-6 bg-[#1a1a1a] border-white/[0.08] p-6">
        {!selectedCharacter ? (
          <div className="flex items-center justify-center h-[600px] text-[#999999]">
            Select a character to view details
          </div>
        ) : (
          <div className="space-y-6">
            {/* Character Header */}
            <div className="flex items-start gap-4 pb-6 border-b border-white/[0.08]">
              <img
                src={selectedCharacter.image_url}
                alt={selectedCharacter.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#6366f1]"
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {selectedCharacter.name}
                </h2>
                <div className="flex items-center gap-2 mt-2 text-[#999999]">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedCharacter.occupation_en || "No occupation"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {selectedCharacter.is_featured && (
                    <Badge className="bg-gradient-to-r from-[#f59e0b] to-[#ef4444]">
                      Featured
                    </Badge>
                  )}
                  {selectedCharacter.is_published && (
                    <Badge variant="secondary">Published</Badge>
                  )}
                  {selectedCharacter.is_anime && (
                    <Badge variant="outline">Anime</Badge>
                  )}
                  {selectedCharacter.gender && (
                    <Badge variant="outline">
                      {selectedCharacter.gender.charAt(0).toUpperCase() + selectedCharacter.gender.slice(1)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <ScrollArea className="h-[480px] pr-4">
              <div className="space-y-6">
                {/* Description */}
                {selectedCharacter.description_en && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                    <p className="text-[#999999] text-sm leading-relaxed">
                      {selectedCharacter.description_en}
                    </p>
                  </div>
                )}

                {/* Character Owner */}
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-[#6366f1]" />
                    Character Owner
                  </h3>
                  {ownerLoading ? (
                    <p className="text-[#999999] text-sm">Loading owner details...</p>
                  ) : !characterOwner ? (
                    <p className="text-[#999999] text-sm">Owner information not available</p>
                  ) : (
                    <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {characterOwner.full_name || "Unknown User"}
                          </p>
                          <p className="text-xs text-[#999999]">{characterOwner.email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Statistics */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-center">
                      <p className="text-xs text-[#999999] mb-1">Likes</p>
                      <p className="text-lg font-bold text-white">
                        {selectedCharacter.likes_count}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-center">
                      <p className="text-xs text-[#999999] mb-1">Favorites</p>
                      <p className="text-lg font-bold text-white">
                        {selectedCharacter.favorites_count}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-center">
                      <p className="text-xs text-[#999999] mb-1">Chats</p>
                      <p className="text-lg font-bold text-white">
                        {selectedCharacter.chat_count}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Additional Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                      <span className="text-sm text-[#999999]">Character Type</span>
                      <span className="text-sm font-medium text-white">
                        {selectedCharacter.character_type?.toUpperCase() ?? '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                      <span className="text-sm text-[#999999]">Created</span>
                      <span className="text-sm text-white">
                        {formatDate(selectedCharacter.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </Card>

      {/* Right Panel - Actions */}
      <Card className="lg:col-span-3 bg-[#1a1a1a] border-white/[0.08] p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Actions
          </h3>

          {!selectedCharacter ? (
            <p className="text-[#999999] text-sm">Select a character to perform actions</p>
          ) : (
            <div className="space-y-3">
              {/* Delete Button */}
              <Button
                onClick={() =>
                  setDeleteDialog({
                    open: true,
                    characterId: selectedCharacter.id,
                  })
                }
                variant="destructive"
                className="w-full justify-start gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Character
              </Button>

              {/* Info Box */}
              <div className="mt-6 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#f59e0b] mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-[#999999]">
                    <p className="font-medium text-white mb-1">Important</p>
                    <p>
                      Deleting a character will permanently remove it from the system. 
                      This action requires confirmation and cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Character Stats Summary */}
              <div className="mt-6 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                <h4 className="text-sm font-semibold text-white mb-3">Quick Stats</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#999999]">Total Interactions</span>
                    <span className="text-white font-medium">
                      {selectedCharacter.likes_count + 
                       selectedCharacter.favorites_count + 
                       selectedCharacter.chat_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#999999]">Status</span>
                    <span className="text-white font-medium">
                      {selectedCharacter.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, characterId: null })
        }
      >
        <AlertDialogContent className="bg-[#1a1a1a] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Character
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#999999]">
              This action cannot be undone. This will permanently delete the character 
              "{selectedCharacter?.name}" and remove all associated data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.05] text-white border-white/[0.08] hover:bg-white/[0.1]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.characterId) {
                  handleDeleteCharacter(deleteDialog.characterId);
                }
                setDeleteDialog({ open: false, characterId: null });
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
