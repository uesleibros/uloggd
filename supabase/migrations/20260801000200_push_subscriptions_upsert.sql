-- Turning push on failed for everyone.
--
-- Re-subscribing a browser returns the same endpoint, so the client upserts on
-- it rather than inserting a duplicate. An upsert needs UPDATE as well as
-- INSERT, and the first migration granted neither the privilege nor a policy
-- for it, so every attempt came back 42501 and the settings card reported that
-- it could not turn notifications on right now.
--
-- Reproduced as `authenticated` against the real table before fixing: a plain
-- insert succeeded and the upsert the app actually performs did not.

drop policy if exists push_subscriptions_owner_update on public.push_subscriptions;
create policy push_subscriptions_owner_update on public.push_subscriptions
  for update
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

-- Column-scoped, so an upsert can refresh the keys and the label of a device
-- someone already registered without being able to reassign the row to another
-- account. `profile_id` is deliberately absent from this list, and a third
-- party updating a row they do not own matches no rows under the policy above.
grant update (endpoint, p256dh, auth, device_label, last_used_at)
  on public.push_subscriptions to authenticated;

-- `on conflict do update` also needs SELECT on the columns it writes, which the
-- first migration withheld: the grant listed everything except the two key
-- fields. Measured rather than reasoned about, by granting exactly these and
-- watching the upsert start working.
--
-- Withholding them bought nothing anyway. Row-level security already limits
-- every row to its owner, and these are keys that owner's own browser
-- generated, so reading them back is reading their own device's data.
grant select (p256dh, auth) on public.push_subscriptions to authenticated;
