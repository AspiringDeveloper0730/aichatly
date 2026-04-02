
"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, ChevronUp } from "lucide-react";
import Head from "next/head";

interface FAQItem {
  id: number;
  questionKey: string;
  answerKey: string;
}

const faqItems: FAQItem[] = [
  {
    id: 1,
    questionKey: "faq.q1.question",
    answerKey: "faq.q1.answer",
  },
  {
    id: 2,
    questionKey: "faq.q2.question",
    answerKey: "faq.q2.answer",
  },
  {
    id: 3,
    questionKey: "faq.q3.question",
    answerKey: "faq.q3.answer",
  },
  {
    id: 4,
    questionKey: "faq.q4.question",
    answerKey: "faq.q4.answer",
  },
  {
    id: 5,
    questionKey: "faq.q5.question",
    answerKey: "faq.q5.answer",
  },
  {
    id: 6,
    questionKey: "faq.q6.question",
    answerKey: "faq.q6.answer",
  },
  {
    id: 7,
    questionKey: "faq.q7.question",
    answerKey: "faq.q7.answer",
  },
  {
    id: 8,
    questionKey: "faq.q8.question",
    answerKey: "faq.q8.answer",
  },
  {
    id: 9,
    questionKey: "faq.q9.question",
    answerKey: "faq.q9.answer",
  },
  {
    id: 10,
    questionKey: "faq.q10.question",
    answerKey: "faq.q10.answer",
  },
  {
    id: 11,
    questionKey: "faq.q11.question",
    answerKey: "faq.q11.answer",
  },
  {
    id: 12,
    questionKey: "faq.q12.question",
    answerKey: "faq.q12.answer",
  },
  {
    id: 13,
    questionKey: "faq.q13.question",
    answerKey: "faq.q13.answer",
  },
  {
    id: 14,
    questionKey: "faq.q14.question",
    answerKey: "faq.q14.answer",
  },
  {
    id: 15,
    questionKey: "faq.q15.question",
    answerKey: "faq.q15.answer",
  },
  {
    id: 16,
    questionKey: "faq.q16.question",
    answerKey: "faq.q16.answer",
  },
  {
    id: 17,
    questionKey: "faq.q17.question",
    answerKey: "faq.q17.answer",
  },
  {
    id: 18,
    questionKey: "faq.q18.question",
    answerKey: "faq.q18.answer",
  },
  {
    id: 19,
    questionKey: "faq.q19.question",
    answerKey: "faq.q19.answer",
  },
  {
    id: 20,
    questionKey: "faq.q20.question",
    answerKey: "faq.q20.answer",
  },
];

export default function FAQPage() {
  const { t } = useLanguage();
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (id: number) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const faqSchemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is AIChatly and what does it do?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AIChatly is an AI character social chat platform where users can create AI characters, chat with artificial intelligence, and interact with virtual characters in different professions."
        }
      },
      {
        "@type": "Question",
        "name": "How does AI character creation work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You enter the character name, profession, attributes, and description from the panel. You can develop AI characters by uploading PDFs or text. The system automatically creates a realistic AI persona for you."
        }
      },
      {
        "@type": "Question",
        "name": "Is AIChatly free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, there is a free plan, but messages and features are limited. Paid packages are available for more messages, characters, and premium features."
        }
      },
      {
        "@type": "Question",
        "name": "Can I create my own AI character?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. With AIChatly, anyone can create, develop, and share their own AI character."
        }
      },
      {
        "@type": "Question",
        "name": "How does AI character memory work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AI character memory works through added information, prompts, uploaded content, and chat history. The more detailed you develop your character, the more accurate and personalized responses the system will produce. Premium plans include advanced memory features."
        }
      },
      {
        "@type": "Question",
        "name": "Is it safe to talk to AI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Conversations are encrypted and user data is kept confidential. Our privacy policy is GDPR compliant."
        }
      },
      {
        "@type": "Question",
        "name": "Are my conversations being recorded?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Your chat history is only stored in your account and you can delete it at any time. Conversations are not shared with third parties."
        }
      },
      {
        "@type": "Question",
        "name": "Can I share my AI character?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. You can create a sharing link for your character and allow others to chat with it."
        }
      },
      {
        "@type": "Question",
        "name": "Is role-playing possible on AIChatly?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. The platform is suitable for role-playing chat, consulting-style conversations, and entertainment."
        }
      },
      {
        "@type": "Question",
        "name": "Does AIChatly work on mobile?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. The site is fully mobile-friendly, and a mobile app will be released soon."
        }
      },
      {
        "@type": "Question",
        "name": "How do message limits work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Each package has a certain number of messages. When the limit is reached, you can wait for it to reset or upgrade to a higher package."
        }
      },
      {
        "@type": "Question",
        "name": "Is there unlimited AI chat?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Some premium plans offer high limits or near-unlimited usage. Details are on the package page."
        }
      },
      {
        "@type": "Question",
        "name": "Why does AI chat sometimes respond slowly?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Delays may occur due to server congestion or long response requests. Premium plans prioritize fast responses."
        }
      },
      {
        "@type": "Question",
        "name": "Does AI Chatly have character visual generation?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An AI character visual is automatically generated during character creation. Character-based visual generation is not currently available in chat, but will be added soon."
        }
      },
      {
        "@type": "Question",
        "name": "Can I improve my character by uploading PDFs or files?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. You can improve and specialize your character in specific areas by uploading files."
        }
      },
      {
        "@type": "Question",
        "name": "Is AIChatly suitable for children?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The platform is designed for 18+ users and offers a safe, filtered chat environment."
        }
      },
      {
        "@type": "Question",
        "name": "Is NSFW or adult content allowed?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. The platform is family-friendly and inappropriate content is blocked."
        }
      },
      {
        "@type": "Question",
        "name": "What are the package prices?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "In addition to the free plan, there are weekly, monthly, and yearly packages. Current prices are listed on the package page."
        }
      },
      {
        "@type": "Question",
        "name": "Is payment secure and is there a refund policy?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Payments are made through a secure infrastructure. A refund policy applies under certain conditions."
        }
      },
      {
        "@type": "Question",
        "name": "How do I contact the AIChatly support team?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can contact them via the support page or email. Priority support is provided for premium users."
        }
      }
    ]
  };

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchemaData) }}
        />
      </Head>
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col w-full max-w-[100vw] overflow-x-hidden">
        <Navbar />

        <main className="pt-20 pb-12 flex-1 bg-[#121212] w-full">
          <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                {t("faq.title")}
              </h1>
              <p className="text-lg text-[#999999] max-w-3xl mx-auto">
                {t("faq.description")}
              </p>
            </div>

            <div className="space-y-4">
              {faqItems.map((item) => {
                const isOpen = openItems.has(item.id);
                
                return (
                  <div
                    key={item.id}
                    className="rounded-lg overflow-hidden border border-white/[0.08] transition-all duration-300"
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="w-full px-6 py-5 flex items-center justify-between bg-[#1a1a1a] hover:bg-[#222222] transition-colors duration-200"
                    >
                      <span className="text-left text-lg font-bold text-white pr-4">
                        {t(item.questionKey)}
                      </span>
                      <div className="flex-shrink-0">
                        {isOpen ? (
                          <ChevronUp className="w-6 h-6 text-white" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-white" />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div
                        className="px-6 py-5 bg-gradient-to-br from-[#6366f1] to-[#a855f7] rounded-b-lg"
                        style={{ borderRadius: "0 0 6px 6px" }}
                      >
                        <p className="text-white leading-relaxed">
                          {t(item.answerKey)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        <Footer />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchemaData) }}
        />
      </div>
    </>
  );
}
