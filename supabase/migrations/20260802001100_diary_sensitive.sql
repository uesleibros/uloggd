-- Journal sessions can carry images, so they can be marked sensitive too.
--
-- The screenshot studio grew the check first, but a session is the other place
-- someone uploads a picture here, and the gallery on an entry is as public as
-- a screenshot page. Leaving one path checked and the other open would just
-- move where anything unwanted gets posted.
--
-- Same shape as `screenshots`: `sensitive` covers the images until the reader
-- asks, `sensitive_detected` records that the browser check set it rather than
-- the author. The second is not the author's to rewrite, so a false positive
-- stays distinguishable from a deliberate mark.

alter table public.diary_entries
  add column if not exists sensitive boolean not null default false,
  add column if not exists sensitive_detected boolean not null default false;

grant select (sensitive, sensitive_detected) on public.diary_entries to anon, authenticated;
grant insert (sensitive, sensitive_detected) on public.diary_entries to authenticated;

-- A table-level UPDATE grant supersedes a column revoke, which is how the
-- equivalent on `screenshots` silently did nothing. Revoke the table, then
-- grant back exactly what an author edits about their own entry.
revoke update on public.diary_entries from authenticated;
grant update (
  note,
  played_on,
  ended_on,
  started_at,
  minutes,
  marks_start,
  marks_finish,
  contains_spoilers,
  sensitive,
  visibility,
  comments_scope,
  journey_id,
  updated_at
) on public.diary_entries to authenticated;

comment on column public.diary_entries.sensitive is
  'Cover the entry images until the reader asks for them. Separate from contains_spoilers, which is about a story rather than about who should see the pictures.';
