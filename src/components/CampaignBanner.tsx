
"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const BANNER_IMAGE =
  "https://cdn.chat2db-ai.com/app/avatar/custom/04969366-ff3e-490b-8ae8-9a775000e34f_749150.jpg";

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
  return (
    /*
      STRATEGY — "clip container + scaleY image + inverse-scale text"

      MOBILE (< 768px):
        • No transforms at all. Banner renders at its full natural size.
        • .banner-outer: height = auto, overflow = visible.

      TABLET & DESKTOP (≥ 768px):
        • .banner-outer clips to exactly 40% of the image's natural height
          using overflow:hidden + a fixed aspect-ratio that is 40% of the
          image's own aspect ratio.
          Image natural ratio ≈ 2.667:1  →  clipped ratio = 2.667/0.4 = 6.667:1
          We express this as padding-top trick: 100% / 6.667 ≈ 15%.
        • The <img> is stretched to fill the full clip window via
          object-fit:contain + height:100% so the ENTIRE image is always
          visible — nothing is cropped.
        • The text overlay is positioned absolutely and uses a normal font
          size — it is NOT scaled, so text and button are never compressed.

      Result:
        ✅ Full image visible — zero cropping
        ✅ Image proportions preserved (object-fit: contain)
        ✅ Text and button at natural readable size
        ✅ No black gaps, no dead space
        ✅ Mobile unchanged
    */
    <div className="banner-outer">
      <div className="banner-inner">
        {/* Full image — always fully visible, never cropped */}
        <img
          src={BANNER_IMAGE}
          alt="Create Your Character"
          className="banner-img"
          draggable={false}
        />

        {/* Text overlay — positioned over the visible clip area */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 md:px-14 lg:px-16 banner-text-area">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex flex-col gap-2 sm:gap-3 max-w-[52%] sm:max-w-[48%] md:max-w-[44%]"
          >
            <h1 className="banner-title">Create Your Character</h1>

            <p className="banner-subtitle">
              Your profession, personality, and story are in your hands
            </p>

            <div className="mt-2 sm:mt-3">
              <StartNowButton />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
});
