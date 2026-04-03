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

  if (supabaseUrl && serviceRoleKey) {
    try {
      const charRes = await fetch(
        `${supabaseUrl}/rest/v1/characters?id=eq.${characterId}&select=name,image_url`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );
      const charData = await charRes.json();
      character = Array.isArray(charData) && charData.length > 0 ? charData[0] : null;
    } catch (e) {
      console.error("[OG Facebook] fetch error:", e);
    }
  }

  if (!character) {
    return new Response("Character not found", { status: 404 });
  }

  const name = character.name || "AI Character";

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

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          position: "relative",
        }}
      >
        {/* Subtle background pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.05) 0%, transparent 50%)",
          }}
        />

        {/* Character image - centered with padding to avoid cropping */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            borderRadius: "20px",
            background: "white",
            boxShadow: "0 25px 50px rgba(0,0,0,0.1), 0 15px 35px rgba(0,0,0,0.05)",
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              width={400}
              height={400}
              style={{
                borderRadius: "16px",
                objectFit: "cover",
                border: "4px solid rgba(99, 102, 241, 0.1)",
              }}
            />
          ) : (
            <div
              style={{
                width: "400px",
                height: "400px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "120px",
                color: "white",
                fontWeight: "bold",
              }}
            >
              {name.charAt(0)}
            </div>
          )}
        </div>

        {/* Brand watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "30px",
            fontSize: "14px",
            color: "rgba(0,0,0,0.4)",
            fontWeight: "500",
          }}
        >
          AiChatly
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}