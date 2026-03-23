
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatLeftPanel } from "@/components/chat/ChatLeftPanel";
import { ChatMiddlePanel } from "@/components/chat/ChatMiddlePanel";
import { ChatRightPanel } from "@/components/chat/ChatRightPanel";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile, useIsTabletOrMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { preloadRewardedAdSdk, showRewardedAd } from "@/lib/rewarded-ad";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Character {
  id: string;
  name: string;
  occupation_en: string | null;
  occupation_tr: string | null;
  description_en: string | null;
  description_tr: string | null;
  character_instructions?: string;
  character_type: "ai" | "real";
  gender: "male" | "female" | null;
  image_url: string;
  is_anime: boolean;
  creator_id: string;
  likes_count: number;
  favorites_count: number;
  chat_count: number;
  age?: string | null;
  country?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: "user" | "character";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  character_id: string;
  last_message_at: string;
  message_count?: number;
  character?: Character;
}

const GUEST_MESSAGES_KEY = "guest_messages";
const GUEST_CONVERSATIONS_KEY = "guest_conversations";
const CHAT_CHARACTER_CACHE_PREFIX = "chat_character_cache_";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const isTabletOrMobile = useIsTabletOrMobile();

  const characterId = params?.id as string;

  const [character, setCharacter] = useState<Character | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = sessionStorage.getItem(`${CHAT_CHARACTER_CACHE_PREFIX}${characterId}`);
      return cached ? (JSON.parse(cached) as Character) : null;
    } catch {
      return null;
    }
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [welcomeMessageSent, setWelcomeMessageSent] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [videoRemaining, setVideoRemaining] = useState(0);
  const [shareRemaining, setShareRemaining] = useState(0);
  const [claimingVideoReward, setClaimingVideoReward] = useState(false);
  const rewardedAdUnitPath = process.env.NEXT_PUBLIC_GAM_REWARDED_AD_UNIT_PATH || "";

  useEffect(() => {
    setIsGuest(!user);
    fetchCharacter();

    if (user) {
      fetchConversations();
    } else {
      loadGuestConversations();
    }
  }, [user, characterId]);

  useEffect(() => {
    const verifyShareClick = async () => {
      const url = new URL(window.location.href);
      const shareId = url.searchParams.get("share_id") || url.searchParams.get("share_ref");
      if (!shareId) return;

      const consumeKey = `share_ref_consumed_${shareId}`;
      if (sessionStorage.getItem(consumeKey)) return;

      try {
        const res = await fetch("/api/rewards/character-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify_click",
            shareId,
          }),
        });
        const data = await res.json();
        if (data?.success) {
          sessionStorage.setItem(consumeKey, "1");
        }
      } catch (error) {
        console.error("Error verifying share click:", error);
      } finally {
        // Keep URL clean after tracking.
        url.searchParams.delete("share_id");
        url.searchParams.delete("share_ref");
        url.searchParams.delete("share_platform");
        window.history.replaceState({}, "", url.toString());
      }
    };

    void verifyShareClick();
  }, []);

  useEffect(() => {
    if (!rewardedAdUnitPath) return;
    preloadRewardedAdSdk().catch(() => {
      // Fail silently; we'll show user-facing message when they click "Watch Video".
    });
  }, [rewardedAdUnitPath]);

  // Listen for live character updates from edit panel
  useEffect(() => {
    const handleCharacterUpdated = (event: Event) => {
      const e = event as CustomEvent;
      const updated = e.detail?.character;
      if (!updated || updated.id !== characterId) return;

      setCharacter((prev) => (prev ? { ...prev, ...updated } : prev));
    };

    window.addEventListener("characterUpdated", handleCharacterUpdated);
    return () => window.removeEventListener("characterUpdated", handleCharacterUpdated);
  }, [characterId]);

  // Listen for conversation deletion
  useEffect(() => {
    const handleConversationDeleted = (event: Event) => {
      const e = event as CustomEvent;
      const deletedConversationId = e.detail?.conversationId;
      
      // Only handle if it's the current conversation
      if (deletedConversationId === currentConversationId) {
        // Clear messages
        setMessages([]);
        setMessageCount(0);
        setWelcomeMessageSent(false);
        
        // Remove from conversations list
        setConversations((prev) => prev.filter((c) => c.id !== deletedConversationId));
        
        // Create a new conversation
        if (user) {
          createNewConversation();
        } else {
          createGuestConversation();
        }
      } else {
        // If it's a different conversation, just refresh the list
        if (user) {
          fetchConversations();
        } else {
          loadGuestConversations();
        }
      }
    };

    window.addEventListener("conversationDeleted", handleConversationDeleted);
    return () => window.removeEventListener("conversationDeleted", handleConversationDeleted);
  }, [currentConversationId, user, characterId]);

  useEffect(() => {
    // Reset welcome message flag when conversation changes
    setWelcomeMessageSent(false);
    
    if (currentConversationId) {
      if (user) {
        fetchMessages();
        loadMessageCount();
      } else {
        loadGuestMessages();
        loadGuestMessageCount();
      }
    }
  }, [currentConversationId, user]);

  // Send welcome message when character is loaded and messages are empty
  useEffect(() => {
    if (character && currentConversationId && messages.length === 0 && !welcomeMessageSent) {
      sendWelcomeMessage();
    }
  }, [character, currentConversationId, messages.length, welcomeMessageSent]);

  const loadRewardRemainingCounts = async () => {
    if (!user) return;

    try {
      const [videoRes, shareRes] = await Promise.all([
        fetch("/api/rewards/video-watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", userId: user.id }),
        }),
        fetch("/api/rewards/character-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", userId: user.id }),
        }),
      ]);

      const videoData = await videoRes.json();
      const shareData = await shareRes.json();

      setVideoRemaining(Math.max(0, Number(videoData?.remainingCount ?? 0)));
      setShareRemaining(Math.max(0, Number(shareData?.remainingCount ?? 0)));
    } catch (error) {
      console.error("Error loading reward remaining counts:", error);
      setVideoRemaining(0);
      setShareRemaining(0);
    }
  };

  const loadMessageCount = async () => {
    if (!currentConversationId || !user) return;

    try {
      const { data } = await supabase
        .from("conversations")
        .select("message_count")
        .eq("id", currentConversationId)
        .maybeSingle();

      const count = data?.message_count || 0;
      setMessageCount(count);

      window.dispatchEvent(
        new CustomEvent("messageCountUpdated", { detail: { characterId, count } })
      );
    } catch (error) {
      console.error("Error loading message count:", error);
    }
  };

  const loadGuestMessageCount = () => {
    if (!currentConversationId) return;

    try {
      const stored = localStorage.getItem(GUEST_CONVERSATIONS_KEY);
      const guestConvs = stored ? JSON.parse(stored) : [];
      const conv = guestConvs.find((c: any) => c.id === currentConversationId);
      const count = conv?.message_count || 0;
      setMessageCount(count);

      window.dispatchEvent(
        new CustomEvent("messageCountUpdated", { detail: { characterId, count } })
      );
    } catch (error) {
      console.error("Error loading guest message count:", error);
    }
  };

  const fetchCharacter = async () => {
    setLoading(true);

    try {
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .maybeSingle();

      if (data) {
        setCharacter(data);
        try {
          sessionStorage.setItem(`${CHAT_CHARACTER_CACHE_PREFIX}${characterId}`, JSON.stringify(data));
        } catch {
          // Ignore storage write failures
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Error fetching character:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const loadGuestConversations = () => {
    try {
      const stored = localStorage.getItem(GUEST_CONVERSATIONS_KEY);
      const guestConvs = stored ? JSON.parse(stored) : [];

      setConversations(guestConvs);

      const existingConv = guestConvs.find((c: any) => c.character_id === characterId);
      if (existingConv) {
        setCurrentConversationId(existingConv.id);
      } else {
        createGuestConversation();
      }
    } catch (error) {
      console.error("Error loading guest conversations:", error);
      createGuestConversation();
    }
  };

  const createGuestConversation = () => {
    const newConvId = `guest_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newConv = {
      id: newConvId,
      character_id: characterId,
      last_message_at: new Date().toISOString(),
      message_count: 0,
    };

    try {
      const stored = localStorage.getItem(GUEST_CONVERSATIONS_KEY);
      const guestConvs = stored ? JSON.parse(stored) : [];
      guestConvs.push(newConv);
      localStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(guestConvs));

      setCurrentConversationId(newConvId);
      loadGuestConversations();
    } catch (error) {
      console.error("Error creating guest conversation:", error);
      setCurrentConversationId(newConvId);
    }
  };

  const loadGuestMessages = async () => {
    try {
      const stored = localStorage.getItem(GUEST_MESSAGES_KEY);
      const allMessages = stored ? JSON.parse(stored) : [];
      const convMessages = allMessages.filter(
        (m: Message) => m.conversation_id === currentConversationId
      );
      setMessages(convMessages);
      // If no messages exist, send welcome message
      if (convMessages.length === 0 && character) {
        await sendWelcomeMessage();
      } else {
        setWelcomeMessageSent(true);
      }
    } catch (error) {
      console.error("Error loading guest messages:", error);
      setMessages([]);
      // If no messages and character is loaded, send welcome message
      if (character) {
        await sendWelcomeMessage();
      }
    }
  };

  const saveGuestMessage = (message: Message) => {
    try {
      const stored = localStorage.getItem(GUEST_MESSAGES_KEY);
      const allMessages = stored ? JSON.parse(stored) : [];
      allMessages.push(message);
      localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(allMessages));
    } catch (error) {
      console.error("Error saving guest message:", error);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false });

      if (data) {
        const conversationsWithCharacters = await Promise.all(
          data.map(async (conv) => {
            const { data: charData } = await supabase
              .from("characters")
              .select("*")
              .eq("id", conv.character_id)
              .maybeSingle();

            return { ...conv, character: charData || undefined };
          })
        );

        setConversations(conversationsWithCharacters as Conversation[]);

        const existingConv = data.find((c) => c.character_id === characterId);
        if (existingConv) {
          setCurrentConversationId(existingConv.id);
        } else {
          createNewConversation();
        }
      } else {
        createNewConversation();
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const createNewConversation = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, character_id: characterId, message_count: 0 })
        .select()
        .maybeSingle();

      if (data && !error) {
        setCurrentConversationId(data.id);
        fetchConversations();
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const generateWelcomeMessage = (): string => {
    if (!character) return "";

    const name = character.name || "";
    const personality = language === "tr" 
      ? (character.description_tr || character.description_en || "")
      : (character.description_en || character.description_tr || "");
    const description = character.character_instructions || "";
    const background = ""; // Background field doesn't exist in schema
    const profession = language === "tr"
      ? (character.occupation_tr || character.occupation_en || "")
      : (character.occupation_en || character.occupation_tr || "");

    return `You are ${name}.\nPersonality: ${personality}\nDescription: ${description}\nBackground: ${background}\nProfession: ${profession}`;
  };

  const sendWelcomeMessage = async () => {
    if (!currentConversationId || !character || welcomeMessageSent) return;

    const welcomeContent = generateWelcomeMessage();
    if (!welcomeContent) return;

    try {
      if (user) {
        // For authenticated users
        const welcomeMessage = {
          conversation_id: currentConversationId,
          sender_type: "character" as const,
          content: welcomeContent,
        };

        const { data: newMessage } = await supabase
          .from("messages")
          .insert(welcomeMessage)
          .select()
          .maybeSingle();

        if (newMessage) {
          setMessages((prev) => [...prev, newMessage]);
          setWelcomeMessageSent(true);

          // Update conversation message count
          const { data: conversation } = await supabase
            .from("conversations")
            .select("message_count")
            .eq("id", currentConversationId)
            .maybeSingle();

          const newCount = (conversation?.message_count || 0) + 1;

          await supabase
            .from("conversations")
            .update({ message_count: newCount, last_message_at: new Date().toISOString() })
            .eq("id", currentConversationId);

          setMessageCount(newCount);
        }
      } else {
        // For guest users
        const welcomeMessage: Message = {
          id: `guest_msg_${Date.now()}_welcome`,
          conversation_id: currentConversationId,
          sender_type: "character",
          content: welcomeContent,
          created_at: new Date().toISOString(),
        };

        saveGuestMessage(welcomeMessage);
        setMessages((prev) => [...prev, welcomeMessage]);
        setWelcomeMessageSent(true);

        // Update guest conversation message count
        try {
          const stored = localStorage.getItem(GUEST_CONVERSATIONS_KEY);
          const guestConvs = stored ? JSON.parse(stored) : [];

          const updatedConvs = guestConvs.map((conv: any) => {
            if (conv.id === currentConversationId) {
              const newCount = (conv.message_count || 0) + 1;
              return { ...conv, message_count: newCount, last_message_at: new Date().toISOString() };
            }
            return conv;
          });

          localStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(updatedConvs));
          const updatedConv = updatedConvs.find((c: any) => c.id === currentConversationId);
          const newCount = updatedConv?.message_count || 0;
          setMessageCount(newCount);
        } catch (error) {
          console.error("Error updating guest message count:", error);
        }
      }
    } catch (error) {
      console.error("Error sending welcome message:", error);
    }
  };

  const fetchMessages = async () => {
    if (!currentConversationId) return;

    try {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", currentConversationId)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data);
        // If no messages exist, send welcome message
        if (data.length === 0 && character) {
          await sendWelcomeMessage();
        } else {
          setWelcomeMessageSent(true);
        }
      } else {
        // No messages found, send welcome message
        if (character) {
          await sendWelcomeMessage();
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentConversationId) return;

    if (user) {
      // Build messages array from existing history without saving the new user message yet.
      const recentMessages = messages.slice(-10);
      const messagesForAPI = recentMessages.map((msg) => ({
        role: msg.sender_type === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      }));
      messagesForAPI.push({ role: "user" as const, content });

      // First, call AI API (this will also decrement quota server-side).
      try {
        const response = await fetch("/api/chat/completion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: messagesForAPI,
            characterId,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          let message = "Failed to get AI response";
          try {
            const errorBody = await response.json();
            if (errorBody?.error) {
              message = errorBody.error;
            }
          } catch {
            // ignore
          }
          const isQuotaExceeded = message.toLowerCase().includes("daily free message limit reached");
          if (isQuotaExceeded) {
            // Quota exceeded: do NOT save the user message, open the popup, and return.
            await loadRewardRemainingCounts();
            setShowLimitPopup(true);
            return;
          }
          throw new Error(message);
        }

        const data = await response.json();
        const aiContent = data.content || "I'm sorry, I couldn't generate a response.";

        // Now persist both the user message and the AI reply since quota was available.
        const userMessage = {
          conversation_id: currentConversationId,
          sender_type: "user" as const,
          content,
        };
        const { data: savedUserMessage } = await supabase
          .from("messages")
          .insert(userMessage)
          .select()
          .maybeSingle();

        if (savedUserMessage) {
          setMessages((prev) => [...prev, savedUserMessage]);
        }

        const aiResponse = {
          conversation_id: currentConversationId,
          sender_type: "character" as const,
          content: aiContent,
        };

        const { data: aiMessage } = await supabase
          .from("messages")
          .insert(aiResponse)
          .select()
          .maybeSingle();

        if (aiMessage) {
          setMessages((prev) => [...prev, aiMessage]);
        }

        // Update conversation message count (+2 for user + ai)
        const { data: conversation } = await supabase
          .from("conversations")
          .select("message_count")
          .eq("id", currentConversationId)
          .maybeSingle();
        const newCount = (conversation?.message_count || 0) + 2;
        await supabase
          .from("conversations")
          .update({ message_count: newCount, last_message_at: new Date().toISOString() })
          .eq("id", currentConversationId);
        setMessageCount(newCount);
        window.dispatchEvent(
          new CustomEvent("messageCountUpdated", { detail: { characterId, count: newCount } })
        );
      } catch (error) {
        console.error("Error generating AI response:", error);
        const errMessage = error instanceof Error ? error.message : "Failed to get AI response";
        const isQuotaExceeded = errMessage.toLowerCase().includes("daily free message limit reached");
        if (isQuotaExceeded) {
          await loadRewardRemainingCounts();
          setShowLimitPopup(true);
          return;
        }
        toast.error("Failed to get AI response. Please try again.");
      }
    } else {
      const userMessage: Message = {
        id: `guest_msg_${Date.now()}_user`,
        conversation_id: currentConversationId,
        sender_type: "user",
        content,
        created_at: new Date().toISOString(),
      };

      saveGuestMessage(userMessage);
      setMessages((prev) => [...prev, userMessage]);

      try {
        const stored = localStorage.getItem(GUEST_CONVERSATIONS_KEY);
        const guestConvs = stored ? JSON.parse(stored) : [];

        const updatedConvs = guestConvs.map((conv: any) => {
          if (conv.id === currentConversationId) {
            const newCount = (conv.message_count || 0) + 1;
            return { ...conv, message_count: newCount, last_message_at: new Date().toISOString() };
          }
          return conv;
        });

        localStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(updatedConvs));

        const updatedConv = updatedConvs.find((c: any) => c.id === currentConversationId);
        const newCount = updatedConv?.message_count || 0;
        setMessageCount(newCount);

        window.dispatchEvent(
          new CustomEvent("messageCountUpdated", { detail: { characterId, count: newCount } })
        );
      } catch (error) {
        console.error("Error incrementing guest message count:", error);
      }

      // For guest users, use free model (no userId means free tier)
      try {
        const recentMessages = messages.slice(-10);
        const messagesForAPI = recentMessages.map((msg) => ({
          role: msg.sender_type === "user" ? ("user" as const) : ("assistant" as const),
          content: msg.content,
        }));

        messagesForAPI.push({
          role: "user" as const,
          content,
        });

        const response = await fetch("/api/chat/completion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: messagesForAPI,
            characterId,
            // No userId for guest users - will default to free model
          }),
        });

        if (!response.ok) {
          let message = "Failed to get AI response";
          try {
            const errorBody = await response.json();
            if (errorBody?.error) {
              message = errorBody.error;
            }
          } catch {
            // Ignore parse errors and use fallback message
          }
          const isQuotaExceeded = message.toLowerCase().includes("daily free message limit reached");
          if (isQuotaExceeded) {
            await loadRewardRemainingCounts();
            setShowLimitPopup(true);
            return;
          }
          throw new Error(message);
        }

        const data = await response.json();
        const aiContent = data.content || "I'm sorry, I couldn't generate a response.";

        const aiMessage: Message = {
          id: `guest_msg_${Date.now()}_ai`,
          conversation_id: currentConversationId,
          sender_type: "character",
          content: aiContent,
          created_at: new Date().toISOString(),
        };

        saveGuestMessage(aiMessage);
        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error("Error generating AI response:", error);
        const errMessage = error instanceof Error ? error.message : "Failed to get AI response";
        const isQuotaExceeded = errMessage.toLowerCase().includes("daily free message limit reached");
        if (isQuotaExceeded) {
          await loadRewardRemainingCounts();
          setShowLimitPopup(true);
          return;
        }
        // Fallback to placeholder
        const aiMessage: Message = {
          id: `guest_msg_${Date.now()}_ai`,
          conversation_id: currentConversationId,
          sender_type: "character",
          content: generateAIResponse(content),
          created_at: new Date().toISOString(),
        };

        saveGuestMessage(aiMessage);
        setMessages((prev) => [...prev, aiMessage]);
      }
    }
  };

  const generateAIResponse = (userMessage: string): string => {
    const responses = [
      "That's an interesting perspective! Tell me more about that.",
      "I understand what you're saying. How does that make you feel?",
      "Thank you for sharing that with me. What would you like to explore next?",
      "I appreciate your openness. Let's dive deeper into this topic.",
      "That's a great question! Let me think about that for a moment...",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleConversationSelect = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation?.character_id) {
      router.replace(`/chat/${conversation.character_id}`, { scroll: false });
    }
  };

  // Only block render until the character is loaded.
  // After that, keep showing the chat even if `loading` toggles due to background fetches.
  if (!character) {
    return (
      <div className="h-screen w-full bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  const handleWatchVideoReward = async () => {
    if (!user) return;
    if (!rewardedAdUnitPath) {
      toast.error("Rewarded ad is not configured yet.");
      return;
    }

    setClaimingVideoReward(true);
    try {
      const adResult = await showRewardedAd(rewardedAdUnitPath);
      if (!adResult.success) {
        if (adResult.status === "closed_without_reward") {
          toast.error("Please watch the full video to earn reward.");
        } else if (adResult.status === "not_available") {
          toast.error("No ad is available right now. Please try again shortly.");
        } else if (adResult.status === "timeout") {
          toast.error("Ad loading timed out. Please try again.");
        } else {
          toast.error("Rewarded ads are not supported on this device/browser.");
        }
        return;
      }

      const response = await fetch("/api/rewards/video-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", userId: user.id }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        toast.error(data?.error || "Failed to claim video reward");
        return;
      }

      toast.success("Video reward claimed: +15 messages");
      setShowLimitPopup(false);
    } catch (error) {
      console.error("Error claiming video reward:", error);
      toast.error("Failed to claim video reward");
    } finally {
      setClaimingVideoReward(false);
      await loadRewardRemainingCounts();
    }
  };

  const handleShareFromPopup = () => {
    setShowLimitPopup(false);
    setShowRightPanel(true);
  };

  const handleUpgradeFromPopup = () => {
    setShowLimitPopup(false);
    router.push("/pricing");
  };

  return (
    <>
    <div className="h-screen w-full bg-[#0f0f0f] flex overflow-hidden">
      {/* LEFT PANEL */}
      {!isTabletOrMobile && (
        <div className="w-[20%] min-w-[280px] max-w-[320px] border-r border-white/[0.08] bg-[#111111]">
          <ChatLeftPanel
            conversations={conversations}
            currentConversationId={currentConversationId}
            onConversationSelect={handleConversationSelect}
            isGuest={isGuest}
          />
        </div>
      )}

      {isTabletOrMobile && showLeftPanel && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowLeftPanel(false)}>
          <div
            className="absolute left-0 top-0 h-full w-[80%] max-w-[320px] bg-[#111111] border-r border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatLeftPanel
              conversations={conversations}
              currentConversationId={currentConversationId}
              onConversationSelect={(id) => {
                handleConversationSelect(id);
                setShowLeftPanel(false);
              }}
              isGuest={isGuest}
            />
          </div>
        </div>
      )}

      {/* MIDDLE PANEL */}
      <div className="flex-1 flex flex-col bg-[#121212]">
        <ChatMiddlePanel
          character={character}
          messages={messages}
          onSendMessage={sendMessage}
          onToggleLeftPanel={() => setShowLeftPanel(!showLeftPanel)}
          onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
          showMobileControls={isTabletOrMobile}
          isGuest={isGuest}
          conversationId={currentConversationId}
        />
      </div>

      {/* RIGHT PANEL */}
      {!isTabletOrMobile && (
        <div className="w-[22%] min-w-[300px] max-w-[360px] border-l border-white/[0.08] bg-[#111111]">
          <ChatRightPanel character={character} messageCount={messageCount} />
        </div>
      )}

      {isTabletOrMobile && showRightPanel && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowRightPanel(false)}>
          <div
            className="absolute right-0 top-0 h-full w-[85%] max-w-[360px] bg-[#111111] border-l border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatRightPanel
              character={character}
              messageCount={messageCount}
              onClose={() => setShowRightPanel(false)}
            />
          </div>
        </div>
      )}
    </div>
    <Dialog open={showLimitPopup} onOpenChange={setShowLimitPopup}>
      <DialogContent className="bg-[#1a1a1a] border-white/[0.08] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Message Limit Reached</DialogTitle>
          <DialogDescription className="text-[#cccccc] whitespace-pre-line">
            {`Here are your options:
• Watch a 30-second video -> Earn +15 messages! (${videoRemaining} videos remaining today)
• Share characters on social media -> Earn +5 messages! (${shareRemaining} shares remaining today)
• Or upgrade to Premium for unlimited messages and advanced memory!`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 mt-4">
          <Button
            onClick={handleWatchVideoReward}
            disabled={claimingVideoReward || videoRemaining <= 0}
            className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white"
          >
            {claimingVideoReward ? "Loading..." : "Watch Video"}
          </Button>
          <Button
            onClick={handleShareFromPopup}
            disabled={shareRemaining <= 0}
            variant="outline"
            className="flex-1 border-white/[0.08] text-white hover:bg-white/[0.05]"
          >
            Share
          </Button>
          <Button
            onClick={handleUpgradeFromPopup}
            variant="outline"
            className="flex-1 border-white/[0.08] text-white hover:bg-white/[0.05]"
          >
            Upgrade to Premium
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
