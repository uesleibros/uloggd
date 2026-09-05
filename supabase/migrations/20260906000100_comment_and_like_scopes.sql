-- Replies and likes become things a key can be given.
--
-- The constraint is a whitelist rather than a format check, so a scope that
-- does not exist here cannot be stored by any path. Widening it is therefore
-- the only way to add one, and doing it in a migration is what keeps the
-- database's list and the routes' list from drifting apart quietly.
--
-- Liking is separate from replying on purpose. They are not the same act: one
-- leaves words under somebody's name and the other does not, and an
-- integration that only needs to count what it liked should not be able to
-- speak as its owner.

alter table public.api_keys
  drop constraint if exists api_keys_scopes_known;

alter table public.api_keys
  add constraint api_keys_scopes_known check (
    scopes <@ array[
      'profile.read', 'profile.write',
      'library.read', 'library.write',
      'reviews.read', 'reviews.write',
      'journal.read', 'journal.write',
      'lists.read', 'lists.write',
      'screenshots.read', 'screenshots.write',
      'social.read', 'social.write',
      'comments.read', 'comments.write',
      'likes.write',
      'catalog.read'
    ]::text[]
  );
