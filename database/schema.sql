-- =============================================
-- uloggd Database Schema
-- =============================================
-- Este arquivo contém a estrutura completa do banco de dados.
-- Execute no SQL Editor do Supabase para replicar o banco.
-- =============================================

-- =============================================
-- ENUMS & TYPES
-- =============================================

-- Não é necessário criar tipos separados pois usamos CHECK constraints

-- =============================================
-- TABLES
-- =============================================

-- Users (base profile table)
CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL UNIQUE,
  is_moderator boolean DEFAULT false,
  banner text,
  bio text DEFAULT 'Olá 👋, estou usando o uloggd!'::text,
  thinking text,
  avatar_decoration text,
  avatar text,
  pronoun text,
  last_seen timestamp with time zone DEFAULT now(),
  status text DEFAULT 'offline'::text,
  username_changed_at timestamp with time zone,
  username text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Badges
CREATE TABLE public.badges (
  id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text,
  description text,
  icon_url text,
  color text,
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);

-- User Badges (junction table)
CREATE TABLE public.user_badges (
  user_id uuid NOT NULL,
  badge_id text NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (user_id, badge_id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
  CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE
);

-- Follows
CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT follows_pkey PRIMARY KEY (id),
  CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT follows_no_self_follow CHECK (follower_id != following_id)
);

-- Reviews (game logs)
CREATE TABLE public.reviews (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  title text,
  game_slug text NOT NULL,
  played_platform_id numeric,
  user_id uuid NOT NULL,
  review text,
  status text DEFAULT 'completed'::text,
  mastered boolean DEFAULT false,
  liked boolean DEFAULT false,
  replay boolean DEFAULT false,
  contain_spoilers boolean DEFAULT false,
  playing boolean DEFAULT false,
  backlog boolean DEFAULT false,
  wishlist boolean DEFAULT false,
  hours_played numeric,
  minutes_played numeric,
  rating numeric,
  rating_mode text,
  started_on date,
  finished_on date,
  game_id numeric NOT NULL,
  platform_id numeric,
  aspect_ratings jsonb,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- Review Likes
CREATE TABLE public.review_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  review_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT review_likes_pkey PRIMARY KEY (id),
  CONSTRAINT review_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
  CONSTRAINT review_likes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE,
  CONSTRAINT review_likes_unique UNIQUE (user_id, review_id)
);

-- Lists
CREATE TABLE public.lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  ranked boolean DEFAULT true,
  CONSTRAINT lists_pkey PRIMARY KEY (id),
  CONSTRAINT lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- List Items
CREATE TABLE public.list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL,
  game_id integer NOT NULL,
  game_slug text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  note text,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT list_items_pkey PRIMARY KEY (id),
  CONSTRAINT list_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE,
  CONSTRAINT list_items_unique UNIQUE (list_id, game_id)
);

-- User Games (collection status)
CREATE TABLE public.user_games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id integer NOT NULL,
  game_slug text NOT NULL,
  status text CHECK (status = ANY (ARRAY['played'::text, 'completed'::text, 'retired'::text, 'shelved'::text, 'abandoned'::text])),
  playing boolean DEFAULT false,
  backlog boolean DEFAULT false,
  wishlist boolean DEFAULT false,
  liked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_games_pkey PRIMARY KEY (id),
  CONSTRAINT user_games_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
  CONSTRAINT user_games_unique UNIQUE (user_id, game_id)
);

-- Import Jobs
CREATE TABLE public.import_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'backloggd'::text,
  source_username text NOT NULL,
  status text NOT NULL DEFAULT 'scraping'::text CHECK (status = ANY (ARRAY['scraping'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])),
  games_data jsonb DEFAULT '[]'::jsonb,
  total integer NOT NULL DEFAULT 0,
  progress integer NOT NULL DEFAULT 0,
  imported integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamp with time zone DEFAULT now(),
  finished_at timestamp with time zone,
  CONSTRAINT import_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT import_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- User Connections (OAuth/social links)
