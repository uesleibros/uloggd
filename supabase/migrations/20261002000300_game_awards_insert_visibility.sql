-- INSERT RETURNING must see the owner's new row before a stable helper can
-- read it from a later statement snapshot.
drop policy game_awards_read on public.game_awards;
create policy game_awards_read on public.game_awards for select to anon, authenticated
  using (auth.uid()=profile_id or public.game_award_visible(id));
