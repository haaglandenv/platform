-- Server-authoritative storage. No browser/native client can read these base tables.
-- Only the verified Node API uses a Supabase secret/service-role connection.
begin;
create table public.haagv_platform_state (
  id text primary key check (id = 'platform'),
  version bigint not null default 0 check (version >= 0),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);
create table public.haagv_memberships (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('leadership','club','team','official','player','supporter','editor','photographer','press','volunteer')),
  club_id text, team_id text, official_id text, player_id text, volunteer_id text,
  status text not null default 'active' check (status in ('active','revoked')),
  updated_at timestamptz not null default now(),
  check (role <> 'club' or club_id is not null),
  check (role <> 'team' or team_id is not null),
  check (role <> 'official' or official_id is not null),
  check (role <> 'player' or player_id is not null),
  check (role <> 'volunteer' or volunteer_id is not null)
);
create index haagv_memberships_user_active on public.haagv_memberships(user_id) where status='active';
create table public.haagv_command_receipts (
  actor_id text not null,
  request_id text not null check (length(request_id) between 1 and 128),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_id,request_id)
);
alter table public.haagv_platform_state enable row level security;
alter table public.haagv_memberships enable row level security;
alter table public.haagv_command_receipts enable row level security;
revoke all on public.haagv_platform_state, public.haagv_memberships, public.haagv_command_receipts from public, anon, authenticated;
grant select,insert,update on public.haagv_platform_state, public.haagv_command_receipts to service_role;
grant select,insert,update,delete on public.haagv_memberships to service_role;
-- No anon/authenticated policies: RLS denies all even if grants are later added by mistake.
insert into public.haagv_platform_state(id,version,data) values('platform',0,
  '{"schemaVersion":1,"version":0,"updatedAt":null,"data":{"editions":[],"clubs":[],"teams":[],"players":[],"officials":[],"cups":[],"matches":[],"news":[],"registrations":[],"rosters":[],"lineups":[],"events":[],"objections":[],"volunteers":[],"shifts":[],"messages":[],"favorites":[],"kits":[],"media":[]},"memberships":[],"audit":[],"mailOutbox":[]}'::jsonb
);


-- A single PostgreSQL snapshot pairs the state version with managed membership rows.
create function public.haagv_read_state() returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('version',s.version,'data',s.data,'memberships',coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',m.id,'userId',m.user_id::text,'role',m.role,'clubId',m.club_id,'teamId',m.team_id,'officialId',m.official_id,'playerId',m.player_id,'volunteerId',m.volunteer_id,'status',m.status)))
    from public.haagv_memberships m
  ),'[]'::jsonb)) from public.haagv_platform_state s where s.id='platform';
$$;
revoke all on function public.haagv_read_state() from public,anon,authenticated;
grant execute on function public.haagv_read_state() to service_role;