CREATE TABLE public.user_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  provider_username text,
  provider_display_name text,
  provider_avatar_url text,
  connected_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_connections_pkey PRIMARY KEY (id),
  CONSTRAINT user_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
  CONSTRAINT user_connections_unique UNIQUE (user_id, provider)
);

-- =============================================
-- INDEXES
-- =============================================

-- Users
CREATE INDEX idx_users_user_id ON public.users(user_id);
CREATE INDEX idx_users_username ON public.users(username);

-- Follows
CREATE INDEX idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX idx_follows_following_id ON public.follows(following_id);

-- Reviews
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_game_id ON public.reviews(game_id);
CREATE INDEX idx_reviews_game_slug ON public.reviews(game_slug);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- Review Likes
CREATE INDEX idx_review_likes_user_id ON public.review_likes(user_id);
CREATE INDEX idx_review_likes_review_id ON public.review_likes(review_id);

-- Lists
CREATE INDEX idx_lists_user_id ON public.lists(user_id);
CREATE INDEX idx_lists_is_public ON public.lists(is_public);

-- List Items
CREATE INDEX idx_list_items_list_id ON public.list_items(list_id);
CREATE INDEX idx_list_items_game_id ON public.list_items(game_id);

-- User Games
CREATE INDEX idx_user_games_user_id ON public.user_games(user_id);
CREATE INDEX idx_user_games_game_id ON public.user_games(game_id);

-- Notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-criar perfil quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (user_id, username, avatar, bio)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'Olá 👋, estou usando o uloggd!'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

CREATE TRIGGER on_reviews_updated
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_lists_updated
  BEFORE UPDATE ON public.lists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_user_games_updated
  BEFORE UPDATE ON public.user_games
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_user_connections_updated
  BEFORE UPDATE ON public.user_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Usuários são públicos"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON public.users FOR UPDATE
  USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Follows são públicos"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem seguir outros"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Usuários podem deixar de seguir"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Reviews policies
CREATE POLICY "Reviews são públicos"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem criar reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar próprios reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprios reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Review Likes policies
CREATE POLICY "Likes são públicos"
  ON public.review_likes FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem dar like"
  ON public.review_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem remover próprio like"
  ON public.review_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Lists policies
CREATE POLICY "Listas públicas são visíveis"
  ON public.lists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Usuários podem criar listas"
  ON public.lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar próprias listas"
  ON public.lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprias listas"
  ON public.lists FOR DELETE
  USING (auth.uid() = user_id);

-- List Items policies
CREATE POLICY "Items de listas públicas são visíveis"
  ON public.list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id
      AND (lists.is_public = true OR lists.user_id = auth.uid())
    )
  );

CREATE POLICY "Donos de listas podem adicionar items"
  ON public.list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Donos de listas podem editar items"
  ON public.list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Donos de listas podem deletar items"
  ON public.list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- User Games policies
CREATE POLICY "Coleções de jogos são públicas"
  ON public.user_games FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem adicionar jogos"
  ON public.user_games FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar próprios jogos"
  ON public.user_games FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem remover jogos"
  ON public.user_games FOR DELETE
  USING (auth.uid() = user_id);

-- Import Jobs policies
CREATE POLICY "Usuários veem próprios imports"
  ON public.import_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar imports"
  ON public.import_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem cancelar próprios imports"
  ON public.import_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Usuários veem próprias notificações"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem marcar notificações como lidas"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- User Connections policies
CREATE POLICY "Usuários veem próprias conexões"
  ON public.user_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem adicionar conexões"
  ON public.user_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem remover conexões"
  ON public.user_connections FOR DELETE
  USING (auth.uid() = user_id);

-- User Badges policies
CREATE POLICY "Badges de usuários são públicos"
  ON public.user_badges FOR SELECT
  USING (true);

-- Badges são públicos (read-only para usuários normais)
CREATE POLICY "Badges são públicos"
  ON public.badges FOR SELECT
  USING (true);

-- =============================================
-- GRANTS
-- =============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
