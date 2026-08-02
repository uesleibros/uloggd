-- Screenshots can be marked as sensitive, and say who marked them.
--
-- The site had one gate on an image, `contains_spoilers`, and it is the wrong
-- one for this: a spoiler warning is a courtesy about a story and a sensitive
-- warning is about who should be seeing the picture at all. Sharing a column
-- would mean anyone clicking through a plot detail also opts into everything
-- else behind it.
--
-- `sensitive_detected` records that the check flagged it rather than the person
-- did. It exists because the two need to be told apart later: a false positive
-- from an automatic check is a different thing to review than a deliberate
-- mark, and a moderator seeing only a boolean cannot tell which they have.
--
-- Worth being plain about what this is not. The detection runs in the browser,
-- and anything a browser decides can be skipped by not using the browser: the
-- upload endpoint can be called directly. This raises the floor for honest
-- uploads and gives moderation a signal. It is not an enforcement boundary,
-- and the reporting and moderation paths remain the thing that is.

alter table public.screenshots
  add column if not exists sensitive boolean not null default false,
  add column if not exists sensitive_detected boolean not null default false;

-- Readers need it to know whether to cover the image; writers set it on their
-- own rows, which the existing row-level policies already scope.
grant select (sensitive, sensitive_detected) on public.screenshots to anon, authenticated;
grant insert (sensitive, sensitive_detected) on public.screenshots to authenticated;
grant update (sensitive) on public.screenshots to authenticated;

-- Deliberately not granted for update: an automatic flag is a record of what
-- the check said, and letting the author rewrite it would leave nothing to
-- compare a complaint against.
revoke update (sensitive_detected) on public.screenshots from authenticated;

comment on column public.screenshots.sensitive is
  'Cover the image until the viewer asks for it. Separate from contains_spoilers, which is about a story rather than about who should see the picture.';
comment on column public.screenshots.sensitive_detected is
  'The automatic check set this, not the author. Read-only to the author so a false positive stays distinguishable from a deliberate mark.';
