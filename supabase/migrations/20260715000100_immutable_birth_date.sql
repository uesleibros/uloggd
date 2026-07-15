alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists age_assurance_method text,
  add column if not exists age_assured_at timestamptz(6),
  add constraint profiles_birth_date_range_check check (
    birth_date is null or (
      birth_date <= current_date - interval '12 years'
      and birth_date >= current_date - interval '120 years'
    )
  ),
  add constraint profiles_age_assurance_method_check check (
    age_assurance_method is null or age_assurance_method in ('self_declared')
  );

create or replace function public.prevent_birth_date_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.birth_date is null and new.birth_date is null and (
    new.age_assurance_method is not null or new.age_assured_at is not null
  ) then
    raise exception 'age assurance requires a birth date' using errcode = '22023';
  end if;
  if old.birth_date is null and new.birth_date is not null and (
    new.age_assurance_method is distinct from 'self_declared'
    or new.age_assured_at is null
  ) then
    raise exception 'invalid age assurance record' using errcode = '22023';
  end if;
  if old.birth_date is not null and (
    new.birth_date is distinct from old.birth_date
    or new.age_assurance_method is distinct from old.age_assurance_method
    or new.age_assured_at is distinct from old.age_assured_at
  ) then
    raise exception 'birth date is immutable' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_birth_date_immutable on public.profiles;
create trigger profiles_birth_date_immutable
  before update of birth_date, age_assurance_method, age_assured_at on public.profiles
  for each row execute function public.prevent_birth_date_change();

create or replace function public.set_birth_date(candidate date)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare result date;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if candidate is null
    or candidate > current_date - interval '12 years'
    or candidate < current_date - interval '120 years' then
    raise exception 'invalid birth date' using errcode = '22023';
  end if;

  update public.profiles
  set
    birth_date = candidate,
    age_assurance_method = 'self_declared',
    age_assured_at = now(),
    updated_at = now()
  where id = auth.uid() and birth_date is null
  returning birth_date into result;

  if result is null then
    raise exception 'profile missing or birth date already set' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

revoke all on function public.set_birth_date(date) from public, anon;
grant execute on function public.set_birth_date(date) to authenticated;
