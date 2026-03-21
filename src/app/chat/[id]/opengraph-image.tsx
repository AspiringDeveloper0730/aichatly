
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Character Chat";
export const size = {
  width: 1200,
  height: 1200,
};
export const contentType = "image/png";

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
  const dbUrl = process.env.DATABASE_URL;
  const dbKey = process.env.DATABASE_SERVICE_ROLE_KEY;

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

    let imageUrl = character.image_url;
    if (imageUrl && !imageUrl.startsWith("http")) {
      imageUrl = `https:${imageUrl}`;
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
          <img
            src={imageUrl}
            alt={character.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

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
                width: "fit-content",
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
