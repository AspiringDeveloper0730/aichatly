
import { ImageResponse } from "next/og";
import { headers } from "next/headers";

export const runtime = "edge";
export const alt = "Character Chat";
export const size = {
  width: 1200,
  height: 1200,
};
export const contentType = "image/png";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Convert binary -> base64 without using Node's Buffer (edge runtime friendly).
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let chunkBinary = "";
    for (let j = 0; j < chunk.length; j++) {
      chunkBinary += String.fromCharCode(chunk[j]);
    }
    binary += chunkBinary;
  }
  return btoa(binary);
}

async function fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "image/png";
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Keep payload size reasonable for OG rendering.
    // If the image is too large, skip embedding and let caller decide fallback.
    if (bytes.byteLength > 2_500_000) return null; // ~2.5MB

    const base64 = uint8ArrayToBase64(bytes);
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

function FallbackImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f0f0f",
        color: "white",
        fontSize: 48,
        fontWeight: "bold",
      }}
    >
      AiChatly
    </div>
  );
}

export default async function Image({ params }: { params: { id: string } }) {
  const characterId = params.id;

  // Guard: if env vars are missing (e.g., at build time), return fallback immediately
  // Use the same env vars as our `supabaseAdmin` helper (public Supabase credentials),
  // so this edge OG endpoint can still fetch character data even if service role
  // env vars are not available in the edge runtime.
  const dbUrl =
    process.env.NEXT_PUBLIC_DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Use request host as the canonical public base URL so storage paths like `/storage/...`
  // resolve correctly on Vercel domains.
  const incomingHeaders = await headers();
  const forwardedProto = incomingHeaders.get("x-forwarded-proto");
  const proto =
    forwardedProto?.split(",")[0]?.trim().toLowerCase() === "http" ? "http" : "https";
  const host = incomingHeaders.get("host");
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (host ? `${proto}://${host}` : undefined) ||
    "https://aichatly.com";

  if (!dbUrl || !dbKey) {
    return new ImageResponse(<FallbackImage />, { ...size });
  }

  try {
    // Dynamically import to avoid edge runtime issues at build time
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(dbUrl, dbKey);

    const { data: character } = await client
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .maybeSingle();

    if (!character) {
      return new ImageResponse(<FallbackImage />, { ...size });
    }

    const occupation = character.occupation_en || character.occupation_tr || "";
    const description = character.description_en || character.description_tr || "";
    
    // Truncate description to fit in the image (approximately 150 characters for 3 lines)
    const truncatedDescription = description.length > 150 
      ? description.substring(0, 147) + "..." 
      : description;

    let imageUrl: string | undefined;
    if (character.image_url) {
      const raw = character.image_url;
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        imageUrl = raw;
      } else if (raw.startsWith("//")) {
        imageUrl = `https:${raw}`;
      } else {
        // Handle `/storage/...`, `storage/...`, etc.
        imageUrl = new URL(raw, baseUrl).toString();
      }
    }

    // Pre-fetch and embed the character image so the OG renderer doesn't
    // fail due to external fetch restrictions / failures.
    let embeddedImageUrl: string | undefined;
    if (imageUrl) {
      embeddedImageUrl = await fetchImageAsDataUrl(imageUrl) || undefined;
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            backgroundColor: "#0f0f0f",
          }}
        >
          {embeddedImageUrl ? (
            <img
              src={embeddedImageUrl}
              alt={character.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : null}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              padding: "40px",
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: "bold",
                color: "white",
                textShadow: "0 4px 12px rgba(0,0,0,0.9)",
                marginBottom: "12px",
                lineHeight: 1.2,
              }}
            >
              {character.name}
            </div>

            {occupation && (
              <div
                style={{
                  fontSize: 32,
                  color: "#e5e5e5",
                  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
                  marginBottom: "16px",
                  lineHeight: 1.3,
                }}
              >
                {occupation}
              </div>
            )}

            {truncatedDescription && (
              <div
                style={{
                  fontSize: 24,
                  color: "#cccccc",
                  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
                  marginBottom: "40px",
                  lineHeight: 1.4,
                  maxWidth: "90%",
                }}
              >
                {truncatedDescription}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 24px",
                backgroundColor: "rgba(0,0,0,0.7)",
                borderRadius: 12,
                // `fit-content` is not supported by the OG renderer; keep the container sized by its content.
                // (Leaving width undefined avoids OG layout crashes.)
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: "bold",
                  color: "white",
                  letterSpacing: "0.5px",
                }}
              >
                AiChatly
              </div>
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new ImageResponse(<FallbackImage />, { ...size });
  }
}
