
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const characterId = id;

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://aichatly.com").replace(/\/$/, "");
  const characterUrl = `${baseUrl}/chat/${characterId}`;
  // Important: social apps use `og:image`/`twitter:image` for previews, so point them to our OG generator.
  const ogImageUrl = `${baseUrl}/chat/${characterId}/opengraph-image`;

  // If env is misconfigured, we still want previews to include an OG image (even if it may fallback to AiChatly artwork).
  if (
    !process.env.DATABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_DATABASE_URL
  ) {
    return {
      title: "AiChatly - AI Character Chat",
      description: "Chat with AI characters on AiChatly",
      openGraph: {
        title: "AiChatly",
        description: "Chat with AI characters on AiChatly",
        url: characterUrl,
        siteName: "AiChatly",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 1200,
            alt: "Character Chat",
          },
        ],
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "AiChatly",
        description: "Chat with AI characters on AiChatly",
        images: [ogImageUrl],
        creator: "@aichatly",
      },
      alternates: {
        canonical: characterUrl,
      },
    };
  }

  try {
    // Dynamically import to avoid top-level supabase instantiation at build time
    const { createClient } = await import("@supabase/supabase-js");

    const dbUrl =
      process.env.DATABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_DATABASE_URL;
    const dbKey =
      process.env.DATABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!dbUrl || !dbKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const client = createClient(dbUrl, dbKey);
    const { data: character } = await client
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .maybeSingle();

    if (!character) {
      return {
        title: "Character Not Found",
        description: "The character you're looking for doesn't exist.",
        openGraph: {
          title: "Character Not Found",
          description: "The character you're looking for doesn't exist.",
          url: characterUrl,
          siteName: "AiChatly",
          images: [
            {
              url: ogImageUrl,
              width: 1200,
              height: 1200,
              alt: "Character Chat",
            },
          ],
          locale: "en_US",
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title: "Character Not Found",
          description: "The character you're looking for doesn't exist.",
          images: [ogImageUrl],
          creator: "@aichatly",
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
        title: "AiChatly",
        description: "Chat with AI characters on AiChatly",
        url: characterUrl,
        siteName: "AiChatly",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 1200,
            alt: "Character Chat",
          },
        ],
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "AiChatly",
        description: "Chat with AI characters on AiChatly",
        images: [ogImageUrl],
        creator: "@aichatly",
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
