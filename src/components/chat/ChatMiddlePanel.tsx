
"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Mic, Menu, MoreVertical, ArrowLeft, Save, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Character {
  id: string;
  name: string;
  occupation_en: string | null;
  occupation_tr: string | null;
  image_url: string;
  creator_id: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: "user" | "character";
  content: string;
  created_at: string;
}

interface ChatMiddlePanelProps {
  character: Character;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  showMobileControls?: boolean;
  isGuest?: boolean;
  conversationId?: string | null;
}

export function ChatMiddlePanel({
  character,
  messages,
  onSendMessage,
  onToggleLeftPanel,
  onToggleRightPanel,
  showMobileControls = false,
  isGuest = false,
  conversationId,
}: ChatMiddlePanelProps) {
  const { language } = useLanguage();
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAction, setDeleteAction] = useState<"chat" | "character" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const deleteMenuRef = useRef<HTMLDivElement>(null);

  const occupation = language === "tr" ? character.occupation_tr : character.occupation_en;

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target as Node)) {
        setShowDeleteMenu(false);
      }
    };

    if (showDeleteMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDeleteMenu]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1500);

      // Dispatch SMS quota decrement event for authenticated users only
      if (!isGuest) {
        window.dispatchEvent(new CustomEvent("smsUsed"));
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveChat = () => {
    if (isGuest) {
      setShowSaveDialog(true);
    }
  };

  const handleDeleteClick = (action: "chat" | "character") => {
    setDeleteAction(action);
    setShowDeleteMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteAction) return;

    setIsDeleting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (deleteAction === "chat") {
        // Delete chat - remove all messages and conversation
        if (!conversationId) {
          toast.error(
            language === "tr"
              ? "Sohbet bulunamadı"
              : "Chat not found"
          );
          setIsDeleting(false);
          setShowDeleteConfirm(false);
          setDeleteAction(null);
          return;
        }

        if (user) {
          // Delete messages first
          const { error: messagesError } = await supabase
            .from("messages")
            .delete()
            .eq("conversation_id", conversationId);

          if (messagesError) {
            throw messagesError;
          }

          // Delete conversation
          const { error: conversationError } = await supabase
            .from("conversations")
            .delete()
            .eq("id", conversationId);

          if (conversationError) {
            throw conversationError;
          }

          toast.success(
            language === "tr"
              ? "Sohbet başarıyla silindi"
              : "Chat deleted successfully"
          );

          // Dispatch event to notify parent to refresh and create new conversation
          window.dispatchEvent(new CustomEvent("conversationDeleted", { 
            detail: { conversationId } 
          }));

          // Stay on chat page - parent will handle creating new conversation
        } else if (isGuest) {
          // Guest user - delete from localStorage
          const GUEST_MESSAGES_KEY = "guest_messages";
          const GUEST_CONVERSATIONS_KEY = "guest_conversations";

          try {
            // Remove messages
            const storedMessages = localStorage.getItem(GUEST_MESSAGES_KEY);
            if (storedMessages) {
              const allMessages = JSON.parse(storedMessages);
              const filteredMessages = allMessages.filter(
                (m: Message) => m.conversation_id !== conversationId
              );
              localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(filteredMessages));
            }

            // Remove conversation
            const storedConvs = localStorage.getItem(GUEST_CONVERSATIONS_KEY);
            if (storedConvs) {
              const allConvs = JSON.parse(storedConvs);
              const filteredConvs = allConvs.filter(
                (c: any) => c.id !== conversationId
              );
              localStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(filteredConvs));
            }

            toast.success(
              language === "tr"
                ? "Sohbet başarıyla silindi"
                : "Chat deleted successfully"
            );

            // Dispatch event to notify parent to refresh and create new conversation
            window.dispatchEvent(new CustomEvent("conversationDeleted", { 
              detail: { conversationId } 
            }));
          } catch (error) {
            console.error("Error deleting guest chat:", error);
            toast.error(
              language === "tr"
                ? "Sohbet silinirken hata oluştu"
                : "Error deleting chat"
            );
          }
        }
      } else if (deleteAction === "character") {
        // Delete character
        if (user) {
          // Check if user is the creator
          if (character.creator_id === user.id) {
            // User created this character - soft delete
            const { error } = await supabase
              .from("characters")
              .update({ deleted_at: new Date().toISOString() })
              .eq("id", character.id);

            if (error) throw error;

            toast.success(
              language === "tr"
                ? "Karakter başarıyla silindi"
                : "Character deleted successfully"
            );
          } else {
            // System character - remove from user's favorites and likes
            await supabase
              .from("favorites")
              .delete()
              .eq("user_id", user.id)
              .eq("character_id", character.id);

            await supabase
              .from("likes")
              .delete()
              .eq("user_id", user.id)
              .eq("character_id", character.id);

            toast.success(
              language === "tr"
                ? "Karakter listenizden kaldırıldı"
                : "Character removed from your list"
            );
          }

          router.push("/");
        }
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(
        language === "tr"
          ? "Silme işlemi başarısız oldu"
          : "Delete operation failed"
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteAction(null);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#111111]">
          <div className="flex items-center gap-3">
            {/* Mobile: Back/Menu Button */}
            {showMobileControls && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="text-white hover:bg-white/[0.05]"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}

            {/* Character Avatar */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={character.image_url}
                alt={character.name}
                fill
                className="object-cover"
              />
            </div>

            {/* Character Info */}
            <div>
              <h2 className="text-base font-bold text-white">{character.name}</h2>
              {occupation && (
                <p className="text-xs text-[#999999]">{occupation}</p>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Save Button (Guest Only) */}
            {isGuest && messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSaveChat}
                className="text-white hover:bg-white/[0.05]"
                title={language === "tr" ? "Sohbeti Kaydet" : "Save Chat"}
              >
                <Save className="w-5 h-5" />
              </Button>
            )}

            {showMobileControls && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleLeftPanel}
                className="text-white hover:bg-white/[0.05]"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}

            {/* Trash Icon with Dropdown Menu */}
            <div className="relative" ref={deleteMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                className="text-white hover:bg-white/[0.05]"
              >
                <Trash2 className="w-5 h-5" />
              </Button>

              {/* Delete Menu Dropdown */}
              {showDeleteMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/[0.08] rounded-lg shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => handleDeleteClick("chat")}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/[0.05] transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {language === "tr" ? "Sohbeti Sil" : "Delete Chat"}
                  </button>
                  <button
                    onClick={() => handleDeleteClick("character")}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/[0.05] transition-colors flex items-center gap-2 border-t border-white/[0.08]"
                  >
                    <Trash2 className="w-4 h-4" />
                    {language === "tr" ? "Karakteri Sil" : "Delete Character"}
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleRightPanel}
              className="text-white hover:bg-white/[0.05]"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Guest Notice Banner */}
        {isGuest && (
          <div className="px-4 py-2 bg-[oklch(0.55_0.22_264)]/10 border-b border-[oklch(0.55_0.22_264)]/20">
            <p className="text-xs text-white/80 text-center">
              {language === "tr"
                ? "💬 Misafir olarak sohbet ediyorsunuz. Konuşmalarınızı kaydetmek için "
                : "💬 You're chatting as a guest. "}
              <button
                onClick={() => router.push("/register")}
                className="text-[#6366f1] hover:text-[#4f46e5] font-semibold underline"
              >
                {language === "tr" ? "ücretsiz hesap oluşturun" : "create a free account"}
              </button>
            </p>
          </div>
        )}

        {/* Messages Area - Scrollable */}
        <ScrollArea className="flex-1 px-4 py-6" ref={scrollAreaRef}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                  <Image
                    src={character.image_url}
                    alt={character.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {language === "tr"
                    ? `${character.name} ile sohbete başlayın`
                    : `Start a conversation with ${character.name}`}
                </h3>
                <p className="text-sm text-[#999999]">
                  {language === "tr"
                    ? "Sohbete başlamak için bir mesaj gönderin"
                    : "Send a message to begin chatting"}
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.sender_type === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {/* AI Avatar (Left) */}
                  {message.sender_type === "character" && (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={character.image_url}
                        alt={character.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Message Bubble - Modern with responsive max-width */}
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl max-w-[75%] md:max-w-[65%]",
                      message.sender_type === "user"
                        ? "bg-gradient-to-r from-[#5B8CFF] to-[#7A5CFF] text-white rounded-tr-sm"
                        // Keep character messages in a black/gray tone to match the chat dark UI.
                        : "bg-[#2a2a2a] text-white rounded-tl-sm"
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>

                  {/* User Avatar (Right) - Optional */}
                  {message.sender_type === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#5B8CFF] to-[#7A5CFF] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {language === "tr" ? "Sen" : "You"}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={character.image_url}
                    alt={character.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="bg-[#2a2a2a] text-white px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#5B8CFF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[#6B7CFF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[#7A5CFF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area - Fixed */}
        <div className="p-4 border-t border-white/[0.08] bg-[#111111]">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            {/* Text Input */}
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === "tr" ? "Mesajınızı yazın..." : "Type your message..."}
              className="flex-1 bg-[#1a1a1a] border-white/[0.08] text-white placeholder:text-[#666666] focus:border-[#6366f1] h-12 text-base"
            />

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#4f46e5] hover:to-[#9333ea] text-white h-12 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Save Chat Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {language === "tr" ? "Ücretsiz Hesap Oluşturun" : "Create a Free Account"}
            </DialogTitle>
            <DialogDescription className="text-[#999999]">
              {language === "tr"
                ? "Sohbetlerinizi kaydetmek ve daha sonra devam etmek için ücretsiz bir hesap oluşturun."
                : "Create a free account to save your conversations and continue later."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => router.push("/register")}
              className="w-full gradient-blue-purple text-white font-semibold"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-[#1a1a1a] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {language === "tr" ? "Bu son kararınız mı?" : "Is this your final decision?"}
            </DialogTitle>
            <DialogDescription className="text-[#999999]">
              {deleteAction === "chat" && (
                language === "tr"
                  ? "Bu sohbet kalıcı olarak silinecektir. Bu işlem geri alınamaz."
                  : "This chat will be permanently deleted. This action cannot be undone."
              )}
              {deleteAction === "character" && (
                language === "tr"
                  ? "Bu karakter silinecektir. Bu işlem geri alınamaz."
                  : "This character will be deleted. This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteAction(null);
              }}
              variant="outline"
              className="flex-1 border-white/[0.08] text-white hover:bg-white/[0.05]"
              disabled={isDeleting}
            >
              {language === "tr" ? "İptal" : "Cancel"}
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting
                ? (language === "tr" ? "Siliniyor..." : "Deleting...")
                : (language === "tr" ? "Evet, Sil" : "Yes, Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
