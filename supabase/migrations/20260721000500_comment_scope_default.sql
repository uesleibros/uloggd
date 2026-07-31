-- profile_comment_scope nasceu com default 'FOLLOWERS', então quase todo
-- perfil do site acabou em "apenas seguidores" sem ninguém ter escolhido isso:
-- 15 de 16 perfis. Na prática, responder a um comentário falhava para qualquer
-- pessoa que não seguisse o dono do perfil. O content_comment_scope, criado
-- depois para listas e reviews, já nasceu em 'EVERYONE', eram duas
-- configurações irmãs com defaults opostos.

alter table public.profiles
  alter column profile_comment_scope set default 'EVERYONE';

-- Só quem está no valor herdado. 'NOBODY' nunca foi default, então quem está
-- lá escolheu de verdade e continua como está.
update public.profiles
  set profile_comment_scope = 'EVERYONE'
  where profile_comment_scope = 'FOLLOWERS';

-- Com 'NOBODY' a guarda de dono ficou de fora, então o próprio dono não
-- conseguia comentar no próprio perfil, que é justamente o único caso que
-- deveria continuar valendo. Em create_content_comment isso já está certo.
create or replace function public.create_profile_comment(
  target_profile uuid,
  comment_body text,
  parent_comment uuid default null
)
returns public.profile_comments
language plpgsql security definer set search_path = ''
as $$
declare target_scope text;
declare result public.profile_comments;
declare clean_body text;
declare parent_row public.profile_comments;
declare thread_depth integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  clean_body := trim(comment_body);
  if char_length(clean_body) not between 1 and 500 or clean_body ~ '[[:cntrl:]]' then
    raise exception 'invalid comment' using errcode = '22023';
  end if;
  if public.users_blocked(auth.uid(), target_profile) then
    raise exception 'interaction unavailable' using errcode = '42501';
  end if;
  select profile_comment_scope into target_scope
  from public.profiles where id = target_profile;
  if target_scope is null then raise exception 'profile not found' using errcode = 'P0002'; end if;
  if auth.uid() <> target_profile and (
    target_scope = 'NOBODY'
    or (target_scope = 'FOLLOWERS' and not exists(
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = target_profile
    ))
  ) then raise exception 'comments unavailable' using errcode = '42501'; end if;

  if parent_comment is not null then
    select * into parent_row from public.profile_comments
    where id = parent_comment and profile_id = target_profile;
    if parent_row.id is null then
      raise exception 'parent comment not found' using errcode = 'P0002';
    end if;
    if parent_row.deleted_at is not null then
      raise exception 'parent comment removed' using errcode = 'P0002';
    end if;
    with recursive ancestors as (
      select id, parent_id, 1 as depth
      from public.profile_comments where id = parent_comment
      union all
      select parent.id, parent.parent_id, ancestors.depth + 1
      from public.profile_comments parent
      join ancestors on parent.id = ancestors.parent_id
      where ancestors.depth < 8
    )
    select max(depth) into thread_depth from ancestors;
    if coalesce(thread_depth, 0) >= 6 then
      raise exception 'thread depth limit' using errcode = '22023';
    end if;
  end if;

  if (select count(*) from public.profile_comments
      where author_id = auth.uid() and created_at > now() - interval '1 minute') >= 5
  then raise exception 'comment rate limit' using errcode = 'P0001'; end if;
  if (select count(*) from public.profile_comments
      where author_id = auth.uid() and created_at > now() - interval '1 day') >= 40
  then raise exception 'daily comment limit' using errcode = 'P0001'; end if;

  insert into public.profile_comments(profile_id, author_id, body, parent_id)
  values(target_profile, auth.uid(), clean_body, parent_comment)
  returning * into result;
  return result;
end;
$$;
