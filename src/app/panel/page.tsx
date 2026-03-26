
"use client";

import React, { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UserPanelContent } from "@/components/panel/UserPanelContent";
import Image from "next/image";

export default function UserPanelPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <Navbar />

      <main className="pt-24 pb-12 flex-1 bg-[#121212]">
        <Suspense
          fallback={
            <div className="container mx-auto px-4 flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                <Image
                  src="/Logo.png"
                  alt="Logo"
                  width={180}
                  height={60}
                  className="h-12 w-auto object-contain"
                  priority
                />
                <div className="text-white text-lg">Loading...</div>
              </div>
            </div>
          }
        >
          <UserPanelContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
