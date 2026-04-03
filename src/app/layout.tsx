
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import GlobalClientEffects from "@/components/GlobalClientEffects";

import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: "AiChatly – AI Character Platform",
  description: "Create your own character, chat with AI and have enjoyable experiences.",
  keywords: ["AI", "chat", "character", "AI platform", "virtual characters"],
  authors: [{ name: "AiChatly" }],
  metadataBase: new URL("https://aichatly.vercel.app"),
  openGraph: {
    type: "website",
    url: "https://aichatly.vercel.app",
    title: "AiChatly – AI Character Platform",
    description: "Create your own character, chat with AI and have enjoyable experiences.",
    siteName: "AiChatly",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "AiChatly Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AiChatly – AI Character Platform",
    description: "Create your own character, chat with AI and have enjoyable experiences.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Schema data is now hardcoded in the JSX below to prevent hydration errors

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4F46E5" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3259084940575407"
          crossOrigin="anonymous"
        />
        {/* Schema scripts removed to prevent hydration errors */}
        {/* <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: `{
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "AiChatly",
              "url": "https://aichatly.app",
              "logo": "https://cdn.chat2db-ai.com/app/avatar/custom/9f81c7d6-d54d-4728-9854-ca5acaeeefd7_749150.png",
              "description": "Create your own character, chat with AI and have enjoyable experiences.",
              "sameAs": []
            }`
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: `{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {"@type":"Question","name":"What is AIChatly and what does it do?","acceptedAnswer":{"@type":"Answer","text":"AIChatly is an AI character social chat platform where users can create AI characters, chat with artificial intelligence, and interact with virtual characters in different professions."}},
                {"@type":"Question","name":"How does AI character creation work?","acceptedAnswer":{"@type":"Answer","text":"You enter the character name, profession, attributes, and description from the panel. You can develop AI characters by uploading PDFs or text. The system automatically creates a realistic AI persona for you."}},
                {"@type":"Question","name":"Is AIChatly free?","acceptedAnswer":{"@type":"Answer","text":"Yes, there is a free plan, but messages and features are limited. Paid packages are available for more messages, characters, and premium features."}},
                {"@type":"Question","name":"Can I create my own AI character?","acceptedAnswer":{"@type":"Answer","text":"Yes. With AIChatly, anyone can create, develop, and share their own AI character."}},
                {"@type":"Question","name":"How does AI character memory work?","acceptedAnswer":{"@type":"Answer","text":"AI character memory works through added information, prompts, uploaded content, and chat history. The more detailed you develop your character, the more accurate and personalized responses the system will produce. Premium plans include advanced memory features."}},
                {"@type":"Question","name":"Is it safe to talk to AI?","acceptedAnswer":{"@type":"Answer","text":"Yes. Conversations are encrypted and user data is kept confidential. Our privacy policy is GDPR compliant."}},
                {"@type":"Question","name":"Are my conversations being recorded?","acceptedAnswer":{"@type":"Answer","text":"Your chat history is only stored in your account and you can delete it at any time. Conversations are not shared with third parties."}},
                {"@type":"Question","name":"Can I share my AI character?","acceptedAnswer":{"@type":"Answer","text":"Yes. You can create a sharing link for your character and allow others to chat with it."}},
                {"@type":"Question","name":"Is role-playing possible on AIChatly?","acceptedAnswer":{"@type":"Answer","text":"Yes. The platform is suitable for role-playing chat, consulting-style conversations, and entertainment."}},
                {"@type":"Question","name":"Does AIChatly work on mobile?","acceptedAnswer":{"@type":"Answer","text":"Yes. The site is fully mobile-friendly, and a mobile app will be released soon."}},
                {"@type":"Question","name":"How do message limits work?","acceptedAnswer":{"@type":"Answer","text":"Each package has a certain number of messages. When the limit is reached, you can wait for it to reset or upgrade to a higher package."}},
                {"@type":"Question","name":"Is there unlimited AI chat?","acceptedAnswer":{"@type":"Answer","text":"Some premium plans offer high limits or near-unlimited usage. Details are on the package page."}},
                {"@type":"Question","name":"Why does AI chat sometimes respond slowly?","acceptedAnswer":{"@type":"Answer","text":"Delays may occur due to server congestion or long response requests. Premium plans prioritize fast responses."}},
                {"@type":"Question","name":"Does AI Chatly have character visual generation?","acceptedAnswer":{"@type":"Answer","text":"An AI character visual is automatically generated during character creation. Character-based visual generation is not currently available in chat, but will be added soon."}},
                {"@type":"Question","name":"Can I improve my character by uploading PDFs or files?","acceptedAnswer":{"@type":"Answer","text":"Yes. You can improve and specialize your character in specific areas by uploading files."}},
                {"@type":"Question","name":"Is AIChatly suitable for children?","acceptedAnswer":{"@type":"Answer","text":"The platform is designed for 18+ users and offers a safe, filtered chat environment."}},
                {"@type":"Question","name":"Is NSFW or adult content allowed?","acceptedAnswer":{"@type":"Answer","text":"No. The platform is family-friendly and inappropriate content is blocked."}},
                {"@type":"Question","name":"What are the package prices?","acceptedAnswer":{"@type":"Answer","text":"In addition to the free plan, there are weekly, monthly and annual packages available. Current prices are listed on the package page."}},
                {"@type":"Question","name":"Is payment secure and is there a refund policy?","acceptedAnswer":{"@type":"Answer","text":"Payments are made through a secure infrastructure. A refund policy applies under certain conditions."}},
                {"@type":"Question","name":"How do I contact the AIChatly support team?","acceptedAnswer":{"@type":"Answer","text":"You can reach them via the support page or email. Priority support is provided for premium users."}}
              ]
            }`
          }}
        /> */}
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <LanguageProvider>
              <Toaster />
              {children}
              <GlobalClientEffects />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
