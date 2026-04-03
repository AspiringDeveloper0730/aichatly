import React from "react";
import { supabaseAdmin } from "@/integrations/supabase/server";

interface ChatHeadProps {
  params: { id: string };
  searchParams?: { conversationId?: string };
}

export default async function Head({ params, searchParams }: ChatHeadProps) {
  const characterId = params.id;
  const conversationId = searchParams?.conversationId;

  const brandName = "AiChatly";
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || "https://serkan-tau.vercel.app";
  const chatUrl = `${siteBase}/chat/${characterId}${conversationId ? `?conversationId=${conversationId}` : ""}`;

  const { data: characterData } = await supabaseAdmin
    .from("characters")
    .select("name,occupation_en,occupation_tr,description_en,description_tr,image_url")
    .eq("id", characterId)
    .maybeSingle();

  const name = characterData?.name || "AI character";
  const occupation = characterData?.occupation_en || characterData?.occupation_tr || "";
  const description =
    characterData?.description_en ||
    characterData?.description_tr ||
    `Chat with ${name} on ${brandName}`;

  // Keep OG description to a short professional persona summary
  const ogDescription = `Chat with ${name}, who ${
    occupation ? occupation : "offers engaging, expert AI-powered responses"
  }`;

  // Resolve image URL for OG metadata - use direct character image for all platforms
  let ogImageUrl = `${siteBase}/og/default-image.jpg`;
  if (characterData?.image_url) {
    const rawImage = characterData.image_url;
    if (rawImage.startsWith("http://") || rawImage.startsWith("https://")) {
      ogImageUrl = rawImage;
    } else if (rawImage.startsWith("//")) {
      ogImageUrl = `https:${rawImage}`;
    } else {
      ogImageUrl = new URL(rawImage, siteBase).toString();
    }
  }

  return (
    <>
      <title>{`${name} – ${brandName}`}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={`${name} – ${brandName}`} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:url" content={chatUrl} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${name} – ${brandName}`} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={ogImageUrl} />
    </>
  );
}
