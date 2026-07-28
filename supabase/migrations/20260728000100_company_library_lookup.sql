-- Company pages fetch a small, known set of IGDB ids for one profile. Keeping
-- the card state in the index makes this an index-only lookup as libraries grow.
create index if not exists user_games_profile_igdb_card_state_idx
  on public.user_games (profile_id, igdb_id)
  include (
    status,
    playing,
    backlog,
    wishlist,
    liked,
    quick_rating,
    custom_cover_url
  );
