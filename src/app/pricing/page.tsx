
import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PricingPackages } from "@/components/PricingPackages";

export const metadata = {
  title: "Pricing – AiChatly",
  description: "Choose the perfect plan for your AI character experience. Get 25% off on all packages!",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <Navbar />
      
      <main className="pt-20 flex-1">
        <PricingPackages />
      </main>

      <Footer />
    </div>
  );
}
