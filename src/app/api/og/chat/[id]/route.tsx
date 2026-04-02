import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import React from "react";

/* eslint-disable @next/next/no-img-element */

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: characterId } = await params;
  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");

  // Fetch character from Supabase
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_DATABASE_URL ||
    "";
  const serviceRoleKey =
    process.env.SUPABASE_ROLE_KEY ||
    process.env.DATABASE_SERVICE_ROLE_KEY ||
    "";

  let character: any = null;
  let messages: any[] = [];

  if (supabaseUrl && serviceRoleKey) {
    try {
      // Fetch character
      const charRes = await fetch(
        `${supabaseUrl}/rest/v1/characters?id=eq.${characterId}&select=name,occupation_en,occupation_tr,description_en,description_tr,image_url`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );
      const charData = await charRes.json();
      character = Array.isArray(charData) && charData.length > 0 ? charData[0] : null;

      // Fetch messages if conversationId provided
      if (conversationId) {
        const msgRes = await fetch(
          `${supabaseUrl}/rest/v1/messages?conversation_id=eq.${conversationId}&select=content,sender_type,created_at&order=created_at.asc&limit=5`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          }
        );
        const msgData = await msgRes.json();
        messages = Array.isArray(msgData) ? msgData : [];
      }
    } catch (e) {
      console.error("[OG Chat] fetch error:", e);
    }
  }

  if (!character) {
    return new Response("Character not found", { status: 404 });
  }

  const name = character.name || "AI Character";
  const occupation =
    character.occupation_en || character.occupation_tr || "";
  const description =
    character.description_en || character.description_tr ||
    "Chat with AI characters on AiChatly";

  // Resolve image URL
  let imageUrl = "";
  if (character.image_url) {
    const raw = character.image_url;
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      imageUrl = raw;
    } else if (raw.startsWith("//")) {
      imageUrl = `https:${raw}`;
    }
  }

  // Prepare chat preview text
  const chatPreview = messages.length > 0
    ? messages.slice(0, 3).map((msg, index) => {
        const sender = msg.sender_type === "user" ? "You" : name;
        const content = msg.content.length > 50 ? msg.content.substring(0, 50) + "..." : msg.content;
        return `${sender}: ${content}`;
      }).join("\n")
    : "Start a conversation with this AI character";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent 70%)",
            display: "flex",
          }}
        />

        {/* Character image section */}
        <div
          style={{
            width: "500px",
            height: "630px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px",
            flexShrink: 0,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              width={440}
              height={440}
              style={{
                borderRadius: "24px",
                objectFit: "cover",
                border: "3px solid rgba(139, 92, 246, 0.5)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            />
          ) : (
            <div
              style={{
                width: "440px",
                height: "440px",
                borderRadius: "24px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "120px",
                color: "white",
              }}
            >
              {name.charAt(0)}
            </div>
          )}
        </div>

        {/* Text section */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 50px 40px 20px",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.1,
              display: "flex",
            }}
          >
            Chat with {name}
          </div>
          {occupation && (
            <div
              style={{
                fontSize: "28px",
                color: "#a78bfa",
                fontWeight: 600,
                display: "flex",
              }}
            >
              {occupation}
            </div>
          )}

          {/* Chat Preview */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              margin: "16px 0",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                color: "white",
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
                display: "flex",
              }}
            >
              {chatPreview}
            </div>
          </div>

          {/* AiChatly branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                color: "white",
                fontWeight: 800,
              }}
            >
              Ai
            </div>
            <div
              style={{
                fontSize: "24px",
                color: "#e2e8f0",
                fontWeight: 700,
                display: "flex",
              }}
            >
              AiChatly
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}