create function public.haagv_commit_command(
  p_actor_id text,p_request_id text,p_fingerprint text,p_expected_version bigint,p_data jsonb,p_response jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  current_version bigint;
  receipt public.haagv_command_receipts%rowtype;
begin
  if p_actor_id is null or length(p_actor_id) not between 1 and 128 or p_request_id is null or length(p_request_id) not between 1 and 128 or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_COMMAND_ENVELOPE' using errcode='22023';
  end if;
  -- One lock order for every commit. Repeated concurrent requests see the same receipt.
  select version into strict current_version from public.haagv_platform_state where id='platform' for update;
  select * into receipt from public.haagv_command_receipts where actor_id=p_actor_id and request_id=p_request_id;
  if found then
    if receipt.fingerprint <> p_fingerprint then raise exception 'REQUEST_ID_REUSED' using errcode='23505'; end if;
    return receipt.response || '{"repeated":true}'::jsonb;
  end if;
  if p_expected_version is null or current_version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or jsonb_typeof(p_data->'data') is distinct from 'object' or jsonb_typeof(p_data->'memberships') is distinct from 'array' or jsonb_typeof(p_data->'audit') is distinct from 'array' or (p_data->>'version')::bigint is distinct from current_version+1 or (p_response->>'version')::bigint is distinct from current_version+1 then
    raise exception 'INVALID_SERVER_STATE' using errcode='22023';
  end if;
  update public.haagv_platform_state set version=current_version+1,data=p_data,updated_at=now() where id='platform';
  -- The Node reducer controls this list; clients have neither table nor RPC privileges.
  insert into public.haagv_memberships(id,user_id,role,club_id,team_id,official_id,player_id,volunteer_id,status)
  select r->>'id',(r->>'userId')::uuid,r->>'role',r->>'clubId',r->>'teamId',r->>'officialId',r->>'playerId',r->>'volunteerId',coalesce(r->>'status','active')
  from jsonb_array_elements(p_data->'memberships') r
  on conflict(id) do update set user_id=excluded.user_id,role=excluded.role,club_id=excluded.club_id,team_id=excluded.team_id,official_id=excluded.official_id,player_id=excluded.player_id,volunteer_id=excluded.volunteer_id,status=excluded.status,updated_at=now();
  delete from public.haagv_memberships m where not exists(select 1 from jsonb_array_elements(p_data->'memberships') r where r->>'id'=m.id);
  insert into public.haagv_command_receipts(actor_id,request_id,fingerprint,response) values(p_actor_id,p_request_id,p_fingerprint,p_response);
  return p_response;
end;
$$;
revoke all on function public.haagv_commit_command(text,text,text,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.haagv_commit_command(text,text,text,bigint,jsonb,jsonb) to service_role;

create function public.haagv_finish_notification(p_id text,p_result jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare current_data jsonb; idx integer;
begin
  if coalesce(p_result->>'status','') not in ('pending','accepted') or jsonb_typeof(p_result->'recipients') is distinct from 'array' then raise exception 'INVALID_NOTIFICATION_STATUS' using errcode='22023'; end if;
  select data into strict current_data from public.haagv_platform_state where id='platform' for update;
  select ordinality::integer-1 into idx from jsonb_array_elements(current_data->'mailOutbox') with ordinality r(value,ordinality) where value->>'id'=p_id;
  if idx is null then return; end if;
  current_data=jsonb_set(current_data,array['mailOutbox',idx::text],(current_data->'mailOutbox'->idx)||p_result);
  update public.haagv_platform_state set version=version+1,data=jsonb_set(current_data,'{version}',to_jsonb(version+1)),updated_at=now() where id='platform';
end;
$$;
revoke all on function public.haagv_finish_notification(text,jsonb) from public,anon,authenticated;
grant execute on function public.haagv_finish_notification(text,jsonb) to service_role;

-- One-time operator bootstrap, only on an empty installation. Never callable by clients.
create function public.haagv_bootstrap_leadership(p_user_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare current_data jsonb; membership jsonb;
begin
  select data into strict current_data from public.haagv_platform_state where id='platform' for update;
  if exists(select 1 from public.haagv_memberships) then raise exception 'BOOTSTRAP_ALREADY_COMPLETE' using errcode='23505'; end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'AUTH_USER_REQUIRED' using errcode='23503'; end if;
  membership=jsonb_build_object('id','HV-M-'||p_user_id::text,'userId',p_user_id::text,'role','leadership','status','active');
  insert into public.haagv_memberships(id,user_id,role,status) values(membership->>'id',p_user_id,'leadership','active');
  current_data=jsonb_set(current_data,'{memberships}',jsonb_build_array(membership));
  update public.haagv_platform_state set version=version+1,data=jsonb_set(current_data,'{version}',to_jsonb(version+1)),updated_at=now() where id='platform';
  return membership;
end;
$$;
revoke all on function public.haagv_bootstrap_leadership(uuid) from public,anon,authenticated;
grant execute on function public.haagv_bootstrap_leadership(uuid) to service_role;
-- Explicit minimum privilege used by the bootstrap check (not user metadata).
grant usage on schema auth to service_role;
grant select(id) on auth.users to service_role;
commit;
