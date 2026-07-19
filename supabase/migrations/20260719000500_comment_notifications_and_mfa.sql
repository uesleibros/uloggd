-- Complete the safety contract for profile comments.

alter table public.notification_preferences
  add column if not exists comments_enabled boolean not null default true;

alter table public.notifications
  drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
    check (kind in ('follow', 'review_like', 'list_like', 'profile_comment'));

create or replace function public.notification_preference_enabled(
  owner_id uuid,
  preference_kind text
) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case preference_kind
    when 'follow' then coalesce(p.follows_enabled, true)
    when 'review_like' then coalesce(p.review_likes_enabled, true)
    when 'list_like' then coalesce(p.list_likes_enabled, true)
    when 'profile_comment' then coalesce(p.comments_enabled, true)
    else false
  end
  from (select 1) seed
  left join public.notification_preferences p on p.profile_id = owner_id
$$;

create function public.notify_profile_comment_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.author_id <> new.profile_id
    and public.notification_preference_enabled(new.profile_id, 'profile_comment')
  then
    insert into public.notifications(
      recipient_id, actor_id, kind, target_id, target_title
    ) values (
      new.profile_id, new.author_id, 'profile_comment', new.id,
      left(new.body, 80)
    )
    on conflict (recipient_id, actor_id, kind, target_id)
      do update set created_at = excluded.created_at, read_at = null;
  end if;
  return new;
end;
$$;

create trigger profile_comments_notification_activity
after insert on public.profile_comments
for each row execute function public.notify_profile_comment_activity();

create trigger require_mfa_for_mutation
before insert or update or delete on public.profile_comments
for each row execute function private.require_mfa_for_mutation();

revoke all on function public.notify_profile_comment_activity()
  from public, anon, authenticated;
