-- Inserts that rely on the public_id default must be allowed to execute the
-- generator. It has no data access and returns only fresh random entropy.
grant execute on function public.new_public_id(integer) to authenticated;
