
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Loader2 } from "lucide-react";

interface FormState {
  fullName: string;
  email: string;
  message: string;
}

const INITIAL_FORM: FormState = {
  fullName: "",
  email: "",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email.trim()) {
      setError("Email address is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!form.message.trim()) {
      setError("Message is required. Please write your feedback.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim() || null,
          email: form.email.trim(),
          message: form.message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message.");
      }

      setIsSuccess(true);
      setForm(INITIAL_FORM);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
        <CheckCircle className="w-16 h-16 text-[#6366f1]" />
        <p className="text-xl font-semibold text-white">
          Your message has been successfully sent, thank you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Name Surname — optional */}
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-[#cccccc] text-sm font-medium">
          Name Surname{" "}
          <span className="text-[#666666] font-normal">(optional)</span>
        </Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          value={form.fullName}
          onChange={handleChange}
          placeholder="Your name"
          disabled={isSubmitting}
          className="bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder:text-[#555577] focus:border-[#6366f1] focus:ring-[#6366f1]/20"
        />
      </div>

      {/* Email — mandatory */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[#cccccc] text-sm font-medium">
          Email Address{" "}
          <span className="text-[#6366f1]">*</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="your@email.com"
          disabled={isSubmitting}
          required
          className="bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder:text-[#555577] focus:border-[#6366f1] focus:ring-[#6366f1]/20"
        />
      </div>

      {/* Message — mandatory */}
      <div className="space-y-2">
        <Label htmlFor="message" className="text-[#cccccc] text-sm font-medium">
          Message / Description{" "}
          <span className="text-[#6366f1]">*</span>
        </Label>
        <Textarea
          id="message"
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="Share your feedback, suggestions, or bug reports here..."
          disabled={isSubmitting}
          rows={6}
          required
          className="bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder:text-[#555577] focus:border-[#6366f1] focus:ring-[#6366f1]/20 resize-none"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 text-base font-bold bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#4f46e5] hover:to-[#9333ea] text-white border-none transition-all duration-300"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending...
          </span>
        ) : (
          "Send"
        )}
      </Button>
    </form>
  );
}
