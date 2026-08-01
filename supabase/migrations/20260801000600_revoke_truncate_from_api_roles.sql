-- `anon` and `authenticated` lose TRUNCATE, TRIGGER and REFERENCES on every
-- public table.
--
-- Found while granting a column on `screenshots`: the API roles held the full
-- table-level set, including TRUNCATE. That one matters because **TRUNCATE
-- ignores row-level security**. Every policy in this schema is written to
-- protect rows, and TRUNCATE removes all of them without consulting a single
-- policy. Verified against the real table inside a rolled-back transaction:
-- as `anon`, `truncate public.screenshots` succeeded and took the count from
-- five to zero.
--
-- It is not reachable through the API as things stand, since PostgREST has no
-- verb for it and neither role can open a connection of its own. What it does
-- is set the blast radius of any future mistake: a single injectable dynamic
-- statement, or one `security definer` function missing a `search_path`, turns
-- from an incident into an empty database.
--
-- INSERT, UPDATE, DELETE and SELECT stay, because the API genuinely needs them
-- and row-level security genuinely constrains them. These three it does not
-- need: TRIGGER and REFERENCES are schema-modification rights that belong to
-- migrations, and nothing has ever wanted TRUNCATE from a request.
do $$
declare
  target record;
begin
  for target in
    select schemaname, tablename
      from pg_tables
     where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, trigger, references on %I.%I from anon, authenticated',
      target.schemaname,
      target.tablename
    );
  end loop;
end
$$;

-- New tables inherit whatever the default privileges say, so the same grant
-- would come back with the next table created through the dashboard. This
-- stops that at the source rather than requiring this migration to be
-- remembered and re-run.
alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
