
-- =====================================================
-- PHASE 1: FOUNDATION (Utilities & ENUMs)
-- =====================================================

-- Standard timestamp update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Character type enum
CREATE TYPE character_type AS ENUM ('ai', 'real');

-- Gender enum
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- Subscription status enum
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired', 'trial');

-- =====================================================
-- PHASE 2: DDL (Tables & Indexes)
-- =====================================================

-- User profiles (synced with auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'tr')),
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_is_premium ON public.profiles(is_premium);

-- User roles
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'moderator')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Categories for characters
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_tr TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon_svg TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_display_order ON public.categories(display_order);

-- Characters
CREATE TABLE public.characters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID NOT NULL,
    name TEXT NOT NULL,
    occupation_en TEXT,
    occupation_tr TEXT,
    description_en TEXT,
    description_tr TEXT,
    character_type character_type NOT NULL DEFAULT 'ai',
    gender gender_type,
    image_url TEXT NOT NULL,
    is_anime BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    chat_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_characters_creator_id ON public.characters(creator_id);
CREATE INDEX idx_characters_type ON public.characters(character_type);
CREATE INDEX idx_characters_gender ON public.characters(gender);
CREATE INDEX idx_characters_is_anime ON public.characters(is_anime);
CREATE INDEX idx_characters_is_published ON public.characters(is_published) WHERE deleted_at IS NULL;
CREATE INDEX idx_characters_is_featured ON public.characters(is_featured) WHERE deleted_at IS NULL;
CREATE INDEX idx_characters_likes_count ON public.characters(likes_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_characters_created_at ON public.characters(created_at DESC) WHERE deleted_at IS NULL;

-- Character categories (many-to-many)
CREATE TABLE public.character_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    character_id UUID NOT NULL,
    category_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(character_id, category_id)
);

CREATE INDEX idx_character_categories_character_id ON public.character_categories(character_id);
CREATE INDEX idx_character_categories_category_id ON public.character_categories(category_id);

-- User favorites
CREATE TABLE public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    character_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, character_id)
);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_character_id ON public.favorites(character_id);
CREATE INDEX idx_favorites_created_at ON public.favorites(created_at DESC);

-- User likes
CREATE TABLE public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    character_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, character_id)
);

CREATE INDEX idx_likes_user_id ON public.likes(user_id);
CREATE INDEX idx_likes_character_id ON public.likes(character_id);

-- Chat conversations
CREATE TABLE public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    character_id UUID NOT NULL,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_character_id ON public.conversations(character_id);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- Chat messages
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'character')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Premium subscriptions
CREATE TABLE public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    status subscription_status NOT NULL DEFAULT 'trial',
    plan_name TEXT NOT NULL,
    price_amount INTEGER,
    currency TEXT DEFAULT 'usd',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);

-- Campaigns
CREATE TABLE public.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title_en TEXT NOT NULL,
    title_tr TEXT NOT NULL,
    description_en TEXT,
    description_tr TEXT,
    discount_percentage INTEGER,
    badge_text TEXT DEFAULT '🔥 Limited Time Campaign',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaigns_is_active ON public.campaigns(is_active);
CREATE INDEX idx_campaigns_end_date ON public.campaigns(end_date DESC);

-- =====================================================
-- PHASE 3: LOGIC (Table-Dependent Functions)
-- =====================================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = _role
  );
$$;

-- Check if user is premium
CREATE OR REPLACE FUNCTION public.is_premium_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_premium FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Increment character likes count
CREATE OR REPLACE FUNCTION public.increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE characters 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.character_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Decrement character likes count
CREATE OR REPLACE FUNCTION public.decrement_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE characters 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.character_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Increment character favorites count
CREATE OR REPLACE FUNCTION public.increment_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE characters 
    SET favorites_count = favorites_count + 1 
    WHERE id = NEW.character_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Decrement character favorites count
CREATE OR REPLACE FUNCTION public.decrement_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE characters 
    SET favorites_count = GREATEST(favorites_count - 1, 0)
    WHERE id = OLD.character_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 4: SECURITY (RLS Policies)
-- =====================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- User roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (has_role('admin'));

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
USING (has_role('admin'));

-- Characters
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published characters are viewable by everyone"
ON public.characters FOR SELECT
USING (is_published = true AND deleted_at IS NULL);

CREATE POLICY "Users can view own characters"
ON public.characters FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Authenticated users can create characters"
ON public.characters FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own characters"
ON public.characters FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Users can soft delete own characters"
ON public.characters FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Admins can manage all characters"
ON public.characters FOR ALL
USING (has_role('admin'));

-- Character categories
ALTER TABLE public.character_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Character categories are viewable by everyone"
ON public.character_categories FOR SELECT
USING (true);

CREATE POLICY "Character creators can manage their character categories"
ON public.character_categories FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM characters 
        WHERE id = character_id 
        AND creator_id = auth.uid()
    )
);

-- Favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);

-- Likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own likes"
ON public.likes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own likes"
ON public.likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
ON public.likes FOR DELETE
USING (auth.uid() = user_id);

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE
USING (auth.uid() = user_id);

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = conversation_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = conversation_id 
        AND user_id = auth.uid()
    )
);

-- Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions FOR ALL
USING (has_role('admin'));

-- Campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active campaigns are viewable by everyone"
ON public.campaigns FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage campaigns"
ON public.campaigns FOR ALL
USING (has_role('admin'));

-- =====================================================
-- PHASE 5: AUTOMATION (Triggers)
-- =====================================================

-- Timestamp triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_characters_updated_at
    BEFORE UPDATE ON public.characters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- New user sync trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Likes count triggers
CREATE TRIGGER increment_likes_on_insert
    AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION increment_likes_count();

CREATE TRIGGER decrement_likes_on_delete
    AFTER DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION decrement_likes_count();

-- Favorites count triggers
CREATE TRIGGER increment_favorites_on_insert
    AFTER INSERT ON public.favorites
    FOR EACH ROW EXECUTE FUNCTION increment_favorites_count();

CREATE TRIGGER decrement_favorites_on_delete
    AFTER DELETE ON public.favorites
    FOR EACH ROW EXECUTE FUNCTION decrement_favorites_count();

-- Conversation timestamp trigger
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- =====================================================
-- SEED DATA: Categories
-- =====================================================

INSERT INTO public.categories (name_en, name_tr, slug, display_order) VALUES
('Motivation', 'Motivasyon', 'motivation', 1),
('Dating', 'Flört', 'dating', 2),
('Education', 'Eğitim', 'education', 3),
('Entertainment', 'Eğlence', 'entertainment', 4),
('Therapist', 'Terapist', 'therapist', 5),
('Psychologist', 'Psikolog', 'psychologist', 6),
('Coach', 'Koç', 'coach', 7),
('Professional Consultant', 'Profesyonel Danışman', 'professional-consultant', 8),
('Health', 'Sağlık', 'health', 9),
('Religion', 'Din', 'religion', 10),
('Astrology', 'Astroloji', 'astrology', 11),
('Travel', 'Seyahat', 'travel', 12);

-- =====================================================
-- SEED DATA: Sample Campaign
-- =====================================================

INSERT INTO public.campaigns (
    title_en, 
    title_tr, 
    description_en, 
    description_tr, 
    discount_percentage,
    badge_text,
    start_date,
    end_date,
    is_active
) VALUES (
    '40% Off – Premium Membership',
    '%40 İndirim – Premium Üyelik',
    'Access premium features now, don''t miss out',
    'Premium özelliklere şimdi erişin, kaçırmayın',
    40,
    '🔥 Limited Time Campaign',
    now(),
    now() + interval '90 days',
    true
);

