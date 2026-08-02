-- Sets the sensitive flag on a session, and remembers when the check set it.
--
-- Sessions are written through `save_diary_entry` and `update_diary_entry`,
-- which are definer functions with fixed signatures, so the flag cannot ride
-- along with the save without rewriting both. This is called after, and only
-- when there is something to record.
--
-- Definer for one reason: `sensitive_detected` must not be clearable by the
-- author, or a false positive stops being distinguishable from a deliberate
-- mark the moment someone edits their entry. The flag itself is theirs to move
-- freely; the record of who set it only ever goes from false to true.

create or replace function public.mark_diary_sensitive(
  entry uuid,
  value boolean,
  detected boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.diary_entries
     set sensitive = value,
         -- Never unset. Turning the flag off after an automatic mark leaves
         -- the record standing, which is what makes an override reviewable.
         sensitive_detected = sensitive_detected or detected
   where id = entry
     and profile_id = auth.uid();

  if not found then
    raise exception 'entry not found' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.mark_diary_sensitive(uuid, boolean, boolean) from public, anon;
grant execute on function public.mark_diary_sensitive(uuid, boolean, boolean) to authenticated;
