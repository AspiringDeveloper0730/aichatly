
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#0d0d0d] mt-20">
      <div className="container mx-auto px-4 py-12">
        {/* Mobile Layout */}
        <div className="flex flex-col md:hidden gap-8">
          {/* Logo and Copyright */}
          <div className="flex flex-col items-start">
            <div className="mb-4">
              <Image
                src="https://cdn.chat2db-ai.com/app/avatar/custom/9f81c7d6-d54d-4728-9854-ca5acaeeefd7_749150.png"
                alt="AiChatly Logo"
                width={160}
                height={50}
                className="h-12 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-white/80">
              © 2026 aichatly.app – All rights reserved
            </p>
          </div>

          {/* Links Row - Quick Links Left, Legal Links Right */}
          <div className="flex flex-row justify-between">
            {/* Quick Links - Left */}
            <div className="flex flex-col items-start">
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/"
                    className="text-white hover:text-[#6366f1] transition-smooth"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-white hover:text-[#6366f1] transition-smooth"
                  >
                    Prices
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-white hover:text-[#6366f1] transition-smooth"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="text-white hover:text-[#6366f1] transition-smooth"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/chat"
                    className="text-white hover:text-[#6366f1] transition-smooth"
                  >
                    Chat
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-white hover:text-[#6366f1] transition-smooth"
                  >
                    Blok
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Links - Right */}
            <div className="flex flex-col items-end">
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/privacy-policy"
                    className="text-white hover:text-[#6366f1] transition-smooth"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-of-use"
                    className="text-white hover:text-[#6366f1] transition-smooth"
                  >
                    Terms of Use
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid grid-cols-3 gap-12">
          {/* Left Side - Logo and Copyright */}
          <div className="flex flex-col items-start">
            <div className="mb-4">
              <Image
                src="https://cdn.chat2db-ai.com/app/avatar/custom/9f81c7d6-d54d-4728-9854-ca5acaeeefd7_749150.png"
                alt="AiChatly Logo"
                width={160}
                height={50}
                className="h-12 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-white/80">
              © 2026 aichatly.app – All rights reserved
            </p>
          </div>

          {/* Center - Quick Links */}
          <div className="flex flex-col items-center">
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-white hover:text-[#6366f1] transition-smooth"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-white hover:text-[#6366f1] transition-smooth"
                >
                  Prices
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-white hover:text-[#6366f1] transition-smooth"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-white hover:text-[#6366f1] transition-smooth"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/chat"
                  className="text-white hover:text-[#6366f1] transition-smooth"
                >
                  Chat
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-white hover:text-[#6366f1] transition-smooth"
                >
                  Blok
                </Link>
              </li>
            </ul>
          </div>

          {/* Right Side - Legal Links */}
          <div className="flex flex-col items-end">
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-white hover:text-[#6366f1] transition-smooth"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-use"
                  className="text-white hover:text-[#6366f1] transition-smooth"
                >
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
