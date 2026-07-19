-- Staff must be able to inspect reported comments regardless of social block
-- relationships, while reporters should not open duplicate profile cases.

create policy "profile_comments_staff_read"
  on public.profile_comments for select to authenticated
  using ((select private.is_moderator()));

create unique index reports_one_open_profile_idx
  on public.reports(reporter_id, target_profile_id)
  where content_type = 'PROFILE'
    and status in ('OPEN', 'REVIEWING');
