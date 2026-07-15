create or replace function private.require_mfa_for_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
    and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
    and exists (
      select 1
      from auth.mfa_factors
      where user_id = auth.uid()
        and status = 'verified'
    )
  then
    raise exception 'second factor required'
      using errcode = '42501', hint = 'Complete MFA verification before changing account data.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.require_mfa_for_mutation() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'user_games',
    'reviews',
    'diary_entries',
    'game_lists',
    'game_list_items',
    'follows',
    'blocks',
    'reports',
    'verification_requests'
  ]
  loop
    execute format('drop trigger if exists require_mfa_for_mutation on public.%I', table_name);
    execute format(
      'create trigger require_mfa_for_mutation before insert or update or delete on public.%I for each row execute function private.require_mfa_for_mutation()',
      table_name
    );
  end loop;
end;
$$;
