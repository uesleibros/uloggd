-- Keep comments on lists/reviews at feature parity with profile comments.
-- Authors may edit their own still-visible comment; ownership and input
-- validation stay server-side so the shared UI cannot bypass either rule.

create or replace function public.update_content_comment(
  target_comment uuid,
  comment_body text
)
returns public.content_comments
language plpgsql security definer set search_path = ''
as $$
declare result public.content_comments;
declare clean_body text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  clean_body := trim(comment_body);
  if char_length(clean_body) not between 1 and 500
    or clean_body ~ '[[:cntrl:]]' then
    raise exception 'invalid comment' using errcode = '22023';
  end if;
  update public.content_comments
  set body = clean_body, updated_at = now()
  where id = target_comment
    and author_id = auth.uid()
    and deleted_at is null
  returning * into result;
  if result.id is null then
    raise exception 'comment not found or not allowed' using errcode = '42501';
  end if;
  return result;
end;
$$;

revoke all on function public.update_content_comment(uuid,text)
  from public, anon;
grant execute on function public.update_content_comment(uuid,text)
  to authenticated;