-- Insert Categories (with Turkish and English names)
INSERT INTO public.categories (name_en, name_tr, slug, icon_svg, display_order) VALUES
('Motivation', 'Motivasyon', 'motivation', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>', 1),
('Dating', 'Flört', 'dating', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>', 2),
('Education', 'Eğitim', 'education', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>', 3),
('Entertainment', 'Eğlence', 'entertainment', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', 4),
('Therapist', 'Terapist', 'therapist', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>', 5),
('Psychologist', 'Psikolog', 'psychologist', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>', 6),
('Coach', 'Koç', 'coach', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>', 7),
('Professional Consultant', 'Profesyonel Danışman', 'professional-consultant', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>', 8),
('Health', 'Sağlık', 'health', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>', 9),
('Religion', 'Din', 'religion', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>', 10),
('Astrology', 'Astroloji', 'astrology', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>', 11),
('Travel', 'Seyahat', 'travel', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', 12);

-- Insert Example Characters (using real Pexels/Unsplash images)
INSERT INTO public.characters (creator_id, name, occupation_en, occupation_tr, description_en, description_tr, character_type, gender, image_url, is_anime, is_published, is_featured, likes_count, favorites_count) VALUES
-- 1. Sophia Chen - Life Coach
('00000000-0000-0000-0000-000000000000', 'Sophia Chen', 'Life & Career Coach', 'Yaşam ve Kariyer Koçu', 'Empowering you to achieve your dreams and unlock your full potential', 'Hayallerinize ulaşmanız ve tam potansiyelinizi ortaya çıkarmanız için size güç veriyorum', 'ai', 'female', 'https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=1000', false, true, true, 1247, 892),

-- 2. Dr. Marcus Williams - Psychologist
('00000000-0000-0000-0000-000000000000', 'Dr. Marcus Williams', 'Clinical Psychologist', 'Klinik Psikolog', 'Specialized in cognitive behavioral therapy and mental wellness', 'Bilişsel davranışçı terapi ve zihinsel sağlık konusunda uzmanlaşmış', 'ai', 'male', 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=1000', false, true, true, 2156, 1543),

-- 3. Luna Starlight - Astrologer
('00000000-0000-0000-0000-000000000000', 'Luna Starlight', 'Professional Astrologer', 'Profesyonel Astrolog', 'Guiding you through the cosmic energies and celestial wisdom', 'Kozmik enerjiler ve göksel bilgelik yoluyla size rehberlik ediyorum', 'ai', 'female', 'https://images.pexels.com/photos/3812743/pexels-photo-3812743.jpeg?auto=compress&cs=tinysrgb&w=1000', false, true, false, 987, 654),

-- 4. Sakura Miyamoto - Anime Character
('00000000-0000-0000-0000-000000000000', 'Sakura Miyamoto', 'High School Student & Adventurer', 'Lise Öğrencisi ve Maceracı', 'Cheerful anime character ready for exciting conversations and fun adventures', 'Heyecan verici sohbetler ve eğlenceli maceralar için hazır neşeli anime karakteri', 'ai', 'female', 'https://images.pexels.com/photos/7974496/pexels-photo-7974496.jpeg?auto=compress&cs=tinysrgb&w=1000', true, true, true, 3421, 2876),

-- 5. Alex Rivera - Fitness Coach
('00000000-0000-0000-0000-000000000000', 'Alex Rivera', 'Personal Fitness Trainer', 'Kişisel Fitness Antrenörü', 'Transform your body and mind with personalized workout plans', 'Kişiselleştirilmiş egzersiz planlarıyla vücudunuzu ve zihninizi dönüştürün', 'ai', 'male', 'https://images.pexels.com/photos/4162491/pexels-photo-4162491.jpeg?auto=compress&cs=tinysrgb&w=1000', false, true, false, 1876, 1234),

-- 6. Emma Thompson - Dating Coach
('00000000-0000-0000-0000-000000000000', 'Emma Thompson', 'Relationship & Dating Expert', 'İlişki ve Flört Uzmanı', 'Helping you navigate modern dating and build meaningful connections', 'Modern flört dünyasında gezinmenize ve anlamlı bağlantılar kurmanıza yardımcı oluyorum', 'ai', 'female', 'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=1000', false, true, true, 2543, 1987),

-- 7. Professor James Anderson - Education
('00000000-0000-0000-0000-000000000000', 'Professor James Anderson', 'University Professor & Tutor', 'Üniversite Profesörü ve Öğretmen', 'Making complex subjects simple and learning enjoyable', 'Karmaşık konuları basit ve öğrenmeyi keyifli hale getiriyorum', 'ai', 'male', 'https://images.pexels.com/photos/5212317/pexels-photo-5212317.jpeg?auto=compress&cs=tinysrgb&w=1000', false, true, false, 1654, 1123),

-- 8. Yuki Tanaka - Anime Companion
('00000000-0000-0000-0000-000000000000', 'Yuki Tanaka', 'Magical Girl & Friend', 'Sihirli Kız ve Arkadaş', 'Bringing anime magic and friendship into your daily conversations', 'Günlük sohbetlerinize anime büyüsü ve arkadaşlık getiriyorum', 'ai', 'female', 'https://images.pexels.com/photos/8088495/pexels-photo-8088495.jpeg?auto=compress&cs=tinysrgb&w=1000', true, true, false, 2987, 2345),

-- 9. Dr. Sarah Mitchell - Therapist
('00000000-0000-0000-0000-000000000000', 'Dr. Sarah Mitchell', 'Licensed Therapist', 'Lisanslı Terapist', 'Creating a safe space for healing, growth, and self-discovery', 'İyileşme, büyüme ve kendini keşfetme için güvenli bir alan yaratıyorum', 'ai', 'female', 'https://images.pexels.com/photos/4173239/pexels-photo-4173239.jpeg?auto=compress&cs=tinysrgb&w=1000', false, true, true, 3156, 2654),

-- 10. Marco Rossi - Travel Guide
('00000000-0000-0000-0000-000000000000', 'Marco Rossi', 'World Traveler & Guide', 'Dünya Gezgini ve Rehber', 'Sharing travel tips, hidden gems, and cultural insights from around the globe', 'Dünya çapında seyahat ipuçları, gizli hazineler ve kültürel içgörüler paylaşıyorum', 'ai', 'male', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=1000', false, true, false, 1432, 987),

-- 11. Aria Moonstone - Spiritual Guide
('00000000-0000-0000-0000-000000000000', 'Aria Moonstone', 'Spiritual Counselor', 'Manevi Danışman', 'Guiding you on your spiritual journey with wisdom and compassion', 'Bilgelik ve şefkatle manevi yolculuğunuzda size rehberlik ediyorum', 'ai', 'female', 'https://images.pexels.com/photos/3771836/pexels-photo-3771836.jpeg?auto=compress&cs=tinysrgb&w=1000', false, true, false, 1765, 1345),

-- 12. Kenji Yamamoto - Anime Hero
('00000000-0000-0000-0000-000000000000', 'Kenji Yamamoto', 'Warrior & Protector', 'Savaşçı ve Koruyucu', 'Brave anime hero ready to inspire courage and determination', 'Cesaret ve kararlılık ilham vermeye hazır cesur anime kahramanı', 'ai', 'male', 'https://images.pexels.com/photos/8088501/pexels-photo-8088501.jpeg?auto=compress&cs=tinysrgb&w=1000', true, true, true, 4123, 3456);

-- Link Characters to Categories
INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Sophia Chen' AND cat.slug IN ('motivation', 'coach', 'professional-consultant');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Dr. Marcus Williams' AND cat.slug IN ('psychologist', 'therapist', 'health');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Luna Starlight' AND cat.slug IN ('astrology', 'religion');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Sakura Miyamoto' AND cat.slug IN ('entertainment');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Alex Rivera' AND cat.slug IN ('health', 'coach', 'motivation');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Emma Thompson' AND cat.slug IN ('dating', 'coach');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Professor James Anderson' AND cat.slug IN ('education', 'professional-consultant');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Yuki Tanaka' AND cat.slug IN ('entertainment');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Dr. Sarah Mitchell' AND cat.slug IN ('therapist', 'psychologist', 'health');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Marco Rossi' AND cat.slug IN ('travel', 'entertainment');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Aria Moonstone' AND cat.slug IN ('religion', 'therapist', 'astrology');

INSERT INTO public.character_categories (character_id, category_id)
SELECT c.id, cat.id FROM public.characters c, public.categories cat
WHERE c.name = 'Kenji Yamamoto' AND cat.slug IN ('entertainment', 'motivation');

-- Insert an active campaign
INSERT INTO public.campaigns (title_en, title_tr, description_en, description_tr, discount_percentage, start_date, end_date, is_active)
VALUES (
    '40% Off – Premium Membership',
    '%40 İndirim – Premium Üyelik',
    'Access premium features now, don''t miss out',
    'Premium özelliklere şimdi erişin, kaçırmayın',
    40,
    NOW(),
    NOW() + INTERVAL '90 days',
    true
);

-- =====================================================
-- PHASE 1: FOUNDATION (Enums & Utility Functions)
-- =====================================================

-- Referral status enum
CREATE TYPE referral_status AS ENUM ('pending', 'active', 'blocked', 'suspicious');

-- Withdrawal status enum
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid');

-- Training file type enum
CREATE TYPE training_file_type AS ENUM ('pdf', 'docx', 'txt', 'epub');

-- Update timestamp function (already exists, but ensuring it's present)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 2: DDL (Tables & Indexes)
-- =====================================================

-- Referral tracking table
CREATE TABLE public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL, -- User who shared the link
    referred_id UUID, -- User who signed up (NULL until signup)
    referral_code TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    device_fingerprint TEXT,
    stripe_customer_id TEXT,
    status referral_status DEFAULT 'pending',
    first_purchase_at TIMESTAMPTZ,
    total_earnings_cents INTEGER DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 25.00, -- 25% first year, 10% after
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_status ON public.referrals(status);

-- Referral earnings history
CREATE TABLE public.referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL,
    subscription_id UUID NOT NULL,
    amount_cents INTEGER NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_referral_earnings_referral_id ON public.referral_earnings(referral_id);
CREATE INDEX idx_referral_earnings_subscription_id ON public.referral_earnings(subscription_id);
CREATE INDEX idx_referral_earnings_payment_date ON public.referral_earnings(payment_date DESC);

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount_cents INTEGER NOT NULL,
    status withdrawal_status DEFAULT 'pending',
    payment_method TEXT, -- PayPal, Bank Transfer, etc.
    payment_details JSONB, -- Email, account number, etc.
    processed_at TIMESTAMPTZ,
    processed_by UUID, -- Admin who processed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_created_at ON public.withdrawal_requests(created_at DESC);

-- Character training files
CREATE TABLE public.character_training_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_type training_file_type NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage path
    extracted_text TEXT, -- Processed text content
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_character_training_files_character_id ON public.character_training_files(character_id);
CREATE INDEX idx_character_training_files_is_processed ON public.character_training_files(is_processed);

-- Character creation sessions (track multi-step creation process)
CREATE TABLE public.character_creation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    character_id UUID, -- NULL until character is created
    step_number INTEGER DEFAULT 1,
    original_prompt TEXT,
    optimized_prompt TEXT,
    generation_attempts INTEGER DEFAULT 0,
    selected_image_url TEXT,
    form_data JSONB, -- Store name, age, gender, etc.
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_character_creation_sessions_user_id ON public.character_creation_sessions(user_id);
CREATE INDEX idx_character_creation_sessions_character_id ON public.character_creation_sessions(character_id);
CREATE INDEX idx_character_creation_sessions_is_completed ON public.character_creation_sessions(is_completed);

-- User credits and usage limits
CREATE TABLE public.user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    image_generation_credits INTEGER DEFAULT 3, -- DALL-E generations
    chat_messages_remaining INTEGER DEFAULT 100, -- Free tier limit
    character_slots INTEGER DEFAULT 5, -- How many characters can create
    file_upload_mb_limit INTEGER DEFAULT 10, -- MB limit for training files
    credits_reset_at TIMESTAMPTZ, -- When credits renew
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);

-- Usage tracking for analytics
CREATE TABLE public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL, -- 'image_generation', 'chat_message', 'file_upload'
    resource_id UUID, -- character_id, conversation_id, etc.
    metadata JSONB, -- Additional context
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_action_type ON public.usage_logs(action_type);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at DESC);

-- =====================================================
-- PHASE 3: LOGIC (Table-Dependent Functions)
-- =====================================================

-- Check if user has role (already exists, ensuring it's present)
CREATE OR REPLACE FUNCTION public.has_role(_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = _role
  );
$$;

-- Get user's available referral balance
CREATE OR REPLACE FUNCTION public.get_referral_balance(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT SUM(total_earnings_cents) FROM referrals WHERE referrer_id = user_uuid),
    0
  ) - COALESCE(
    (SELECT SUM(amount_cents) FROM withdrawal_requests 
     WHERE user_id = user_uuid AND status IN ('approved', 'paid')),
    0
  );
$$;

-- Check if user has enough credits for action
CREATE OR REPLACE FUNCTION public.has_credits(user_uuid UUID, credit_type TEXT, amount INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  available_credits INTEGER;
BEGIN
  CASE credit_type
    WHEN 'image_generation' THEN
      SELECT image_generation_credits INTO available_credits 
      FROM user_credits WHERE user_id = user_uuid;
    WHEN 'chat_messages' THEN
      SELECT chat_messages_remaining INTO available_credits 
      FROM user_credits WHERE user_id = user_uuid;
    WHEN 'character_slots' THEN
      SELECT character_slots INTO available_credits 
      FROM user_credits WHERE user_id = user_uuid;
    ELSE
      RETURN false;
  END CASE;
  
  RETURN COALESCE(available_credits, 0) >= amount;
END;
$$;

-- Deduct credits after usage
CREATE OR REPLACE FUNCTION public.deduct_credits(user_uuid UUID, credit_type TEXT, amount INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE credit_type
    WHEN 'image_generation' THEN
      UPDATE user_credits 
      SET image_generation_credits = GREATEST(image_generation_credits - amount, 0),
          updated_at = now()
      WHERE user_id = user_uuid;
    WHEN 'chat_messages' THEN
      UPDATE user_credits 
      SET chat_messages_remaining = GREATEST(chat_messages_remaining - amount, 0),
          updated_at = now()
      WHERE user_id = user_uuid;
    WHEN 'character_slots' THEN
      UPDATE user_credits 
      SET character_slots = GREATEST(character_slots - amount, 0),
          updated_at = now()
      WHERE user_id = user_uuid;
    ELSE
      RETURN false;
  END CASE;
  
  RETURN true;
END;
$$;

-- =====================================================
-- PHASE 4: SECURITY (RLS Policies)
-- =====================================================

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_training_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_creation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Referrals policies
CREATE POLICY "Users can view own referrals" ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create own referral codes" ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admins can manage all referrals" ON public.referrals
FOR ALL
USING (has_role('admin'));

-- Referral earnings policies
CREATE POLICY "Users can view own earnings" ON public.referral_earnings
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM referrals 
  WHERE referrals.id = referral_earnings.referral_id 
  AND referrals.referrer_id = auth.uid()
));

CREATE POLICY "Admins can manage earnings" ON public.referral_earnings
FOR ALL
USING (has_role('admin'));

-- Withdrawal requests policies
CREATE POLICY "Users can view own withdrawals" ON public.withdrawal_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage withdrawals" ON public.withdrawal_requests
FOR ALL
USING (has_role('admin'));

-- Character training files policies
CREATE POLICY "Users can manage own character files" ON public.character_training_files
FOR ALL
USING (EXISTS (
  SELECT 1 FROM characters 
  WHERE characters.id = character_training_files.character_id 
  AND characters.creator_id = auth.uid()
));

CREATE POLICY "Admins can manage all training files" ON public.character_training_files
FOR ALL
USING (has_role('admin'));

-- Character creation sessions policies
CREATE POLICY "Users can manage own creation sessions" ON public.character_creation_sessions
FOR ALL
USING (auth.uid() = user_id);

-- User credits policies
CREATE POLICY "Users can view own credits" ON public.user_credits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all credits" ON public.user_credits
FOR ALL
USING (has_role('admin'));

-- Usage logs policies
CREATE POLICY "Users can view own usage logs" ON public.usage_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs" ON public.usage_logs
FOR INSERT
WITH CHECK (true); -- Allow system to log usage

CREATE POLICY "Admins can view all usage logs" ON public.usage_logs
FOR SELECT
USING (has_role('admin'));

-- =====================================================
-- PHASE 5: AUTOMATION (Triggers)
-- =====================================================

-- Update timestamp triggers
CREATE TRIGGER update_referrals_updated_at
    BEFORE UPDATE ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
    BEFORE UPDATE ON public.withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_character_training_files_updated_at
    BEFORE UPDATE ON public.character_training_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_character_creation_sessions_updated_at
    BEFORE UPDATE ON public.character_creation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize user credits on profile creation
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits_reset_at)
  VALUES (NEW.id, now() + INTERVAL '30 days');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_init_credits
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION initialize_user_credits();

-- Generate unique referral code on user creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Generate 8-character alphanumeric code
  new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8));
  
  INSERT INTO public.referrals (referrer_id, referral_code)
  VALUES (NEW.id, new_code);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_generate_referral
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Track referral earnings on subscription payment
CREATE OR REPLACE FUNCTION public.track_referral_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_record RECORD;
  commission_amount INTEGER;
  commission_rate DECIMAL(5,2);
BEGIN
  -- Only process active subscriptions
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  -- Find referral record
  SELECT * INTO referral_record
  FROM referrals
  WHERE referred_id = NEW.user_id
  AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Calculate commission (25% first year, 10% after)
  IF referral_record.first_purchase_at IS NULL OR 
     referral_record.first_purchase_at > (now() - INTERVAL '1 year') THEN
    commission_rate := 25.00;
  ELSE
    commission_rate := 10.00;
  END IF;
  
  commission_amount := (NEW.price_amount * commission_rate / 100)::INTEGER;
  
  -- Record earning
  INSERT INTO referral_earnings (referral_id, subscription_id, amount_cents, commission_rate, payment_date)
  VALUES (referral_record.id, NEW.id, commission_amount, commission_rate, now());
  
  -- Update referral totals
  UPDATE referrals
  SET total_earnings_cents = total_earnings_cents + commission_amount,
      first_purchase_at = COALESCE(first_purchase_at, now()),
      commission_rate = commission_rate,
      updated_at = now()
  WHERE id = referral_record.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_payment_track_referral
    AFTER INSERT OR UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION track_referral_earnings();

-- Log usage when credits are deducted
CREATE OR REPLACE FUNCTION public.log_credit_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log image generation usage
  IF OLD.image_generation_credits > NEW.image_generation_credits THEN
    INSERT INTO usage_logs (user_id, action_type, metadata)
    VALUES (NEW.user_id, 'image_generation', jsonb_build_object(
      'credits_used', OLD.image_generation_credits - NEW.image_generation_credits,
      'remaining', NEW.image_generation_credits
    ));
  END IF;
  
  -- Log chat message usage
  IF OLD.chat_messages_remaining > NEW.chat_messages_remaining THEN
    INSERT INTO usage_logs (user_id, action_type, metadata)
    VALUES (NEW.user_id, 'chat_message', jsonb_build_object(
      'messages_used', OLD.chat_messages_remaining - NEW.chat_messages_remaining,
      'remaining', NEW.chat_messages_remaining
    ));
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_credits_deducted_log_usage
    AFTER UPDATE ON public.user_credits
    FOR EACH ROW EXECUTE FUNCTION log_credit_usage();

-- Assign admin role to smartspaws@gmail.com
-- This will give them full admin privileges across all tables due to existing RLS policies

INSERT INTO public.user_roles (user_id, role)
SELECT 
    id,
    'admin'
FROM auth.users
WHERE email = 'smartspaws@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the admin role was assigned (optional check)
-- You can run this query to confirm:
-- SELECT ur.role, p.email, p.full_name
-- FROM user_roles ur
-- JOIN profiles p ON p.id = ur.user_id
-- WHERE p.email = 'smartspaws@gmail.com';

-- Assign admin role to smartspaws@gmail.com
-- This assumes the user has already signed up through Supabase Auth

-- First, we need to ensure the user exists and get their ID
-- Then insert the admin role (or update if exists)

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'smartspaws@gmail.com'
ON CONFLICT (user_id, role) 
DO NOTHING;

-- Verify the admin role was assigned
-- You can run this query to check:
-- SELECT ur.*, au.email 
-- FROM public.user_roles ur
-- JOIN auth.users au ON au.id = ur.user_id
-- WHERE ur.role = 'admin';

-- Add blocked_at field to profiles table for user blocking functionality
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient blocked user queries
CREATE INDEX IF NOT EXISTS idx_profiles_blocked_at 
ON public.profiles USING btree (blocked_at) 
WHERE blocked_at IS NOT NULL;

-- Add RLS policy for admins to manage user blocking
CREATE POLICY "Admins can block/unblock users" ON public.profiles
FOR UPDATE
USING (has_role('admin'))
WITH CHECK (has_role('admin'));

-- Create helper function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT blocked_at IS NOT NULL
  FROM profiles
  WHERE id = check_user_id;
$$;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.blocked_at IS 'Timestamp when user was blocked by admin. NULL means user is active.';

-- ============================================================================
-- PHASE 1: FOUNDATION (Enums & Utility Functions)
-- ============================================================================

-- Package billing cycle types
CREATE TYPE PACKAGE_TYPE AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- Refund request status
CREATE TYPE REFUND_STATUS AS ENUM ('pending', 'approved', 'rejected', 'processed');

-- Timestamp update function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 2: DDL (Tables & Indexes)
-- ============================================================================

-- Packages: Define available subscription plans
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_tr TEXT NOT NULL,
    package_type PACKAGE_TYPE NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    
    -- Stripe integration
    stripe_price_id TEXT UNIQUE,
    stripe_product_id TEXT,
    
    -- Bonuses & Features
    bonus_credits INTEGER DEFAULT 0,
    bonus_description_en TEXT,
    bonus_description_tr TEXT,
    
    -- Display & Status
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_packages_type ON public.packages(package_type);
CREATE INDEX idx_packages_is_active ON public.packages(is_active);
CREATE INDEX idx_packages_display_order ON public.packages(display_order);
CREATE INDEX idx_packages_stripe_price_id ON public.packages(stripe_price_id);

COMMENT ON TABLE public.packages IS 'Defines available subscription packages with pricing and bonuses';
COMMENT ON COLUMN public.packages.price_cents IS 'Price in cents (e.g., 999 = $9.99)';
COMMENT ON COLUMN public.packages.bonus_credits IS 'Extra credits awarded with this package';

-- Package Purchases: Track individual sales for analytics
CREATE TABLE IF NOT EXISTS public.package_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    package_id UUID NOT NULL,
    subscription_id UUID, -- Link to active subscription
    
    -- Purchase Details
    amount_paid_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    
    -- Stripe Transaction
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,
    
    -- Status
    is_refunded BOOLEAN DEFAULT false,
    refunded_at TIMESTAMPTZ,
    refund_amount_cents INTEGER,
    
    -- Audit
    purchased_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_package_purchases_user_id ON public.package_purchases(user_id);
CREATE INDEX idx_package_purchases_package_id ON public.package_purchases(package_id);
CREATE INDEX idx_package_purchases_subscription_id ON public.package_purchases(subscription_id);
CREATE INDEX idx_package_purchases_purchased_at ON public.package_purchases(purchased_at DESC);
CREATE INDEX idx_package_purchases_is_refunded ON public.package_purchases(is_refunded);

COMMENT ON TABLE public.package_purchases IS 'Tracks individual package purchases for sales analytics';

-- Package Refund Requests: Manage refund workflow
CREATE TABLE IF NOT EXISTS public.package_refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Refund Details
    requested_amount_cents INTEGER NOT NULL,
    refund_type TEXT NOT NULL CHECK (refund_type IN ('full', 'partial')),
    reason TEXT,
    
    -- Admin Review
    status REFUND_STATUS DEFAULT 'pending',
    reviewed_by UUID, -- Admin user_id
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,
    
    -- Processing
    processed_at TIMESTAMPTZ,
    stripe_refund_id TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_package_refund_requests_purchase_id ON public.package_refund_requests(purchase_id);
CREATE INDEX idx_package_refund_requests_user_id ON public.package_refund_requests(user_id);
CREATE INDEX idx_package_refund_requests_status ON public.package_refund_requests(status);
CREATE INDEX idx_package_refund_requests_created_at ON public.package_refund_requests(created_at DESC);

COMMENT ON TABLE public.package_refund_requests IS 'Manages package refund requests with admin approval workflow';

-- Add package_id to existing subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS package_id UUID;

CREATE INDEX IF NOT EXISTS idx_subscriptions_package_id ON public.subscriptions(package_id);

-- ============================================================================
-- PHASE 3: LOGIC (Table-Dependent Functions)
-- ============================================================================

-- Get package sales statistics
CREATE OR REPLACE FUNCTION get_package_sales_stats(p_package_id UUID)
RETURNS TABLE (
    total_sold BIGINT,
    total_revenue_cents BIGINT,
    active_subscriptions BIGINT
) 
LANGUAGE sql
STABLE
AS $$
    SELECT 
        COUNT(*)::BIGINT as total_sold,
        COALESCE(SUM(amount_paid_cents), 0)::BIGINT as total_revenue_cents,
        COUNT(DISTINCT subscription_id) FILTER (WHERE subscription_id IS NOT NULL)::BIGINT as active_subscriptions
    FROM package_purchases
    WHERE package_id = p_package_id
    AND is_refunded = false;
$$;

-- Get package purchasers
CREATE OR REPLACE FUNCTION get_package_purchasers(p_package_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    purchased_at TIMESTAMPTZ,
    amount_paid_cents INTEGER
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        pp.user_id,
        p.email,
        p.full_name,
        pp.purchased_at,
        pp.amount_paid_cents
    FROM package_purchases pp
    JOIN profiles p ON p.id = pp.user_id
    WHERE pp.package_id = p_package_id
    AND pp.is_refunded = false
    ORDER BY pp.purchased_at DESC;
$$;

-- ============================================================================
-- PHASE 4: SECURITY (RLS Policies)
-- ============================================================================

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_refund_requests ENABLE ROW LEVEL SECURITY;

-- Packages Policies
CREATE POLICY "Active packages are viewable by everyone" 
ON public.packages FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage all packages" 
ON public.packages FOR ALL
USING (has_role('admin'));

-- Package Purchases Policies
CREATE POLICY "Users can view own purchases" 
ON public.package_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" 
ON public.package_purchases FOR SELECT
USING (has_role('admin'));

CREATE POLICY "System can create purchases" 
ON public.package_purchases FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update purchases" 
ON public.package_purchases FOR UPDATE
USING (has_role('admin'));

-- Refund Requests Policies
CREATE POLICY "Users can create own refund requests" 
ON public.package_refund_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own refund requests" 
ON public.package_refund_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all refund requests" 
ON public.package_refund_requests FOR ALL
USING (has_role('admin'));

-- ============================================================================
-- PHASE 5: AUTOMATION (Triggers)
-- ============================================================================

-- Timestamp triggers
CREATE TRIGGER update_packages_updated_at
    BEFORE UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_package_purchases_updated_at
    BEFORE UPDATE ON public.package_purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_package_refund_requests_updated_at
    BEFORE UPDATE ON public.package_refund_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update purchase refund status when refund is approved
CREATE OR REPLACE FUNCTION handle_refund_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE package_purchases
        SET 
            is_refunded = true,
            refunded_at = now(),
            refund_amount_cents = NEW.requested_amount_cents
        WHERE id = NEW.purchase_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_refund_approved
    AFTER UPDATE ON public.package_refund_requests
    FOR EACH ROW
    WHEN (NEW.status = 'approved')
    EXECUTE FUNCTION handle_refund_approval();

-- ============================================================================
-- SAMPLE DATA (5-10 packages with realistic pricing)
-- ============================================================================

INSERT INTO public.packages (name_en, name_tr, package_type, price_cents, bonus_credits, bonus_description_en, bonus_description_tr, display_order, is_featured) VALUES
('Daily Starter', 'Günlük Başlangıç', 'daily', 299, 5, '+5 bonus image generations', '+5 bonus görsel oluşturma', 1, false),
('Weekly Basic', 'Haftalık Temel', 'weekly', 999, 20, '+20 bonus credits + Priority support', '+20 bonus kredi + Öncelikli destek', 2, false),
('Weekly Pro', 'Haftalık Pro', 'weekly', 1999, 50, '+50 bonus credits + Unlimited characters', '+50 bonus kredi + Sınırsız karakter', 3, true),
('Monthly Standard', 'Aylık Standart', 'monthly', 2999, 100, '+100 bonus credits + Ad-free experience', '+100 bonus kredi + Reklamız deneyim', 4, false),
('Monthly Premium', 'Aylık Premium', 'monthly', 4999, 200, '+200 bonus credits + All features unlocked', '+200 bonus kredi + Tüm özellikler açık', 5, true),
('Yearly Ultimate', 'Yıllık Ultimate', 'yearly', 49999, 3000, '+3000 bonus credits + Lifetime priority support', '+3000 bonus kredi + Ömür boyu öncelikli destek', 6, true);

-- Sample purchases (for testing analytics)
INSERT INTO public.package_purchases (user_id, package_id, amount_paid_cents, stripe_payment_intent_id, purchased_at)
SELECT 
    (SELECT id FROM auth.users LIMIT 1),
    id,
    price_cents,
    'pi_test_' || substr(md5(random()::text), 1, 16),
    now() - (random() * interval '30 days')
FROM public.packages
WHERE package_type IN ('weekly', 'monthly')
LIMIT 5;

-- =====================================================
-- PHASE 1: FOUNDATION (Enums & Utility Functions)
-- =====================================================

-- Content type enum for site_content table
CREATE TYPE CONTENT_TYPE AS ENUM (
    'search_box',
    'hero_section',
    'footer',
    'announcement',
    'custom'
);

-- Banner position enum
CREATE TYPE BANNER_POSITION AS ENUM (
    'hero',
    'sidebar',
    'footer',
    'popup'
);

-- Timestamp update function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 2: DDL (Tables & Indexes)
-- =====================================================

-- Site Content Management Table
CREATE TABLE IF NOT EXISTS public.site_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_key TEXT NOT NULL UNIQUE,
    content_type CONTENT_TYPE NOT NULL DEFAULT 'custom',
    title_en TEXT,
    title_tr TEXT,
    content_en TEXT,
    content_tr TEXT,
    placeholder_en TEXT,
    placeholder_tr TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.site_content IS 'Stores editable site content like search box text, hero sections, etc.';
COMMENT ON COLUMN public.site_content.content_key IS 'Unique identifier for content (e.g., main_search_box, hero_title)';
COMMENT ON COLUMN public.site_content.metadata IS 'Additional properties like size, color, styling in JSON format';

CREATE INDEX idx_site_content_content_key ON public.site_content(content_key);
CREATE INDEX idx_site_content_content_type ON public.site_content(content_type);
CREATE INDEX idx_site_content_is_active ON public.site_content(is_active);
CREATE INDEX idx_site_content_display_order ON public.site_content(display_order);

-- Banners/Sliders Table
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en TEXT,
    title_tr TEXT,
    description_en TEXT,
    description_tr TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    position BANNER_POSITION DEFAULT 'hero',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.banners IS 'Manages banner and slider images with scheduling and analytics';
COMMENT ON COLUMN public.banners.display_order IS 'Order in which banners appear (lower = first)';
COMMENT ON COLUMN public.banners.click_count IS 'Tracks banner engagement';

CREATE INDEX idx_banners_position ON public.banners(position);
CREATE INDEX idx_banners_is_active ON public.banners(is_active);
CREATE INDEX idx_banners_display_order ON public.banners(display_order);
CREATE INDEX idx_banners_start_date ON public.banners(start_date);
CREATE INDEX idx_banners_end_date ON public.banners(end_date);

-- Site Settings Table (Global Configuration)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description_en TEXT,
    description_tr TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.site_settings IS 'Global site configuration including free chat settings';
COMMENT ON COLUMN public.site_settings.is_public IS 'Whether this setting can be accessed by non-admin users';

CREATE INDEX idx_site_settings_setting_key ON public.site_settings(setting_key);
CREATE INDEX idx_site_settings_is_public ON public.site_settings(is_public);

-- =====================================================
-- PHASE 3: LOGIC (Helper Functions)
-- =====================================================

-- Function to get active banners by position
CREATE OR REPLACE FUNCTION get_active_banners(banner_pos BANNER_POSITION)
RETURNS TABLE (
    id UUID,
    title_en TEXT,
    title_tr TEXT,
    image_url TEXT,
    link_url TEXT,
    display_order INTEGER
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        id,
        title_en,
        title_tr,
        image_url,
        link_url,
        display_order
    FROM public.banners
    WHERE position = banner_pos
        AND is_active = true
        AND (start_date IS NULL OR start_date <= now())
        AND (end_date IS NULL OR end_date >= now())
    ORDER BY display_order ASC;
$$;

-- Function to increment banner click count
CREATE OR REPLACE FUNCTION increment_banner_clicks(banner_id UUID)
RETURNS VOID
LANGUAGE sql
AS $$
    UPDATE public.banners
    SET click_count = click_count + 1
    WHERE id = banner_id;
$$;

-- =====================================================
-- PHASE 4: SECURITY (RLS Policies)
-- =====================================================

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Site Content Policies
CREATE POLICY "Active content is viewable by everyone"
    ON public.site_content
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage all site content"
    ON public.site_content
    FOR ALL
    USING (has_role('admin'));

-- Banner Policies
CREATE POLICY "Active banners are viewable by everyone"
    ON public.banners
    FOR SELECT
    USING (
        is_active = true 
        AND (start_date IS NULL OR start_date <= now())
        AND (end_date IS NULL OR end_date >= now())
    );

CREATE POLICY "Admins can manage all banners"
    ON public.banners
    FOR ALL
    USING (has_role('admin'));

-- Site Settings Policies
CREATE POLICY "Public settings are viewable by everyone"
    ON public.site_settings
    FOR SELECT
    USING (is_public = true);

CREATE POLICY "Admins can manage all settings"
    ON public.site_settings
    FOR ALL
    USING (has_role('admin'));

-- =====================================================
-- PHASE 5: AUTOMATION (Triggers)
-- =====================================================

-- Timestamp triggers
CREATE TRIGGER update_site_content_updated_at
    BEFORE UPDATE ON public.site_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banners_updated_at
    BEFORE UPDATE ON public.banners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA (Default Content & Settings)
-- =====================================================

-- Default Search Box Content
INSERT INTO public.site_content (content_key, content_type, title_en, title_tr, placeholder_en, placeholder_tr, metadata) VALUES
('main_search_box', 'search_box', 'Find Your Perfect AI Character', 'Mükemmel AI Karakterini Bul', 'Search by name, occupation, or personality...', 'İsim, meslek veya kişilik ile ara...', '{"size": "large", "style": "modern"}'),
('hero_title', 'hero_section', 'Welcome to AI Character Hub', 'AI Karakter Merkezine Hoş Geldiniz', NULL, NULL, '{"fontSize": "48px", "fontWeight": "bold"}'),
('hero_subtitle', 'hero_section', 'Create, Chat, and Connect with AI Characters', 'AI Karakterler Oluştur, Sohbet Et ve Bağlan', NULL, NULL, '{"fontSize": "24px"}');

-- Default Banners
INSERT INTO public.banners (title_en, title_tr, description_en, description_tr, image_url, position, display_order, is_active) VALUES
('Welcome Banner', 'Hoş Geldiniz Banner', 'Discover amazing AI characters', 'Harika AI karakterleri keşfedin', 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg', 'hero', 1, true),
('Premium Features', 'Premium Özellikler', 'Unlock unlimited conversations', 'Sınırsız konuşmaların kilidini aç', 'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg', 'hero', 2, true),
('Create Your Character', 'Karakterini Oluştur', 'Build your perfect AI companion', 'Mükemmel AI arkadaşını oluştur', 'https://images.pexels.com/photos/8438918/pexels-photo-8438918.jpeg', 'hero', 3, true);

-- Free Chat Settings
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, description_en, description_tr, is_public) VALUES
('free_chat_enabled', 'true', 'boolean', 'Enable free chat feature', 'Ücretsiz sohbet özelliğini etkinleştir', true),
('free_chat_sms_verification', 'true', 'boolean', 'Require SMS verification for free chats', 'Ücretsiz sohbetler için SMS doğrulaması gerektir', false),
('free_chat_daily_limit', '10', 'number', 'Number of free chats per day', 'Günlük ücretsiz sohbet sayısı', true),
('free_chat_message_limit', '50', 'number', 'Message limit per free chat session', 'Ücretsiz sohbet oturumu başına mesaj limiti', true),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'Bakım modunu etkinleştir', true),
('announcement_text_en', 'Welcome to our platform!', 'string', 'Site-wide announcement (English)', 'Site geneli duyuru (İngilizce)', true),
('announcement_text_tr', 'Platformumuza hoş geldiniz!', 'string', 'Site-wide announcement (Turkish)', 'Site geneli duyuru (Türkçe)', true);

-- ============================================================================
-- PHASE 1: FOUNDATION (Enums & Utility Functions)
-- ============================================================================

-- Admin activity types
CREATE TYPE ADMIN_ACTION_TYPE AS ENUM (
    'login_success',
    'login_failed',
    'logout',
    'role_assigned',
    'role_revoked',
    'user_blocked',
    'user_unblocked',
    'settings_changed',
    'refund_approved',
    'refund_rejected',
    'package_created',
    'package_modified',
    'content_updated'
);

-- Two-factor authentication methods
CREATE TYPE TWO_FA_METHOD AS ENUM (
    'none',
    'totp',      -- Time-based One-Time Password (Google Authenticator, Authy)
    'sms',       -- SMS-based verification
    'email'      -- Email-based verification
);

-- ============================================================================
-- PHASE 2: DDL (Tables & Indexes)
-- ============================================================================

-- Admin Security Logs: Tracks all admin authentication and security events
CREATE TABLE public.admin_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,  -- References auth.users (admin)
    action_type ADMIN_ACTION_TYPE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    device_fingerprint TEXT,
    location_country TEXT,
    location_city TEXT,
    is_suspicious BOOLEAN DEFAULT false,
    suspicious_reason TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.admin_security_logs IS 'Comprehensive audit trail for admin authentication and security events';
COMMENT ON COLUMN public.admin_security_logs.device_fingerprint IS 'Browser/device fingerprint for fraud detection';
COMMENT ON COLUMN public.admin_security_logs.is_suspicious IS 'Flagged by automated security checks';

CREATE INDEX idx_admin_security_logs_admin_id ON public.admin_security_logs(admin_id);
CREATE INDEX idx_admin_security_logs_action_type ON public.admin_security_logs(action_type);
CREATE INDEX idx_admin_security_logs_created_at ON public.admin_security_logs(created_at DESC);
CREATE INDEX idx_admin_security_logs_is_suspicious ON public.admin_security_logs(is_suspicious) WHERE is_suspicious = true;
CREATE INDEX idx_admin_security_logs_ip_address ON public.admin_security_logs(ip_address);

-- Failed Login Attempts: Rate limiting and security monitoring
CREATE TABLE public.failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    device_fingerprint TEXT,
    attempt_count INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMPTZ DEFAULT now(),
    is_blocked BOOLEAN DEFAULT false,
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.failed_login_attempts IS 'Tracks failed login attempts for rate limiting and security';
COMMENT ON COLUMN public.failed_login_attempts.blocked_until IS 'Temporary block expiration time';

CREATE INDEX idx_failed_login_attempts_email ON public.failed_login_attempts(email);
CREATE INDEX idx_failed_login_attempts_ip_address ON public.failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_attempts_is_blocked ON public.failed_login_attempts(is_blocked) WHERE is_blocked = true;
CREATE INDEX idx_failed_login_attempts_last_attempt_at ON public.failed_login_attempts(last_attempt_at DESC);

-- Admin Activity Logs: Detailed audit trail for admin actions
CREATE TABLE public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,  -- References auth.users (admin)
    action_type ADMIN_ACTION_TYPE NOT NULL,
    target_user_id UUID,  -- User affected by the action
    target_resource_id UUID,  -- Resource affected (package, character, etc.)
    action_details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.admin_activity_logs IS 'Comprehensive audit trail for all admin actions in the system';
COMMENT ON COLUMN public.admin_activity_logs.action_details IS 'JSON object with action-specific details (before/after values, etc.)';

CREATE INDEX idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_action_type ON public.admin_activity_logs(action_type);
CREATE INDEX idx_admin_activity_logs_target_user_id ON public.admin_activity_logs(target_user_id);
CREATE INDEX idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);

-- Two-Factor Authentication Settings
CREATE TABLE public.admin_2fa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE,  -- References auth.users (admin)
    method TWO_FA_METHOD DEFAULT 'none',
    is_enabled BOOLEAN DEFAULT false,
    totp_secret TEXT,  -- Encrypted TOTP secret for authenticator apps
    backup_codes TEXT[],  -- Array of one-time backup codes
    phone_number TEXT,  -- For SMS verification
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.admin_2fa_settings IS 'Two-factor authentication configuration for admin accounts';
COMMENT ON COLUMN public.admin_2fa_settings.totp_secret IS 'Base32-encoded secret for TOTP (should be encrypted at application layer)';
COMMENT ON COLUMN public.admin_2fa_settings.backup_codes IS 'One-time use backup codes for account recovery';

CREATE INDEX idx_admin_2fa_settings_admin_id ON public.admin_2fa_settings(admin_id);
CREATE INDEX idx_admin_2fa_settings_is_enabled ON public.admin_2fa_settings(is_enabled) WHERE is_enabled = true;

-- Admin Sessions: Track active admin sessions
CREATE TABLE public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,  -- References auth.users (admin)
    session_token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    device_fingerprint TEXT,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.admin_sessions IS 'Tracks active admin sessions for security monitoring';

CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_session_token ON public.admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_is_active ON public.admin_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_admin_sessions_expires_at ON public.admin_sessions(expires_at);

-- ============================================================================
-- PHASE 3: LOGIC (Table-Dependent Functions)
-- ============================================================================

-- Enhanced role check supporting new admin roles
CREATE OR REPLACE FUNCTION public.has_role(_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = _role
  );
$$;

-- Check if user is any type of admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'support')
  );
$$;

-- Check if user is super admin (highest privilege)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  );
$$;

-- Log admin activity (called from application layer)
CREATE OR REPLACE FUNCTION public.log_admin_activity(
    _action_type ADMIN_ACTION_TYPE,
    _target_user_id UUID DEFAULT NULL,
    _target_resource_id UUID DEFAULT NULL,
    _action_details JSONB DEFAULT '{}'::jsonb,
    _ip_address TEXT DEFAULT NULL,
    _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _log_id UUID;
BEGIN
    INSERT INTO admin_activity_logs (
        admin_id,
        action_type,
        target_user_id,
        target_resource_id,
        action_details,
        ip_address,
        user_agent
    ) VALUES (
        auth.uid(),
        _action_type,
        _target_user_id,
        _target_resource_id,
        _action_details,
        _ip_address,
        _user_agent
    ) RETURNING id INTO _log_id;
    
    RETURN _log_id;
END;
$$;

-- Check if IP/device is suspicious based on patterns
CREATE OR REPLACE FUNCTION public.check_suspicious_login(
    _admin_id UUID,
    _ip_address TEXT,
    _device_fingerprint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _recent_ips TEXT[];
    _recent_devices TEXT[];
    _is_new_ip BOOLEAN;
    _is_new_device BOOLEAN;
BEGIN
    -- Get recent IPs and devices for this admin (last 30 days)
    SELECT 
        array_agg(DISTINCT ip_address),
        array_agg(DISTINCT device_fingerprint)
    INTO _recent_ips, _recent_devices
    FROM admin_security_logs
    WHERE admin_id = _admin_id
    AND created_at > now() - INTERVAL '30 days'
    AND action_type = 'login_success';
    
    -- Check if this is a new IP or device
    _is_new_ip := NOT (_ip_address = ANY(_recent_ips));
    _is_new_device := NOT (_device_fingerprint = ANY(_recent_devices));
    
    -- Flag as suspicious if both IP and device are new
    RETURN (_is_new_ip AND _is_new_device);
END;
$$;

-- ============================================================================
-- PHASE 4: SECURITY (RLS Policies)
-- ============================================================================

ALTER TABLE public.admin_security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_2fa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Admin Security Logs Policies
CREATE POLICY "Super admins can view all security logs"
ON public.admin_security_logs FOR SELECT
USING (is_super_admin());

CREATE POLICY "Admins can view own security logs"
ON public.admin_security_logs FOR SELECT
USING (auth.uid() = admin_id);

CREATE POLICY "System can insert security logs"
ON public.admin_security_logs FOR INSERT
WITH CHECK (true);

-- Failed Login Attempts Policies
CREATE POLICY "Admins can view all failed login attempts"
ON public.failed_login_attempts FOR SELECT
USING (is_admin());

CREATE POLICY "System can manage failed login attempts"
ON public.failed_login_attempts FOR ALL
WITH CHECK (true);

-- Admin Activity Logs Policies
CREATE POLICY "Super admins can view all activity logs"
ON public.admin_activity_logs FOR SELECT
USING (is_super_admin());

CREATE POLICY "Admins can view own activity logs"
ON public.admin_activity_logs FOR SELECT
USING (auth.uid() = admin_id);

CREATE POLICY "System can insert activity logs"
ON public.admin_activity_logs FOR INSERT
WITH CHECK (true);

-- 2FA Settings Policies
CREATE POLICY "Admins can view own 2FA settings"
ON public.admin_2fa_settings FOR SELECT
USING (auth.uid() = admin_id);

CREATE POLICY "Admins can update own 2FA settings"
ON public.admin_2fa_settings FOR ALL
USING (auth.uid() = admin_id);

CREATE POLICY "Super admins can view all 2FA settings"
ON public.admin_2fa_settings FOR SELECT
USING (is_super_admin());

-- Admin Sessions Policies
CREATE POLICY "Admins can view own sessions"
ON public.admin_sessions FOR SELECT
USING (auth.uid() = admin_id);

CREATE POLICY "Super admins can view all sessions"
ON public.admin_sessions FOR SELECT
USING (is_super_admin());

CREATE POLICY "System can manage sessions"
ON public.admin_sessions FOR ALL
WITH CHECK (true);

-- Update user_roles constraint to include new roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'super_admin', 'support', 'moderator', 'user'));

-- ============================================================================
-- PHASE 5: AUTOMATION (Triggers)
-- ============================================================================

-- Timestamp triggers for new tables
CREATE TRIGGER update_failed_login_attempts_updated_at
    BEFORE UPDATE ON public.failed_login_attempts
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_admin_2fa_settings_updated_at
    BEFORE UPDATE ON public.admin_2fa_settings
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Auto-cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE admin_sessions
    SET is_active = false
    WHERE expires_at < now()
    AND is_active = true;
    
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_cleanup_expired_sessions
    AFTER INSERT ON public.admin_sessions
    FOR EACH STATEMENT EXECUTE PROCEDURE cleanup_expired_admin_sessions();

-- ============================================================================
-- INITIAL DATA: Default Settings
-- ============================================================================

-- Insert default site settings for admin security
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, description_en, description_tr, is_public) VALUES
('admin_session_timeout_minutes', '60', 'number', 'Admin session timeout in minutes', 'Admin oturum zaman aşımı (dakika)', false),
('max_failed_login_attempts', '5', 'number', 'Maximum failed login attempts before temporary block', 'Geçici engelleme öncesi maksimum başarısız giriş denemesi', false),
('failed_login_block_duration_minutes', '30', 'number', 'Duration of temporary block after max failed attempts', 'Maksimum başarısız denemeden sonra geçici engelleme süresi', false),
('require_2fa_for_admins', 'false', 'boolean', 'Require two-factor authentication for all admin accounts', 'Tüm admin hesapları için iki faktörlü kimlik doğrulama zorunluluğu', false),
('suspicious_login_notification', 'true', 'boolean', 'Send notifications for suspicious login attempts', 'Şüpheli giriş denemeleri için bildirim gönder', false);


-- Add message counter column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_message_count 
ON public.conversations(message_count DESC);

-- Create trigger function to auto-increment message count
CREATE OR REPLACE FUNCTION increment_conversation_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only increment for user messages (not character responses)
    IF NEW.sender_type = 'user' THEN
        UPDATE conversations
        SET message_count = message_count + 1,
            updated_at = now()
        WHERE id = NEW.conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Attach trigger to messages table
DROP TRIGGER IF EXISTS on_message_created_increment_count ON public.messages;
CREATE TRIGGER on_message_created_increment_count
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_conversation_message_count();

-- Backfill existing message counts (one-time migration)
UPDATE public.conversations c
SET message_count = (
    SELECT COUNT(*)
    FROM public.messages m
    WHERE m.conversation_id = c.id
    AND m.sender_type = 'user'
);

-- Add comment for documentation
COMMENT ON COLUMN public.conversations.message_count IS 'Total number of messages sent by user to this character (auto-incremented via trigger)';

-- =====================================================
-- AUTOMATIC MESSAGE COUNTER TRIGGER
-- =====================================================
-- This trigger automatically increments message_count in conversations
-- ONLY when a user sends a message (not when character responds)

CREATE OR REPLACE FUNCTION increment_conversation_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only increment if the sender is a user (not character)
    IF NEW.sender_type = 'user' THEN
        UPDATE conversations
        SET 
            message_count = message_count + 1,
            last_message_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Attach trigger to messages table
DROP TRIGGER IF EXISTS on_user_message_sent ON public.messages;
CREATE TRIGGER on_user_message_sent
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_conversation_message_count();

-- =====================================================
-- HELPER FUNCTION: Get Message Count for Character
-- =====================================================
-- This function returns the total user messages sent to a specific character
-- Use this in your front-end to display the counter on character cards

CREATE OR REPLACE FUNCTION get_character_message_count(
    p_character_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(message_count, 0)
    FROM conversations
    WHERE character_id = p_character_id
      AND user_id = p_user_id
    LIMIT 1;
$$;

COMMENT ON FUNCTION get_character_message_count IS 'Returns the total number of messages a user has sent to a specific character';

-- =====================================================
-- VERIFICATION QUERY (For Testing)
-- =====================================================
-- Run this to verify the counter is working correctly:
-- 
-- SELECT 
--     c.id as conversation_id,
--     ch.name as character_name,
--     c.message_count as stored_count,
--     COUNT(m.id) FILTER (WHERE m.sender_type = 'user') as actual_user_messages
-- FROM conversations c
-- JOIN characters ch ON ch.id = c.character_id
-- LEFT JOIN messages m ON m.conversation_id = c.id
-- WHERE c.user_id = auth.uid()
-- GROUP BY c.id, ch.name, c.message_count;

-- ============================================================================
-- SMS COUNTER FIX: Auto-increment message_count for user messages only
-- ============================================================================

-- Function to increment message count only for user messages
CREATE OR REPLACE FUNCTION increment_conversation_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only increment if the message is from a user (not character)
    IF NEW.sender_type = 'user' THEN
        UPDATE conversations
        SET 
            message_count = message_count + 1,
            last_message_at = NEW.created_at,
            updated_at = now()
        WHERE id = NEW.conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION increment_conversation_message_count() IS 
'Automatically increments message_count in conversations table when user sends a message. Character messages are ignored.';

-- Drop existing trigger if it exists (to ensure clean installation)
DROP TRIGGER IF EXISTS trigger_increment_message_count ON public.messages;

-- Create trigger that fires after each message insert
CREATE TRIGGER trigger_increment_message_count
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_conversation_message_count();

COMMENT ON TRIGGER trigger_increment_message_count ON public.messages IS 
'Ensures message_count stays synchronized with actual user messages sent';

-- ============================================================================
-- MIGRATION: Fix existing message counts (one-time correction)
-- ============================================================================

-- Recalculate all existing message counts based on actual user messages
UPDATE conversations c
SET message_count = (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.conversation_id = c.id
    AND m.sender_type = 'user'
)
WHERE EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.conversation_id = c.id
);

-- ============================================================================
-- VERIFICATION QUERY (for testing)
-- ============================================================================

-- Run this query to verify counts are correct:
-- SELECT 
--     c.id,
--     c.message_count as stored_count,
--     (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_type = 'user') as actual_count
-- FROM conversations c
-- WHERE c.message_count != (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_type = 'user');
-- (Should return 0 rows if everything is correct)


-- ============================================================================
-- COUNTER SYNCHRONIZATION TRIGGERS
-- ============================================================================
-- Purpose: Auto-sync SMS, Like, and Favorite counters between tables
-- This ensures frontend always displays accurate counts from database
-- ============================================================================

-- ============================================================================
-- 1. SMS COUNTER TRIGGER (conversations.message_count)
-- ============================================================================
-- Increments message_count when user sends a message (sender_type = 'user')
-- Does NOT count character messages

CREATE OR REPLACE FUNCTION increment_conversation_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only count user messages, not character messages
    IF NEW.sender_type = 'user' THEN
        UPDATE conversations
        SET message_count = message_count + 1,
            last_message_at = NEW.created_at,
            updated_at = now()
        WHERE id = NEW.conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Attach trigger to messages table
DROP TRIGGER IF EXISTS on_user_message_sent ON public.messages;
CREATE TRIGGER on_user_message_sent
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_conversation_message_count();

COMMENT ON FUNCTION increment_conversation_message_count() IS 'Auto-increments message_count in conversations when user sends message';

-- ============================================================================
-- 2. LIKE COUNTER TRIGGERS (characters.likes_count)
-- ============================================================================
-- Syncs likes_count when users add/remove likes

CREATE OR REPLACE FUNCTION sync_character_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- User added a like
        UPDATE characters
        SET likes_count = likes_count + 1,
            updated_at = now()
        WHERE id = NEW.character_id;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- User removed a like
        UPDATE characters
        SET likes_count = GREATEST(likes_count - 1, 0),
            updated_at = now()
        WHERE id = OLD.character_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Attach triggers for INSERT and DELETE
DROP TRIGGER IF EXISTS on_like_added ON public.likes;
CREATE TRIGGER on_like_added
    AFTER INSERT ON public.likes
    FOR EACH ROW
    EXECUTE FUNCTION sync_character_likes_count();

DROP TRIGGER IF EXISTS on_like_removed ON public.likes;
CREATE TRIGGER on_like_removed
    AFTER DELETE ON public.likes
    FOR EACH ROW
    EXECUTE FUNCTION sync_character_likes_count();

COMMENT ON FUNCTION sync_character_likes_count() IS 'Auto-syncs likes_count in characters table when likes are added/removed';

-- ============================================================================
-- 3. FAVORITE COUNTER TRIGGERS (characters.favorites_count)
-- ============================================================================
-- Syncs favorites_count when users add/remove favorites

CREATE OR REPLACE FUNCTION sync_character_favorites_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- User added a favorite
        UPDATE characters
        SET favorites_count = favorites_count + 1,
            updated_at = now()
        WHERE id = NEW.character_id;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- User removed a favorite
        UPDATE characters
        SET favorites_count = GREATEST(favorites_count - 1, 0),
            updated_at = now()
        WHERE id = OLD.character_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Attach triggers for INSERT and DELETE
DROP TRIGGER IF EXISTS on_favorite_added ON public.favorites;
CREATE TRIGGER on_favorite_added
    AFTER INSERT ON public.favorites
    FOR EACH ROW
    EXECUTE FUNCTION sync_character_favorites_count();

DROP TRIGGER IF EXISTS on_favorite_removed ON public.favorites;
CREATE TRIGGER on_favorite_removed
    AFTER DELETE ON public.favorites
    FOR EACH ROW
    EXECUTE FUNCTION sync_character_favorites_count();

COMMENT ON FUNCTION sync_character_favorites_count() IS 'Auto-syncs favorites_count in characters table when favorites are added/removed';

-- ============================================================================
-- 4. HELPER FUNCTION: Get User's Message Count for a Character
-- ============================================================================
-- Frontend can call this to get SMS count for character cards

CREATE OR REPLACE FUNCTION get_user_message_count(p_character_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(c.message_count, 0)
    FROM conversations c
    WHERE c.user_id = auth.uid()
      AND c.character_id = p_character_id
    LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_message_count(UUID) IS 'Returns total messages sent by current user to specified character';

-- ============================================================================
-- 5. HELPER FUNCTION: Check if User Liked a Character
-- ============================================================================

CREATE OR REPLACE FUNCTION has_user_liked(p_character_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM likes
        WHERE user_id = auth.uid()
          AND character_id = p_character_id
    );
$$;

COMMENT ON FUNCTION has_user_liked(UUID) IS 'Returns true if current user has liked the character';

-- ============================================================================
-- 6. HELPER FUNCTION: Check if User Favorited a Character
-- ============================================================================

CREATE OR REPLACE FUNCTION has_user_favorited(p_character_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM favorites
        WHERE user_id = auth.uid()
          AND character_id = p_character_id
    );
$$;

COMMENT ON FUNCTION has_user_favorited(UUID) IS 'Returns true if current user has favorited the character';

-- ============================================================================
-- VERIFICATION QUERIES (For Testing)
-- ============================================================================
-- Run these to verify counters are working:

-- Check a character's counters:
-- SELECT id, likes_count, favorites_count FROM characters WHERE id = 'character-uuid';

-- Check a conversation's message count:
-- SELECT id, message_count FROM conversations WHERE user_id = auth.uid() AND character_id = 'character-uuid';

-- Check if user liked/favorited:
-- SELECT has_user_liked('character-uuid'), has_user_favorited('character-uuid');

-- =====================================================
-- PHASE 1: FOUNDATION (Enums & Types)
-- =====================================================

-- Drop existing character_type if it exists and recreate with all options
DROP TYPE IF EXISTS character_type CASCADE;
CREATE TYPE character_type AS ENUM ('human', 'ai', 'anime', 'animal', 'fantasy');

-- Create enum for speech length
CREATE TYPE speech_length AS ENUM ('short', 'medium', 'long');

-- Create enum for speech tone
CREATE TYPE speech_tone AS ENUM ('formal', 'informal', 'funny', 'harsh');

-- =====================================================
-- PHASE 2: DDL (Table Modifications)
-- =====================================================

-- Add new columns to characters table
ALTER TABLE public.characters 
  ADD COLUMN IF NOT EXISTS character_instructions TEXT,
  ADD COLUMN IF NOT EXISTS system_message TEXT,
  ADD COLUMN IF NOT EXISTS speech_length speech_length DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS speech_tone speech_tone DEFAULT 'informal',
  ADD COLUMN IF NOT EXISTS emoji_usage BOOLEAN DEFAULT false;

-- Add NOT NULL constraint to character_instructions (after adding column)
-- Note: Existing rows will need a default value first
UPDATE public.characters 
SET character_instructions = 'You are a helpful AI assistant. Respond naturally and professionally.'
WHERE character_instructions IS NULL;

ALTER TABLE public.characters 
  ALTER COLUMN character_instructions SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.characters.character_instructions IS 'Mandatory system prompt sent to AI with every message (hidden from user)';
COMMENT ON COLUMN public.characters.system_message IS 'Optional first welcome message shown when chat opens';
COMMENT ON COLUMN public.characters.speech_length IS 'Preferred response length: short, medium, or long';
COMMENT ON COLUMN public.characters.speech_tone IS 'Conversation tone: formal, informal, funny, or harsh';
COMMENT ON COLUMN public.characters.emoji_usage IS 'Whether character should use emojis in responses';

-- Create indexes for filtering by new fields
CREATE INDEX IF NOT EXISTS idx_characters_speech_settings 
  ON public.characters(speech_length, speech_tone) 
  WHERE deleted_at IS NULL;

-- =====================================================
-- PHASE 3: LOGIC (Helper Functions)
-- =====================================================

-- Function to get character display label based on type
CREATE OR REPLACE FUNCTION public.get_character_type_label(char_type character_type)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN char_type = 'human' THEN 'REAL HUMAN'
    WHEN char_type = 'ai' THEN 'ARTIFICIAL INTELLIGENCE'
    WHEN char_type = 'anime' THEN 'ARTIFICIAL INTELLIGENCE'
    WHEN char_type = 'animal' THEN 'ARTIFICIAL INTELLIGENCE'
    WHEN char_type = 'fantasy' THEN 'ARTIFICIAL INTELLIGENCE'
    ELSE 'ARTIFICIAL INTELLIGENCE'
  END;
$$;

COMMENT ON FUNCTION public.get_character_type_label IS 'Returns display label for character type (REAL HUMAN or ARTIFICIAL INTELLIGENCE)';

-- Function to build AI system prompt with behavior settings
CREATE OR REPLACE FUNCTION public.build_character_system_prompt(
  char_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base_instructions TEXT;
  length_instruction TEXT;
  tone_instruction TEXT;
  emoji_instruction TEXT;
  final_prompt TEXT;
BEGIN
  -- Get character data
  SELECT 
    character_instructions,
    CASE speech_length
      WHEN 'short' THEN 'Keep responses brief and concise (1-2 sentences).'
      WHEN 'medium' THEN 'Provide balanced responses (2-4 sentences).'
      WHEN 'long' THEN 'Give detailed, comprehensive responses (4+ sentences).'
    END,
    CASE speech_tone
      WHEN 'formal' THEN 'Use professional, formal language.'
      WHEN 'informal' THEN 'Use casual, friendly language.'
      WHEN 'funny' THEN 'Be humorous and entertaining.'
      WHEN 'harsh' THEN 'Be direct and blunt.'
    END,
    CASE 
      WHEN emoji_usage THEN 'Use emojis to express emotions.'
      ELSE 'Do not use emojis.'
    END
  INTO base_instructions, length_instruction, tone_instruction, emoji_instruction
  FROM public.characters
  WHERE id = char_id;

  -- Build final prompt
  final_prompt := base_instructions || E'\n\n' || 
                  'BEHAVIOR SETTINGS:' || E'\n' ||
                  '- ' || length_instruction || E'\n' ||
                  '- ' || tone_instruction || E'\n' ||
                  '- ' || emoji_instruction;

  RETURN final_prompt;
END;
$$;

COMMENT ON FUNCTION public.build_character_system_prompt IS 'Constructs complete AI system prompt including base instructions and behavior settings';

-- =====================================================
-- PHASE 4: SECURITY (RLS - Already enabled)
-- =====================================================
-- No changes needed - existing RLS policies cover new columns

-- =====================================================
-- PHASE 5: AUTOMATION (Triggers)
-- =====================================================

-- Trigger to validate character_instructions is not empty
CREATE OR REPLACE FUNCTION public.validate_character_instructions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.character_instructions IS NULL OR trim(NEW.character_instructions) = '' THEN
    RAISE EXCEPTION 'Character instructions cannot be empty';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_character_instructions_not_empty
  BEFORE INSERT OR UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_character_instructions();

COMMENT ON TRIGGER ensure_character_instructions_not_empty ON public.characters IS 'Ensures character_instructions field is never empty';

-- =====================================================
-- DATA MIGRATION
-- =====================================================

-- Update existing characters with default values for new fields
UPDATE public.characters
SET 
  speech_length = 'medium',
  speech_tone = 'informal',
  emoji_usage = false
WHERE speech_length IS NULL OR speech_tone IS NULL OR emoji_usage IS NULL;


-- ============================================================
-- PHASE 1: FOUNDATION — ENUMs and utility functions
-- ============================================================

DO $$ BEGIN
  CREATE TYPE QUOTA_TYPE AS ENUM ('sms', 'character_creation', 'file_upload');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE PACKAGE_TIER AS ENUM ('weekly', 'starter', 'plus_monthly', 'plus_yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- PHASE 2: DDL — Tables and Indexes
-- ============================================================

-- Package quota definitions: defines limits per package tier
CREATE TABLE IF NOT EXISTS public.package_quota_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_tier PACKAGE_TIER NOT NULL,
    sms_limit INTEGER NOT NULL DEFAULT 0,
    character_creation_limit INTEGER NOT NULL DEFAULT 0,
    daily_file_upload_limit INTEGER NOT NULL DEFAULT 0,
    total_file_upload_limit INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT package_quota_definitions_tier_key UNIQUE (package_tier)
);

COMMENT ON TABLE public.package_quota_definitions IS 'Defines quota limits for each package tier (weekly, starter, plus_monthly, plus_yearly)';
COMMENT ON COLUMN public.package_quota_definitions.sms_limit IS 'Total SMS (user messages) allowed per package period';
COMMENT ON COLUMN public.package_quota_definitions.character_creation_limit IS 'Total character creation slots allowed per package period';
COMMENT ON COLUMN public.package_quota_definitions.daily_file_upload_limit IS 'Maximum file uploads allowed per day';
COMMENT ON COLUMN public.package_quota_definitions.total_file_upload_limit IS 'Total file uploads allowed for the entire package period';

CREATE INDEX IF NOT EXISTS idx_package_quota_definitions_tier ON public.package_quota_definitions USING btree (package_tier);

-- User quotas: tracks each user's current quota usage per subscription period
CREATE TABLE IF NOT EXISTS public.user_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subscription_id UUID,
    package_tier PACKAGE_TIER NOT NULL,
    sms_used INTEGER NOT NULL DEFAULT 0,
    sms_limit INTEGER NOT NULL DEFAULT 0,
    character_creation_used INTEGER NOT NULL DEFAULT 0,
    character_creation_limit INTEGER NOT NULL DEFAULT 0,
    file_upload_used_today INTEGER NOT NULL DEFAULT 0,
    file_upload_daily_limit INTEGER NOT NULL DEFAULT 0,
    file_upload_total_used INTEGER NOT NULL DEFAULT 0,
    file_upload_total_limit INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    period_end TIMESTAMP WITH TIME ZONE,
    daily_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT user_quotas_user_id_active_key UNIQUE (user_id, is_active)
);

COMMENT ON TABLE public.user_quotas IS 'Tracks per-user quota usage for SMS, character creation, and file uploads based on active package';
COMMENT ON COLUMN public.user_quotas.sms_used IS 'Number of user-sent messages consumed this period';
COMMENT ON COLUMN public.user_quotas.file_upload_used_today IS 'File uploads used today (resets daily)';
COMMENT ON COLUMN public.user_quotas.daily_reset_at IS 'The date when daily_file_upload_used was last reset';
COMMENT ON COLUMN public.user_quotas.period_end IS 'When this quota period expires (matches subscription period end)';
COMMENT ON COLUMN public.user_quotas.is_active IS 'Only one active quota record per user at a time';

CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON public.user_quotas USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_subscription_id ON public.user_quotas USING btree (subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_is_active ON public.user_quotas USING btree (is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_user_quotas_period_end ON public.user_quotas USING btree (period_end);
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_active ON public.user_quotas USING btree (user_id, is_active);

-- ============================================================
-- PHASE 3: LOGIC — Table-dependent functions
-- ============================================================

-- Function: get active quota for a user
CREATE OR REPLACE FUNCTION public.get_user_active_quota(p_user_id UUID)
RETURNS public.user_quotas
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM public.user_quotas
  WHERE user_id = p_user_id
    AND is_active = true
  LIMIT 1;
$$;

-- Function: reset daily file upload counter if date has changed
CREATE OR REPLACE FUNCTION public.reset_daily_file_quota_if_needed(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_quotas
  SET
    file_upload_used_today = 0,
    daily_reset_at = CURRENT_DATE,
    updated_at = now()
  WHERE user_id = p_user_id
    AND is_active = true
    AND daily_reset_at < CURRENT_DATE;
END;
$$;

-- Function: decrement SMS quota (called when user sends a message)
CREATE OR REPLACE FUNCTION public.decrement_sms_quota(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota public.user_quotas;
  v_result JSONB;
BEGIN
  SELECT * INTO v_quota
  FROM public.user_quotas
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_active_quota');
  END IF;

  IF v_quota.sms_used >= v_quota.sms_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'sms_quota_exceeded', 'used', v_quota.sms_used, 'limit', v_quota.sms_limit);
  END IF;

  UPDATE public.user_quotas
  SET sms_used = sms_used + 1, updated_at = now()
  WHERE user_id = p_user_id AND is_active = true;

  RETURN jsonb_build_object('success', true, 'used', v_quota.sms_used + 1, 'limit', v_quota.sms_limit);
END;
$$;

-- Function: decrement character creation quota
CREATE OR REPLACE FUNCTION public.decrement_character_creation_quota(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota public.user_quotas;
BEGIN
  SELECT * INTO v_quota
  FROM public.user_quotas
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_active_quota');
  END IF;

  IF v_quota.character_creation_used >= v_quota.character_creation_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'character_quota_exceeded', 'used', v_quota.character_creation_used, 'limit', v_quota.character_creation_limit);
  END IF;

  UPDATE public.user_quotas
  SET character_creation_used = character_creation_used + 1, updated_at = now()
  WHERE user_id = p_user_id AND is_active = true;

  RETURN jsonb_build_object('success', true, 'used', v_quota.character_creation_used + 1, 'limit', v_quota.character_creation_limit);
END;
$$;

-- Function: decrement file upload quota (checks both daily and total limits)
CREATE OR REPLACE FUNCTION public.decrement_file_upload_quota(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota public.user_quotas;
BEGIN
  -- Reset daily counter if needed first
  PERFORM public.reset_daily_file_quota_if_needed(p_user_id);

  SELECT * INTO v_quota
  FROM public.user_quotas
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_active_quota');
  END IF;

  -- Check daily limit
  IF v_quota.file_upload_used_today >= v_quota.file_upload_daily_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'daily_file_quota_exceeded',
      'used_today', v_quota.file_upload_used_today,
      'daily_limit', v_quota.file_upload_daily_limit
    );
  END IF;

  -- Check total limit
  IF v_quota.file_upload_total_used >= v_quota.file_upload_total_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'total_file_quota_exceeded',
      'total_used', v_quota.file_upload_total_used,
      'total_limit', v_quota.file_upload_total_limit
    );
  END IF;

  UPDATE public.user_quotas
  SET
    file_upload_used_today = file_upload_used_today + 1,
    file_upload_total_used = file_upload_total_used + 1,
    updated_at = now()
  WHERE user_id = p_user_id AND is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'used_today', v_quota.file_upload_used_today + 1,
    'daily_limit', v_quota.file_upload_daily_limit,
    'total_used', v_quota.file_upload_total_used + 1,
    'total_limit', v_quota.file_upload_total_limit
  );
END;
$$;

-- Function: initialize or refresh user quota when subscription changes
CREATE OR REPLACE FUNCTION public.initialize_user_quota(
  p_user_id UUID,
  p_subscription_id UUID,
  p_package_tier PACKAGE_TIER,
  p_period_start TIMESTAMP WITH TIME ZONE,
  p_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS public.user_quotas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_definition public.package_quota_definitions;
  v_quota public.user_quotas;
BEGIN
  -- Get quota definition for this package tier
  SELECT * INTO v_definition
  FROM public.package_quota_definitions
  WHERE package_tier = p_package_tier;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No quota definition found for package tier: %', p_package_tier;
  END IF;

  -- Deactivate any existing active quota for this user
  UPDATE public.user_quotas
  SET is_active = false, updated_at = now()
  WHERE user_id = p_user_id AND is_active = true;

  -- Insert new active quota record
  INSERT INTO public.user_quotas (
    user_id,
    subscription_id,
    package_tier,
    sms_used,
    sms_limit,
    character_creation_used,
    character_creation_limit,
    file_upload_used_today,
    file_upload_daily_limit,
    file_upload_total_used,
    file_upload_total_limit,
    period_start,
    period_end,
    daily_reset_at,
    is_active
  ) VALUES (
    p_user_id,
    p_subscription_id,
    p_package_tier,
    0,
    v_definition.sms_limit,
    0,
    v_definition.character_creation_limit,
    0,
    v_definition.daily_file_upload_limit,
    0,
    v_definition.total_file_upload_limit,
    p_period_start,
    p_period_end,
    CURRENT_DATE,
    true
  )
  RETURNING * INTO v_quota;

  RETURN v_quota;
END;
$$;

-- ============================================================
-- PHASE 4: SECURITY — RLS Policies
-- ============================================================

ALTER TABLE public.package_quota_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

-- package_quota_definitions: readable by everyone, managed by admins
CREATE POLICY "Package quota definitions are viewable by everyone"
  ON public.package_quota_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage package quota definitions"
  ON public.package_quota_definitions FOR ALL
  USING (has_role('admin'::text));

-- user_quotas: users see own, admins see all
CREATE POLICY "Users can view own quotas"
  ON public.user_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user quotas"
  ON public.user_quotas FOR ALL
  USING (has_role('admin'::text));

CREATE POLICY "System can insert user quotas"
  ON public.user_quotas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update user quotas"
  ON public.user_quotas FOR UPDATE
  USING (true);

-- ============================================================
-- PHASE 5: TRIGGERS — Automation
-- ============================================================

-- Timestamp trigger for package_quota_definitions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_package_quota_definitions_updated_at ON public.package_quota_definitions;
CREATE TRIGGER update_package_quota_definitions_updated_at
    BEFORE UPDATE ON public.package_quota_definitions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_quotas_updated_at ON public.user_quotas;
CREATE TRIGGER update_user_quotas_updated_at
    BEFORE UPDATE ON public.user_quotas
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- SEED DATA — Package quota definitions
-- ============================================================

INSERT INTO public.package_quota_definitions
  (package_tier, sms_limit, character_creation_limit, daily_file_upload_limit, total_file_upload_limit)
VALUES
  ('weekly',       500,   2,   1,  7),
  ('starter',     1500,   7,   3,  90),
  ('plus_monthly', 3500,  15,   5, 150),
  ('plus_yearly', 50000, 200,  10, 3650)
ON CONFLICT (package_tier) DO UPDATE SET
  sms_limit                = EXCLUDED.sms_limit,
  character_creation_limit = EXCLUDED.character_creation_limit,
  daily_file_upload_limit  = EXCLUDED.daily_file_upload_limit,
  total_file_upload_limit  = EXCLUDED.total_file_upload_limit,
  updated_at               = now();

-- ============================================================
-- PHASE 1: FOUNDATION — Extend PACKAGE_TIER enum
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'free'
    AND enumtypid = 'PACKAGE_TIER'::regtype
  ) THEN
    ALTER TYPE PACKAGE_TIER ADD VALUE 'free';
  END IF;
END $$;

-- ============================================================
-- PHASE 2: DDL — Extend packages table + create user_daily_rewards
-- ============================================================

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS quota_tier        PACKAGE_TIER,
  ADD COLUMN IF NOT EXISTS original_price_cents    INTEGER,
  ADD COLUMN IF NOT EXISTS discounted_price_cents  INTEGER,
  ADD COLUMN IF NOT EXISTS discount_percentage     INTEGER,
  ADD COLUMN IF NOT EXISTS features                JSONB;

CREATE INDEX IF NOT EXISTS idx_packages_quota_tier
  ON public.packages(quota_tier);

-- user_daily_rewards: tracks per-user daily reward claims
CREATE TABLE IF NOT EXISTS public.user_daily_rewards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  reward_type TEXT        NOT NULL CHECK (reward_type IN ('video_watch', 'character_share')),
  reward_sms  INTEGER     NOT NULL,
  reward_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_user_reward_per_day
    UNIQUE (user_id, reward_type, reward_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_rewards_user_date
  ON public.user_daily_rewards(user_id, reward_date);

CREATE INDEX IF NOT EXISTS idx_user_daily_rewards_date
  ON public.user_daily_rewards(reward_date);

-- ============================================================
-- PHASE 3: SEED DATA — Quota definitions + packages
-- ============================================================

-- Free tier quota definition
INSERT INTO public.package_quota_definitions
  (package_tier, sms_limit, character_creation_limit,
   daily_file_upload_limit, total_file_upload_limit)
VALUES
  ('free', 10, 2, 0, 2)
ON CONFLICT (package_tier) DO NOTHING;

-- Hard delete all old packages
DELETE FROM public.packages;

-- Insert 5 new packages
INSERT INTO public.packages (
  name_en, name_tr, package_type, quota_tier,
  price_cents, original_price_cents, discounted_price_cents, discount_percentage,
  currency, bonus_credits, bonus_description_en, bonus_description_tr,
  features, display_order, is_active, is_featured
) VALUES

-- 1. Free
(
  'Free', 'Ücretsiz', 'daily', 'free',
  0, 0, 0, 0,
  'usd', 0, null, null,
  '{
    "en": [
      "10 free SMS per day",
      "Watch 30-sec video: +15 SMS (max 4/day → +60 SMS)",
      "Share character: +5 SMS (max 8/day → +40 SMS)",
      "Chat with all characters",
      "Upload images (2)",
      "Create characters (2)",
      "Short-term chat memory (daily)",
      "Creator Dashboard (limited)",
      "Normal reply"
    ],
    "tr": [
      "Günde 10 ücretsiz SMS",
      "30 saniyelik video izle: +15 SMS (günde maks 4 → +60 SMS)",
      "Karakter paylaş: +5 SMS (günde maks 8 → +40 SMS)",
      "Tüm karakterlerle sohbet et",
      "Görsel yükle (2)",
      "Karakter oluştur (2)",
      "Kısa süreli sohbet hafızası (günlük)",
      "Yaratıcı Paneli (sınırlı)",
      "Normal yanıt"
    ]
  }'::jsonb,
  1, true, false
),

-- 2. Weekly
(
  'Weekly', 'Haftalık', 'weekly', 'weekly',
  374, 499, 374, 25,
  'usd', 0, null, null,
  '{
    "en": [
      "Chat with all characters",
      "Create images",
      "Upload images",
      "Create characters (2)",
      "Advanced memory (remembers all chat history)",
      "Creator Dashboard",
      "1 page PDF/File per day Upload",
      "Quick response",
      "Ad-free"
    ],
    "tr": [
      "Tüm karakterlerle sohbet et",
      "Görsel oluştur",
      "Görsel yükle",
      "Karakter oluştur (2)",
      "Gelişmiş hafıza (tüm sohbet geçmişini hatırlar)",
      "Yaratıcı Paneli",
      "Günde 1 sayfa PDF/Dosya yükle",
      "Hızlı yanıt",
      "Reklamsız"
    ]
  }'::jsonb,
  2, true, false
),

-- 3. Starter
(
  'Starter', 'Başlangıç', 'monthly', 'starter',
  1124, 1499, 1124, 25,
  'usd', 0, null, null,
  '{
    "en": [
      "Chat with all characters",
      "Create images",
      "Upload images",
      "Create characters (7)",
      "Enhanced memory (remembers all chat history)",
      "Creator Dashboard",
      "Upload 3 pages of PDF/File daily",
      "Faster response",
      "Ad-free"
    ],
    "tr": [
      "Tüm karakterlerle sohbet et",
      "Görsel oluştur",
      "Görsel yükle",
      "Karakter oluştur (7)",
      "Gelişmiş hafıza (tüm sohbet geçmişini hatırlar)",
      "Yaratıcı Paneli",
      "Günde 3 sayfa PDF/Dosya yükle",
      "Daha hızlı yanıt",
      "Reklamsız"
    ]
  }'::jsonb,
  3, true, false
),

-- 4. Plus Monthly
(
  'Plus Monthly', 'Plus Aylık', 'monthly', 'plus_monthly',
  2249, 2999, 2249, 25,
  'usd', 0, null, null,
  '{
    "en": [
      "Chat with all characters",
      "Create images",
      "Upload images",
      "Create characters (15)",
      "Advanced memory (remembers all chat history)",
      "Creator Dashboard",
      "Upload 5 pages of PDF/File daily",
      "Premium response quality",
      "Priority support",
      "Ad-free"
    ],
    "tr": [
      "Tüm karakterlerle sohbet et",
      "Görsel oluştur",
      "Görsel yükle",
      "Karakter oluştur (15)",
      "Gelişmiş hafıza (tüm sohbet geçmişini hatırlar)",
      "Yaratıcı Paneli",
      "Günde 5 sayfa PDF/Dosya yükle",
      "Premium yanıt kalitesi",
      "Öncelikli destek",
      "Reklamsız"
    ]
  }'::jsonb,
  4, true, true
),

-- 5. Plus Yearly
(
  'Plus Yearly', 'Plus Yıllık', 'yearly', 'plus_yearly',
  26249, 34999, 26249, 25,
  'usd', 0, null, null,
  '{
    "en": [
      "Chat with all characters",
      "Create visuals",
      "Upload visuals",
      "Create characters (200)",
      "Advanced memory (remembers all chat history)",
      "Creator Dashboard",
      "Phone conversation with character (coming soon)",
      "Character-based visual generation (coming soon)",
      "Upload 10 pages of PDF/File daily",
      "Premium response quality",
      "Priority support",
      "Ad-free"
    ],
    "tr": [
      "Tüm karakterlerle sohbet et",
      "Görsel oluştur",
      "Görsel yükle",
      "Karakter oluştur (200)",
      "Gelişmiş hafıza (tüm sohbet geçmişini hatırlar)",
      "Yaratıcı Paneli",
      "Karakter ile telefon görüşmesi (yakında)",
      "Karakter tabanlı görsel oluşturma (yakında)",
      "Günde 10 sayfa PDF/Dosya yükle",
      "Premium yanıt kalitesi",
      "Öncelikli destek",
      "Reklamsız"
    ]
  }'::jsonb,
  5, true, true
);

-- ============================================================
-- PHASE 4: SECURITY — RLS for user_daily_rewards
-- ============================================================

ALTER TABLE public.user_daily_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily rewards"
  ON public.user_daily_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert daily rewards"
  ON public.user_daily_rewards FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all daily rewards"
  ON public.user_daily_rewards FOR ALL
  USING (has_role('admin'::text));

-- ============================================================
-- PHASE 5: TRIGGERS — Updated handle_new_user
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_quota_def RECORD;
BEGIN
  -- 1. Create profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Initialize user_credits
  INSERT INTO public.user_credits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 4. Auto-assign Free package quota
  SELECT * INTO v_quota_def
  FROM public.package_quota_definitions
  WHERE package_tier = 'free';

  IF FOUND THEN
    INSERT INTO public.user_quotas (
      user_id,
      subscription_id,
      package_tier,
      sms_used,
      sms_limit,
      character_creation_used,
      character_creation_limit,
      file_upload_used_today,
      file_upload_daily_limit,
      file_upload_total_used,
      file_upload_total_limit,
      period_start,
      period_end,
      daily_reset_at,
      is_active
    ) VALUES (
      NEW.id,
      null,
      'free',
      0,
      v_quota_def.sms_limit,
      0,
      v_quota_def.character_creation_limit,
      0,
      v_quota_def.daily_file_upload_limit,
      0,
      v_quota_def.total_file_upload_limit,
      now(),
      null,
      CURRENT_DATE,
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached (recreate if needed)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Timestamp trigger for user_daily_rewards
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_daily_rewards_updated_at ON public.user_daily_rewards;

CREATE TRIGGER update_user_daily_rewards_updated_at
  BEFORE UPDATE ON public.user_daily_rewards
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
