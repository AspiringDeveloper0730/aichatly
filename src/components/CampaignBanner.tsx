
"use client";

import React, { memo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

type BannerItem = {
  image: string;
  title: string;
  subtitle: string;
};

const BANNERS: BannerItem[] = [
  {
    image: "/banner_1.jpeg",
    title: "Create Your Character",
    subtitle: "Your profession, personality, and story are in your hands",
  },
  {
    image: "/banner_2.jpeg",
    title: "Connect Instantly",
    subtitle: "Realistic conversations, infinite memory",
  },
  {
    image: "/banner_3.jpeg",
    title: "Endless Evolution",
    subtitle: "Let it grow with you, let it evolve with you",
  },
];

function StartNowButton() {
  const { user } = useAuth();
  const router = useRouter();

  const handleClick = () => {
    if (user) {
      router.push("/panel");
    } else {
      router.push("/login");
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.97 }}
      className="neon-start-btn"
    >
      Start Now
    </motion.button>
  );
}

export const CampaignBanner = memo(function CampaignBanner() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % BANNERS.length);
    }, 5500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="banner-outer">
      <div className="banner-inner">
        <div
          className="banner-track"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {BANNERS.map((banner) => (
            <div key={banner.title} className="banner-slide">
              <img
                src={banner.image}
                alt={banner.title}
                className="banner-img"
                draggable={false}
              />
              <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 md:px-14 lg:px-16 banner-text-area">
                <motion.div
                  key={banner.title}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="flex flex-col gap-2 sm:gap-3 max-w-[52%] sm:max-w-[48%] md:max-w-[44%]"
                >
                  <h1 className="banner-title">{banner.title}</h1>
                  <p className="banner-subtitle">{banner.subtitle}</p>
                  <div className="mt-2 sm:mt-3">
                    <StartNowButton />
                  </div>
                </motion.div>
              </div>
            </div>
          ))}
        </div>

        <div className="banner-dots" aria-label="Banner navigation dots">
          {BANNERS.map((banner, index) => (
            <button
              key={banner.title}
              type="button"
              aria-label={`Go to banner ${index + 1}`}
              aria-current={activeIndex === index}
              className={`banner-dot ${activeIndex === index ? "is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
