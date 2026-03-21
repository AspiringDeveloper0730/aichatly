
export interface ExampleCharacter {
  id: string;
  name: string;
  occupation_en: string;
  occupation_tr: string;
  description_en: string;
  description_tr: string;
  character_type: "ai" | "real";
  gender: "male" | "female";
  image_url: string;
  is_anime: boolean;
  likes_count: number;
  favorites_count: number;
  is_published: boolean;
  categories: string[];
}

export const exampleCharacters: ExampleCharacter[] = [
  {
    id: "example-1",
    name: "Dr. Sarah Chen",
    occupation_en: "AI Psychologist & Life Coach",
    occupation_tr: "Yapay Zeka Psikolog & Yaşam Koçu",
    description_en: "Specialized in cognitive behavioral therapy and personal development",
    description_tr: "Bilişsel davranışçı terapi ve kişisel gelişim konusunda uzman",
    character_type: "ai",
    gender: "female",
    image_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1000&h=1250&fit=crop",
    is_anime: false,
    likes_count: 1247,
    favorites_count: 892,
    is_published: true,
    categories: ["therapist", "psychologist", "coach"]
  },
  {
    id: "example-2",
    name: "Marcus Stone",
    occupation_en: "Fitness & Motivation Expert",
    occupation_tr: "Fitness & Motivasyon Uzmanı",
    description_en: "Former athlete turned motivational speaker and fitness trainer",
    description_tr: "Eski sporcu, motivasyon konuşmacısı ve fitness antrenörü",
    character_type: "ai",
    gender: "male",
    image_url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=1000&h=1250&fit=crop",
    is_anime: false,
    likes_count: 2156,
    favorites_count: 1543,
    is_published: true,
    categories: ["motivation", "health", "coach"]
  },
  {
    id: "example-3",
    name: "Luna Starlight",
    occupation_en: "Astrology & Spiritual Guide",
    occupation_tr: "Astroloji & Ruhsal Rehber",
    description_en: "Expert in astrology, tarot reading, and spiritual guidance",
    description_tr: "Astroloji, tarot okuma ve ruhsal rehberlik uzmanı",
    character_type: "ai",
    gender: "female",
    image_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&h=1250&fit=crop",
    is_anime: false,
    likes_count: 3421,
    favorites_count: 2876,
    is_published: true,
    categories: ["astrology", "religion", "entertainment"]
  },
  {
    id: "example-4",
    name: "Sakura Miyamoto",
    occupation_en: "Japanese Language & Culture Teacher",
    occupation_tr: "Japonca Dil & Kültür Öğretmeni",
    description_en: "Native Japanese speaker teaching language and cultural traditions",
    description_tr: "Anadili Japonca olan dil ve kültürel gelenekler öğretmeni",
    character_type: "ai",
    gender: "female",
    image_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1000&h=1250&fit=crop",
    is_anime: true,
    likes_count: 4532,
    favorites_count: 3987,
    is_published: true,
    categories: ["education", "travel", "entertainment"]
  },
  {
    id: "example-5",
    name: "Alex Rivera",
    occupation_en: "Tech Entrepreneur & Business Consultant",
    occupation_tr: "Teknoloji Girişimcisi & İş Danışmanı",
    description_en: "Silicon Valley veteran helping startups scale and succeed",
    description_tr: "Silikon Vadisi deneyimli girişimcisi, startup'lara büyüme konusunda yardımcı",
    character_type: "ai",
    gender: "male",
    image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1000&h=1250&fit=crop",
    is_anime: false,
    likes_count: 1876,
    favorites_count: 1234,
    is_published: true,
    categories: ["professional-consultant", "education", "motivation"]
  },
  {
    id: "example-6",
    name: "Emma Valentine",
    occupation_en: "Relationship & Dating Coach",
    occupation_tr: "İlişki & Flört Koçu",
    description_en: "Helping people build meaningful connections and healthy relationships",
    description_tr: "İnsanların anlamlı bağlantılar ve sağlıklı ilişkiler kurmasına yardımcı",
    character_type: "ai",
    gender: "female",
    image_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1000&h=1250&fit=crop",
    is_anime: false,
    likes_count: 5234,
    favorites_count: 4321,
    is_published: true,
    categories: ["dating", "psychologist", "entertainment"]
  },
  {
    id: "example-7",
    name: "Kai Nakamura",
    occupation_en: "Anime Artist & Creative Director",
    occupation_tr: "Anime Sanatçısı & Kreatif Direktör",
    description_en: "Professional manga artist and animation studio creative director",
    description_tr: "Profesyonel manga sanatçısı ve animasyon stüdyosu kreatif direktörü",
    character_type: "ai",
    gender: "male",
    image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1000&h=1250&fit=crop",
    is_anime: true,
    likes_count: 6789,
    favorites_count: 5432,
    is_published: true,
    categories: ["entertainment", "education", "motivation"]
  },
  {
    id: "example-8",
    name: "Dr. Michael Brooks",
    occupation_en: "Medical Doctor & Health Advisor",
    occupation_tr: "Tıp Doktoru & Sağlık Danışmanı",
    description_en: "Board-certified physician specializing in preventive medicine",
    description_tr: "Koruyucu tıp konusunda uzmanlaşmış sertifikalı hekim",
    character_type: "ai",
    gender: "male",
    image_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=1000&h=1250&fit=crop",
    is_anime: false,
    likes_count: 2987,
    favorites_count: 2134,
    is_published: true,
    categories: ["health", "professional-consultant", "education"]
  },
  {
    id: "example-9",
    name: "Yuki Tanaka",
    occupation_en: "Meditation & Mindfulness Guide",
    occupation_tr: "Meditasyon & Farkındalık Rehberi",
    description_en: "Zen practitioner teaching mindfulness and stress management",
    description_tr: "Zen uygulayıcısı, farkındalık ve stres yönetimi öğretiyor",
    character_type: "ai",
    gender: "female",
    image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1000&h=1250&fit=crop",
    is_anime: true,
    likes_count: 4123,
    favorites_count: 3456,
    is_published: true,
    categories: ["religion", "health", "therapist"]
  },
  {
    id: "example-10",
    name: "Carlos Mendez",
    occupation_en: "Travel Guide & Adventure Expert",
    occupation_tr: "Seyahat Rehberi & Macera Uzmanı",
    description_en: "World traveler sharing experiences from 100+ countries",
    description_tr: "100'den fazla ülkeden deneyimlerini paylaşan dünya gezgini",
    character_type: "ai",
    gender: "male",
    image_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1000&h=1250&fit=crop",
    is_anime: false,
    likes_count: 3654,
    favorites_count: 2789,
    is_published: true,
    categories: ["travel", "entertainment", "motivation"]
  },
  {
    id: "example-11",
    name: "Aria Moonstone",
    occupation_en: "Fantasy Writer & Storyteller",
    occupation_tr: "Fantezi Yazarı & Hikaye Anlatıcısı",
    description_en: "Award-winning fantasy novelist and creative writing mentor",
    description_tr: "Ödüllü fantezi romancısı ve yaratıcı yazarlık mentoru",
    character_type: "ai",
    gender: "female",
    image_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1000&h=1250&fit=crop",
    is_anime: true,
    likes_count: 5678,
    favorites_count: 4567,
    is_published: true,
    categories: ["entertainment", "education", "motivation"]
  },
  {
    id: "example-12",
    name: "James Anderson",
    occupation_en: "Career Coach & HR Specialist",
    occupation_tr: "Kariyer Koçu & İK Uzmanı",
    description_en: "Helping professionals navigate career transitions and growth",
    description_tr: "Profesyonellerin kariyer geçişlerinde ve büyümesinde yardımcı",
    character_type: "ai",
    gender: "male",
    image_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1000&h=1250&fit=crop",
    is_anime: false,
    likes_count: 2345,
    favorites_count: 1876,
    is_published: true,
    categories: ["professional-consultant", "coach", "education"]
  }
];
