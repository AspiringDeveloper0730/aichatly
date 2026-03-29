
import { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const characterId = id;
  const incomingHeaders = await headers();
  const forwardedProto = incomingHeaders.get("x-forwarded-proto");
  const proto =
    forwardedProto?.split(",")[0]?.trim().toLowerCase() === "http" ? "http" : "https";
  const forwardedHost = incomingHeaders.get("x-forwarded-host");
  const host =
    forwardedHost?.split(",")[0]?.trim() || incomingHeaders.get("host") || "";
  const baseUrl =
    host
      ? `${proto}://${host}`
      : process.env.NEXT_PUBLIC_SITE_URL || "https://aichatly.com";
  const characterUrl = `${baseUrl}/chat/${characterId}`;
  const ogImageUrl = `${baseUrl}/icon-192.png`;

  try {
    // Fetch character server-side for metadata. Use service role key when available
    // to bypass RLS (WhatsApp/Facebook scrapers need this to work reliably).
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_DATABASE_URL ||
      "";
    const serviceRoleKey =
      process.env.SUPABASE_ROLE_KEY || process.env.DATABASE_SERVICE_ROLE_KEY || "";

    let character: any = null;
    if (supabaseUrl && serviceRoleKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data } = await adminClient
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .maybeSingle();
      character = data ?? null;
    } else {
      // Fallback to existing helper (may be subject to RLS)
      const { supabaseAdmin } = await import("@/integrations/supabase/server");
      const { data } = await supabaseAdmin
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .maybeSingle();
      character = data ?? null;
    }

    if (!character) {
      return {
        title: "Character Not Found",
        description: "The character you're looking for doesn't exist.",
        openGraph: {
          url: characterUrl,
          siteName: "AiChatly",
          images: [
            {
              url: ogImageUrl,
              width: 1200,
              height: 1200,
              alt: "AiChatly",
            },
          ],
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          images: [ogImageUrl],
        },
        alternates: {
          canonical: characterUrl,
        },
      };
    }

    const occupation = character.occupation_en || character.occupation_tr || "";
    const description =
      character.description_en ||
      character.description_tr ||
      `Chat with ${character.name} on AiChatly`;

    // Use a self-hosted OG image generator endpoint that embeds the character
    // image directly into a social card. This is more reliable than pointing
    // social platform scrapers at an external CDN URL which they may fail to
    // fetch or cache incorrectly.
    const socialImageUrl = `${baseUrl}/api/og/${characterId}`;

    return {
      title: `${character.name}${occupation ? ` - ${occupation}` : ""} | AiChatly`,
      description: description,
      openGraph: {
        title: `${character.name}${occupation ? ` - ${occupation}` : ""}`,
        description: description,
        url: characterUrl,
        siteName: "AiChatly",
        images: [
          {
            url: socialImageUrl,
            width: 1200,
            height: 630,
            alt: character.name,
          },
        ],
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${character.name}${occupation ? ` - ${occupation}` : ""}`,
        description: description,
        images: [socialImageUrl],
        creator: "@aichatly",
      },
      alternates: {
        canonical: characterUrl,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "AiChatly - AI Character Chat",
      description: "Chat with AI characters on AiChatly",
      openGraph: {
        url: characterUrl,
        siteName: "AiChatly",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 1200,
            alt: "AiChatly",
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        images: [ogImageUrl],
      },
      alternates: {
        canonical: characterUrl,
      },
    };
  }
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
