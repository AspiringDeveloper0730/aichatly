
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "tr";

interface Translations {
  [key: string]: {
    en: string;
    tr: string;
  };
}

const translations: Translations = {
  "nav.home": { en: "Home", tr: "Ana Sayfa" },
  "nav.prices": { en: "Prices", tr: "Fiyatlar" },
  "nav.contact": { en: "Contact", tr: "İletişim" },
  "nav.faq": { en: "FAQ", tr: "SSS" },
  "nav.register": { en: "Free Registration", tr: "Ücretsiz Kayıt" },
  "nav.login": { en: "Login", tr: "Giriş" },
  "nav.profile": { en: "Profile", tr: "Profil" },
  "nav.logout": { en: "Logout", tr: "Çıkış" },
  "sidebar.home": { en: "Home", tr: "Ana Sayfa" },
  "sidebar.chat": { en: "Chat", tr: "Sohbet" },
  "sidebar.createCharacter": { en: "Create Character", tr: "Karakter Oluştur" },
  "sidebar.language": { en: "Language", tr: "Dil" },
  "common.loading": { en: "Loading...", tr: "Yükleniyor..." },
  "common.success": { en: "Success", tr: "Başarılı" },
  "common.error": { en: "Error", tr: "Hata" },
  "common.noCharacters": { en: "No characters found", tr: "Karakter bulunamadı" },
  "search.placeholder": { en: "Search characters by name or profession...", tr: "Karakterleri isim veya mesleğe göre ara..." },
  "search.male": { en: "Male", tr: "Erkek" },
  "search.female": { en: "Female", tr: "Kadın" },
  "search.anime": { en: "Anime", tr: "Anime" },
  "search.all": { en: "All", tr: "Tümü" },
  "filter.all": { en: "All", tr: "Tümü" },
  "filter.male": { en: "Male", tr: "Erkek" },
  "filter.female": { en: "Female", tr: "Kadın" },
  "filter.anime": { en: "Anime", tr: "Anime" },
  "campaign.badge": { en: "🔥 Limited Time Campaign", tr: "🔥 Sınırlı Süreli Kampanya" },
  "campaign.title": { en: "40% Off – Premium Membership", tr: "%40 İndirim – Premium Üyelik" },
  "campaign.subtitle": { en: "Access premium features now, don't miss out", tr: "Premium özelliklere şimdi erişin, kaçırmayın" },
  "campaign.button": { en: "Upgrade to Premium", tr: "Premium'a Yükselt" },
  "campaign.timer": { en: "⏳", tr: "⏳" },
  "campaign.days": { en: "Days", tr: "Gün" },
  "campaign.cta": { en: "Upgrade to Premium", tr: "Premium'a Yükselt" },
  "character.chat": { en: "Chat", tr: "Sohbet" },
  "character.ai": { en: "AI", tr: "Yapay Zeka" },
  "character.real": { en: "Real", tr: "Gerçek" },
  "footer.description": { en: "Create your own character, chat with AI and have enjoyable experiences.", tr: "Kendi karakterinizi oluşturun, yapay zeka ile sohbet edin ve keyifli deneyimler yaşayın." },
  "footer.quickLinks": { en: "Quick Links", tr: "Hızlı Bağlantılar" },
  "footer.legal": { en: "Legal", tr: "Yasal" },
  "footer.privacy": { en: "Privacy Policy", tr: "Gizlilik Politikası" },
  "footer.terms": { en: "Terms of Service", tr: "Kullanım Şartları" },
  "footer.rights": { en: "All rights reserved.", tr: "Tüm hakları saklıdır." },
  "footer.support": { en: "Support", tr: "Destek" },
  "auth.signIn": { en: "Sign In", tr: "Giriş Yap" },
  "auth.signUp": { en: "Sign Up", tr: "Kayıt Ol" },
  "auth.emailOrUsername": { en: "Email or Username", tr: "E-posta veya Kullanıcı Adı" },
  "auth.password": { en: "Password", tr: "Şifre" },
  "auth.googleSignIn": { en: "Continue with Google", tr: "Google ile Devam Et" },
  "auth.hasAccount": { en: "Already have an account?", tr: "Zaten hesabınız var mı?" },
  "auth.noAccount": { en: "Don't have an account?", tr: "Hesabınız yok mu?" },
  "auth.forgotPassword": { en: "Forgot Password?", tr: "Şifrenizi mi Unuttunuz?" },
  "auth.resetPassword": { en: "Reset Password", tr: "Şifre Sıfırla" },
  "auth.resetPasswordTitle": { en: "Reset Your Password", tr: "Şifrenizi Sıfırlayın" },
  "auth.resetPasswordDescription": { en: "Enter your email address and we'll send you a link to reset your password.", tr: "E-posta adresinizi girin, size şifre sıfırlama bağlantısı göndereceğiz." },
  "auth.sendResetLink": { en: "Send Reset Link", tr: "Sıfırlama Bağlantısı Gönder" },
  "auth.resetLinkSent": { en: "Reset link sent! Please check your email.", tr: "Sıfırlama bağlantısı gönderildi! Lütfen e-postanızı kontrol edin." },
  "auth.newPassword": { en: "New Password", tr: "Yeni Şifre" },
  "auth.confirmPassword": { en: "Confirm Password", tr: "Şifreyi Onayla" },
  "auth.updatePassword": { en: "Update Password", tr: "Şifreyi Güncelle" },
  "auth.passwordUpdated": { en: "Password updated successfully!", tr: "Şifre başarıyla güncellendi!" },
  "auth.backToLogin": { en: "Back to Login", tr: "Girişe Dön" },
  "panel.title": { en: "User Panel", tr: "Kullanıcı Paneli" },
  "panel.subtitle": { en: "Manage your account, characters, and settings", tr: "Hesabınızı, karakterlerinizi ve ayarlarınızı yönetin" },
  "faq.title": { en: "Frequently Asked Questions", tr: "Sıkça Sorulan Sorular" },
  "faq.description": { en: "Here you can find answers to the most frequently asked questions about AIChatly, AI character creation, AI-powered chat, packages, security, and usage.", tr: "Burada AIChatly, yapay zeka karakter oluşturma, yapay zeka destekli sohbet, paketler, güvenlik ve kullanım hakkında en sık sorulan soruların cevaplarını bulabilirsiniz." },
  "faq.q1.question": { en: "What is AIChatly and what does it do?", tr: "AIChatly nedir ve ne işe yarar?" },
  "faq.q1.answer": { en: "AIChatly is an AI character social chat platform where users can create AI characters, chat with artificial intelligence, and interact with virtual characters in different professions.", tr: "AIChatly, kullanıcıların yapay zeka karakterleri oluşturabildiği, yapay zeka ile sohbet edebildiği ve farklı mesleklerdeki sanal karakterlerle etkileşime girebildiği bir yapay zeka karakter sosyal sohbet platformudur." },
  "faq.q2.question": { en: "How does AI character creation work?", tr: "Yapay zeka karakter oluşturma nasıl çalışır?" },
  "faq.q2.answer": { en: "You enter the character name, profession, attributes, and description from the panel. You can develop AI characters by uploading PDFs or text. The system automatically creates a realistic AI persona for you.", tr: "Panelden karakter adı, meslek, özellikler ve açıklama girersiniz. PDF veya metin yükleyerek yapay zeka karakterlerini geliştirebilirsiniz. Sistem sizin için otomatik olarak gerçekçi bir yapay zeka kişiliği oluşturur." },
  "faq.q3.question": { en: "Is AIChatly free?", tr: "AIChatly ücretsiz mi?" },
  "faq.q3.answer": { en: "Yes, there is a free plan, but messages and features are limited. Paid packages are available for more messages, characters, and premium features.", tr: "Evet, ücretsiz bir plan var ancak mesajlar ve özellikler sınırlıdır. Daha fazla mesaj, karakter ve premium özellikler için ücretli paketler mevcuttur." },
  "faq.q4.question": { en: "Can I create my own AI character?", tr: "Kendi yapay zeka karakterimi oluşturabilir miyim?" },
  "faq.q4.answer": { en: "Yes. With AIChatly, anyone can create, develop, and share their own AI character.", tr: "Evet. AIChatly ile herkes kendi yapay zeka karakterini oluşturabilir, geliştirebilir ve paylaşabilir." },
  "faq.q5.question": { en: "How does AI character memory work?", tr: "Yapay zeka karakter hafızası nasıl çalışır?" },
  "faq.q5.answer": { en: "AI character memory works through added information, prompts, uploaded content, and chat history. The more detailed you develop your character, the more accurate and personalized responses the system will produce. Premium plans include advanced memory features.", tr: "Yapay zeka karakter hafızası, eklenen bilgiler, yönlendirmeler, yüklenen içerik ve sohbet geçmişi aracılığıyla çalışır. Karakterinizi ne kadar detaylı geliştirirseniz, sistem o kadar doğru ve kişiselleştirilmiş yanıtlar üretir. Premium planlar gelişmiş hafıza özelliklerini içerir." },
  "faq.q6.question": { en: "Is it safe to talk to AI?", tr: "Yapay zeka ile konuşmak güvenli mi?" },
  "faq.q6.answer": { en: "Yes. Conversations are encrypted and user data is kept confidential. Our privacy policy is GDPR compliant.", tr: "Evet. Konuşmalar şifrelenir ve kullanıcı verileri gizli tutulur. Gizlilik politikamız GDPR uyumludur." },
  "faq.q7.question": { en: "Are my conversations being recorded?", tr: "Konuşmalarım kaydediliyor mu?" },
  "faq.q7.answer": { en: "Your chat history is only stored in your account and you can delete it at any time. Conversations are not shared with third parties.", tr: "Sohbet geçmişiniz yalnızca hesabınızda saklanır ve istediğiniz zaman silebilirsiniz. Konuşmalar üçüncü taraflarla paylaşılmaz." },
  "faq.q8.question": { en: "Can I share my AI character?", tr: "Yapay zeka karakterimi paylaşabilir miyim?" },
  "faq.q8.answer": { en: "Yes. You can create a sharing link for your character and allow others to chat with it.", tr: "Evet. Karakteriniz için bir paylaşım bağlantısı oluşturabilir ve başkalarının onunla sohbet etmesine izin verebilirsiniz." },
  "faq.q9.question": { en: "Is role-playing possible on AIChatly?", tr: "AIChatly'de rol yapma mümkün mü?" },
  "faq.q9.answer": { en: "Yes. The platform is suitable for role-playing chat, consulting-style conversations, and entertainment.", tr: "Evet. Platform rol yapma sohbeti, danışmanlık tarzı konuşmalar ve eğlence için uygundur." },
  "faq.q10.question": { en: "Does AIChatly work on mobile?", tr: "AIChatly mobilde çalışıyor mu?" },
  "faq.q10.answer": { en: "Yes. The site is fully mobile-friendly, and a mobile app will be released soon.", tr: "Evet. Site tamamen mobil uyumludur ve yakında bir mobil uygulama yayınlanacaktır." },
  "faq.q11.question": { en: "How do message limits work?", tr: "Mesaj limitleri nasıl çalışır?" },
  "faq.q11.answer": { en: "Each package has a certain number of messages. When the limit is reached, you can wait for it to reset or upgrade to a higher package.", tr: "Her paketin belirli sayıda mesajı vardır. Limite ulaşıldığında, sıfırlanmasını bekleyebilir veya daha yüksek bir pakete yükseltebilirsiniz." },
  "faq.q12.question": { en: "Is there unlimited AI chat?", tr: "Sınırsız yapay zeka sohbeti var mı?" },
  "faq.q12.answer": { en: "Some premium plans offer high limits or near-unlimited usage. Details are on the package page.", tr: "Bazı premium planlar yüksek limitler veya neredeyse sınırsız kullanım sunar. Detaylar paket sayfasındadır." },
  "faq.q13.question": { en: "Why does AI chat sometimes respond slowly?", tr: "Yapay zeka sohbeti neden bazen yavaş yanıt veriyor?" },
  "faq.q13.answer": { en: "Delays may occur due to server congestion or long response requests. Premium plans prioritize fast responses.", tr: "Sunucu yoğunluğu veya uzun yanıt istekleri nedeniyle gecikmeler oluşabilir. Premium planlar hızlı yanıtlara öncelik verir." },
  "faq.q14.question": { en: "Does AI Chatly have character visual generation?", tr: "AI Chatly karakter görsel üretimi var mı?" },
  "faq.q14.answer": { en: "An AI character visual is automatically generated during character creation. Character-based visual generation is not currently available in chat, but will be added soon.", tr: "Karakter oluşturma sırasında otomatik olarak bir yapay zeka karakter görseli oluşturulur. Karakter tabanlı görsel üretimi şu anda sohbette mevcut değildir, ancak yakında eklenecektir." },
  "faq.q15.question": { en: "Can I improve my character by uploading PDFs or files?", tr: "PDF veya dosya yükleyerek karakterimi geliştirebilir miyim?" },
  "faq.q15.answer": { en: "Yes. You can improve and specialize your character in specific areas by uploading files.", tr: "Evet. Dosya yükleyerek karakterinizi belirli alanlarda geliştirebilir ve uzmanlaştırabilirsiniz." },
  "faq.q16.question": { en: "Is AIChatly suitable for children?", tr: "AIChatly çocuklar için uygun mu?" },
  "faq.q16.answer": { en: "The platform is designed for 18+ users and offers a safe, filtered chat environment.", tr: "Platform 18+ kullanıcılar için tasarlanmıştır ve güvenli, filtrelenmiş bir sohbet ortamı sunar." },
  "faq.q17.question": { en: "Is NSFW or adult content allowed?", tr: "NSFW veya yetişkin içeriğine izin veriliyor mu?" },
  "faq.q17.answer": { en: "No. The platform is family-friendly and inappropriate content is blocked.", tr: "Hayır. Platform aile dostu olup uygunsuz içerik engellenir." },
  "faq.q18.question": { en: "What are the package prices?", tr: "Paket fiyatları nedir?" },
  "faq.q18.answer": { en: "In addition to the free plan, there are weekly, monthly, and yearly packages. Current prices are listed on the package page.", tr: "Ücretsiz plana ek olarak haftalık, aylık ve yıllık paketler bulunmaktadır. Güncel fiyatlar paket sayfasında listelenmiştir." },
  "faq.q19.question": { en: "Is payment secure and is there a refund policy?", tr: "Ödeme güvenli mi ve iade politikası var mı?" },
  "faq.q19.answer": { en: "Payments are made through a secure infrastructure. A refund policy applies under certain conditions.", tr: "Ödemeler güvenli bir altyapı üzerinden yapılır. Belirli koşullar altında iade politikası uygulanır." },
  "faq.q20.question": { en: "How do I contact the AIChatly support team?", tr: "AIChatly destek ekibiyle nasıl iletişime geçebilirim?" },
  "faq.q20.answer": { en: "You can contact them via the support page or email. Priority support is provided for premium users.", tr: "Destek sayfası veya e-posta yoluyla iletişime geçebilirsiniz. Premium kullanıcılar için öncelikli destek sağlanır." },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "tr")) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
