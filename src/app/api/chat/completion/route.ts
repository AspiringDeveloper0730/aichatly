import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";

interface ChatCompletionRequest {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  characterId: string;
  userId?: string;
}

// Groq API client
async function callGroqAPI(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.FREE_USER_KEY;
  if (!apiKey) {
    throw new Error("FREE_USER_KEY is not configured");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

// OpenAI API client
async function callOpenAIAPI(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.PREMIUM_USER_KEY;
  if (!apiKey) {
    throw new Error("PREMIUM_USER_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatCompletionRequest = await request.json();
    const { messages, characterId, userId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    if (!characterId) {
      return NextResponse.json(
        { error: "Character ID is required" },
        { status: 400 }
      );
    }

    // Get character data to build system prompt
    const { data: character, error: charError } = await supabaseAdmin
      .from("characters")
      .select("character_instructions, speech_length, speech_tone, emoji_usage")
      .eq("id", characterId)
      .maybeSingle();

    if (charError || !character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    // Build system prompt with character instructions and behavior settings
    let systemPrompt = character.character_instructions || "";

    // Add speech length instruction
    const lengthInstruction =
      character.speech_length === "short"
        ? "Keep responses brief and concise (1-2 sentences)."
        : character.speech_length === "medium"
        ? "Provide balanced responses (2-4 sentences)."
        : "Give detailed, comprehensive responses (4+ sentences).";

    // Add tone instruction
    const toneInstruction =
      character.speech_tone === "formal"
        ? "Use professional, formal language."
        : character.speech_tone === "informal"
        ? "Use casual, friendly language."
        : character.speech_tone === "funny"
        ? "Be humorous and entertaining."
        : "Be direct and blunt.";

    // Rules to follow
    const rulesInstruction = `
    - Always stay in character. Never break role.\n
    - Never mention or hint that you are an AI.\n
    - Speak naturally, consistently and in-character.\n
    - Maintain the same tone, style and personality throughout.\n
    - Do not contradict previous messages or change your identity.\n
    - Remember conversation context and stay consistent.
    `;

    // Add emoji instruction
    const emojiInstruction = character.emoji_usage
      ? "Use emojis to express emotions."
      : "Do not use emojis.";

    systemPrompt += `\n\nBEHAVIOR SETTINGS:\n- ${lengthInstruction}\n- ${toneInstruction}\n- ${emojiInstruction}\n- ${rulesInstruction}`;
    console.log(systemPrompt);
    // Prepare messages with system prompt
    const messagesWithSystem = [
      { role: "system" as const, content: systemPrompt },
      ...messages,
    ];

    // Check if user is premium
    let isPremium = false;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_premium")
        .eq("id", userId)
        .maybeSingle();

      isPremium = profile?.is_premium ?? false;
    }

    // Call appropriate API based on membership
    let aiResponse: string;
    if (isPremium) {
      // Premium: Use GPT-4o mini (OpenAI)
      aiResponse = await callOpenAIAPI(messagesWithSystem);
    } else {
      // Free: Use Groq Llama 3.1-8B Instant
      aiResponse = await callGroqAPI(messagesWithSystem);
    }

    return NextResponse.json({ content: aiResponse });
  } catch (error: any) {
    console.error("[Chat Completion API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
