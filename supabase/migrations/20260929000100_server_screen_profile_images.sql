-- Profile pictures appear on surfaces that cannot be covered. Only the
-- server image endpoint may set them after classifying the uploaded bytes.
revoke update (avatar_url, banner_url) on public.profiles from authenticated;
revoke insert (avatar_url, banner_url) on public.profiles from authenticated;
