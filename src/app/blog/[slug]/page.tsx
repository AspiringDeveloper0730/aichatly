
"use client";

import React, { use } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { getBlogPostBySlug, getRelatedPosts } from "@/data/blog-posts";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const post = getBlogPostBySlug(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(post.slug, 3);

  return (
    <>
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col w-full max-w-[100vw] overflow-x-hidden">
        <Navbar />

        <main className="pt-20 pb-12 flex-1 bg-[#121212] w-full">
          <article className="w-full max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Back Button */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[#6366f1] hover:text-[#a855f7] transition-colors duration-200 mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Blog</span>
            </Link>

            {/* Hero Image */}
            <div className="relative w-full h-[400px] rounded-2xl overflow-hidden mb-8">
              <Image
                src={post.imageUrl}
                alt={post.imageAlt}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute top-6 left-6">
                <span className="px-4 py-2 bg-[#6366f1] text-white text-sm font-semibold rounded-full">
                  {post.category}
                </span>
              </div>
            </div>

            {/* Post Header */}
            <header className="mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                {post.title}
              </h1>

              <div className="flex items-center gap-6 text-[#999999]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{post.readTime}</span>
                </div>
              </div>
            </header>

            {/* Post Content */}
            <div
              className="prose prose-invert prose-lg max-w-none mb-12"
              dangerouslySetInnerHTML={{ __html: post.content }}
              style={{
                color: '#e5e5e5',
              }}
            />

            {/* Related Links */}
            {post.relatedLinks && post.relatedLinks.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/[0.08] mb-12">
                <h3 className="text-xl font-bold text-white mb-4">Related Resources</h3>
                <ul className="space-y-3">
                  {post.relatedLinks.map((link, index) => (
                    <li key={index}>
                      <Link
                        href={link.url}
                        className="text-[#6366f1] hover:text-[#a855f7] transition-colors duration-200 flex items-center gap-2"
                      >
                        <span>→</span>
                        <span>{link.text}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA Section */}
            <div className="bg-gradient-to-br from-[#6366f1] to-[#a855f7] rounded-2xl p-8 text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-white/90 text-lg mb-6">
                Create your AI character and start chatting today!
              </p>
              <Link href="/pricing">
                <button className="px-8 py-4 bg-white text-[#6366f1] font-bold rounded-lg hover:bg-white/90 transition-all duration-300 text-lg">
                  View Pricing Plans
                </button>
              </Link>
            </div>

            {/* Most Read Posts */}
            {relatedPosts.length > 0 && (
              <div>
                <h2 className="text-3xl font-bold text-white mb-8">Most Read Posts</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedPosts.map((relatedPost) => (
                    <Link
                      key={relatedPost.id}
                      href={`/blog/${relatedPost.slug}`}
                      className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/[0.08] hover:border-[#6366f1]/50 transition-all duration-300 group"
                    >
                      <div className="relative w-full h-40 overflow-hidden">
                        <Image
                          src={relatedPost.imageUrl}
                          alt={relatedPost.imageAlt}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#6366f1] transition-colors duration-200 line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-[#999999] line-clamp-2">
                          {relatedPost.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        </main>

        <Footer />
      </div>

      <style jsx global>{`
        .prose h2 {
          color: #ffffff;
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .prose p {
          color: #e5e5e5;
          font-size: 1.125rem;
          line-height: 1.75;
          margin-bottom: 1.5rem;
        }

        .prose a {
          color: #6366f1;
          text-decoration: none;
          transition: color 0.2s;
        }

        .prose a:hover {
          color: #a855f7;
        }

        .prose .cta-box {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border-radius: 1rem;
          padding: 2rem;
          margin-top: 2rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .prose .cta-box p {
          color: #ffffff;
          margin-bottom: 0.5rem;
        }

        .prose .cta-box a {
          color: #ffffff;
          font-weight: 700;
          text-decoration: underline;
        }

        .prose .cta-box a:hover {
          color: #f0f0f0;
        }
      `}</style>
    </>
  );
}
