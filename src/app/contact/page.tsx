
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";

export const metadata = {
  title: "Contact – AiChatly",
  description: "Send us your feedback, suggestions, or bug reports.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col w-full">
      <Navbar />

      <main className="flex-1 flex items-center justify-center pt-24 pb-16 px-4">
        <div className="w-full max-w-lg">
          {/* Card */}
          <div className="bg-[#111122] border border-[#2a2a4a] rounded-2xl shadow-2xl p-8 sm:p-10">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 text-center">
              Send Us Feedback
            </h1>

            {/* Description */}
            <p className="text-[#999999] text-sm sm:text-base text-center mb-8 leading-relaxed">
              Please share any errors you encounter or your suggestions with us
              via the form below.
            </p>

            {/* Form */}
            <ContactForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
