
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const characterId = id;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aichatly.com";
  const characterUrl = `${baseUrl}/chat/${characterId}`;
  const ogImageUrl = `${baseUrl}/chat/${characterId}/opengraph-image`;

  // Guard: if DATABASE_URL is not set (e.g., at build time), return default metadata
  if (!process.env.DATABASE_URL) {
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

  try {
    // Dynamically import to avoid top-level supabase instantiation at build time
    const { supabaseAdmin } = await import("@/integrations/supabase/server");

    const { data: character } = await supabaseAdmin
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .maybeSingle();

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
            url: ogImageUrl,
            width: 1200,
            height: 1200,
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
        images: [ogImageUrl],
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
