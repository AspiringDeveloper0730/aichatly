
"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { blogPosts } from "@/data/blog-posts";
import { Calendar, Clock } from "lucide-react";

export default function BlogPage() {
  return (
    <>
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col w-full max-w-[100vw] overflow-x-hidden">
        <Navbar />

        <main className="pt-20 pb-12 flex-1 bg-[#121212] w-full">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                AI Characters, Free AI Chat, and AI Chat Guide
              </h1>
              <p className="text-lg sm:text-xl text-[#999999] max-w-3xl mx-auto">
                Create AI characters, experience free AI chat, learn how character memory works. Have fun and learn with AiChatly!
              </p>
            </div>

            {/* Blog Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/[0.08] hover:border-[#6366f1]/50 transition-all duration-300 group"
                >
                  <Link href={`/blog/${post.slug}`}>
                    <div className="relative w-full h-48 overflow-hidden">
                      <Image
                        src={post.imageUrl}
                        alt={post.imageAlt}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-[#6366f1] text-white text-xs font-semibold rounded-full">
                          {post.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-4 text-sm text-[#999999] mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>

                      <h2 className="text-xl font-bold text-white mb-3 group-hover:text-[#6366f1] transition-colors duration-200">
                        {post.title}
                      </h2>

                      <p className="text-[#999999] mb-4 line-clamp-3">
                        {post.description}
                      </p>

                      <div className="text-[#6366f1] font-semibold group-hover:text-[#a855f7] transition-colors duration-200">
                        Read More →
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-16 text-center bg-gradient-to-br from-[#6366f1] to-[#a855f7] rounded-2xl p-8 sm:p-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Start your free package now and chat with your own AI character!
              </h2>
              <p className="text-white/90 text-lg mb-6">
                Create unlimited AI characters and experience the future of conversation
              </p>
              <Link href="/pricing">
                <button className="px-8 py-4 bg-white text-[#6366f1] font-bold rounded-lg hover:bg-white/90 transition-all duration-300 text-lg">
                  View Pricing Plans
                </button>
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
