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
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_ROLE_KEY || process.env.DATABASE_SERVICE_ROLE_KEY || "";

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
      console.error("[OG Twitter] fetch error:", e);
    }
  }

  if (!character) {
    return new Response("Character not found", { status: 404 });
  }

  const name = character.name || "AI Character";

  let imageUrl = "";
  if (character.image_url) {
    const raw = character.image_url;
    if (raw.startsWith("http://") || raw.startsWith("https://")) imageUrl = raw;
    else if (raw.startsWith("//")) imageUrl = `https:${raw}`;
  }

  // Landscape OG dimensions
  const WIDTH = 1200;
  const HEIGHT = 630;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          padding: "40px",
          boxSizing: "border-box",
        }}
      >
        {/* Card container */}
        <div
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "1100px",
            maxHeight: "530px",
            background: "#fff",
            borderRadius: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            padding: "20px",
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              style={{
                height: "90%",     // smaller than container to avoid cropping
                width: "auto",
                objectFit: "contain",
              }}
            />
          ) : (
            <div
              style={{
                width: "auto",
                height: "90%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "150px",
                color: "white",
                fontWeight: "bold",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                borderRadius: "20px",
              }}
            >
              {name.charAt(0)}
            </div>
          )}
        </div>

        {/* Name overlay */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "48px",
            fontWeight: "700",
            color: "#333",
            textAlign: "center",
          }}
        >
          {name}
        </div>

        {/* Brand watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "24px",
            color: "rgba(0,0,0,0.4)",
            fontWeight: "500",
          }}
        >
          AiChatly
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}