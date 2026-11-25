-- New hosted Supabase projects can include this RLS event-trigger helper.
-- It remains available to its owner/event trigger, never through the public API.
-- Older/local installations do not necessarily have the helper.
begin;
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
commit;
