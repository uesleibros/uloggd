-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.badges (
  id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text,
  description text,
  icon_url text,
  color text,
  category text DEFAULT 'community'::text,
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text NOT NULL,
  delete_content boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  unbanned_at timestamp with time zone,
  unbanned_by uuid,
  expires_at timestamp with time zone,
  CONSTRAINT bans_pkey PRIMARY KEY (id),
  CONSTRAINT bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT bans_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.users(user_id),
  CONSTRAINT bans_unbanned_by_fkey FOREIGN KEY (unbanned_by) REFERENCES public.users(user_id)
);
CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT follows_pkey PRIMARY KEY (id),
  CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id),
  CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES auth.users(id)
);
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
  CONSTRAINT import_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL,
  game_id integer NOT NULL,
  game_slug text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  note text,
  added_at timestamp with time zone DEFAULT now(),
  marked boolean NOT NULL DEFAULT false,
  CONSTRAINT list_items_pkey PRIMARY KEY (id),
  CONSTRAINT list_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id)
);
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
  CONSTRAINT lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  dedupe_hash text,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.review_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  review_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT review_likes_pkey PRIMARY KEY (id),
  CONSTRAINT log_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT log_likes_log_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id)
);
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
  CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.tierlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL,
  game_id integer NOT NULL,
  game_slug text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  CONSTRAINT tierlist_items_pkey PRIMARY KEY (id),
  CONSTRAINT tierlist_items_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.tierlist_tiers(id)
);
CREATE TABLE public.tierlist_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tierlist_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'S'::text,
  color text NOT NULL DEFAULT '#ef4444'::text,
  position integer NOT NULL DEFAULT 0,
  CONSTRAINT tierlist_tiers_pkey PRIMARY KEY (id),
  CONSTRAINT tierlist_tiers_tierlist_id_fkey FOREIGN KEY (tierlist_id) REFERENCES public.tierlists(id)
);
CREATE TABLE public.tierlists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tierlists_pkey PRIMARY KEY (id),
  CONSTRAINT tierlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.user_badges (
  user_id uuid NOT NULL,
  badge_id text NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (user_id, badge_id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id)
);
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
  CONSTRAINT user_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
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
  CONSTRAINT user_games_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
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
  is_banned boolean DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT users_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.verification_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT verification_requests_pkey PRIMARY KEY (id),
  CONSTRAINT verification_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT verification_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id)
);