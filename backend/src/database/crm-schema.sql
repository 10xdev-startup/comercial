-- CRM schema (client funnel only). Not a migration folder.
-- Apply via Supabase Management API: `npm run apply:crm-schema`
-- See SETUP.md. Service-role bypasses RLS; tables have RLS on and no public policies.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  instagram_handle text not null,
  display_name text,
  bio text,
  pipeline_state text not null check (pipeline_state in (
    'discovered', 'qualified', 'contacted', 'replied', 'interested',
    'whatsapp_handoff', 'registered', 'active_customer', 'closed'
  )),
  channel_state text not null check (channel_state in (
    'browser_contact_pending', 'browser_contact_sent', 'waiting_inbound_reply',
    'api_eligible', 'api_active', 'api_window_closed', 'human_review_required',
    'do_not_contact', 'blocked', 'completed'
  )),
  score integer not null default 0,
  niche text,
  tags text[] not null default '{}',
  origin text,
  role_guess text not null default 'unknown' check (role_guess in (
    'store', 'employee', 'owner', 'decision_maker', 'unknown'
  )),
  next_action text,
  next_action_at timestamptz,
  campaign_id uuid,
  experiment_id uuid,
  experiment_variant text,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists leads_handle_lower_idx on public.leads (lower(instagram_handle));
create index if not exists leads_pipeline_idx on public.leads (pipeline_state);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  channel_owner text not null default 'none' check (channel_owner in ('browser', 'api', 'none')),
  messaging_window_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  source text not null check (source in ('browser', 'api', 'system')),
  body text not null,
  variant text,
  job_id uuid,
  external_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists messages_external_id_idx on public.messages (external_id) where external_id is not null;
create index if not exists messages_lead_created_idx on public.messages (lead_id, created_at);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  experiment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hypothesis text not null default '',
  status text not null default 'draft' check (status in ('draft', 'running', 'concluded')),
  control_variant text not null default 'control',
  variants text[] not null default '{}',
  sample_size integer not null default 0,
  winner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed', 'dead_letter')),
  run_at timestamptz not null default now(),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  last_error text,
  claimed_at timestamptz,
  locked_by text,
  idempotency_key text,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists jobs_idempotency_key_idx on public.jobs (idempotency_key) where idempotency_key is not null;
create index if not exists jobs_claim_idx on public.jobs (status, run_at);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  purpose text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.do_not_contact (
  id uuid primary key default gen_random_uuid(),
  instagram_handle text not null,
  reason text not null,
  source text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists do_not_contact_handle_lower_idx on public.do_not_contact (lower(instagram_handle));

create table if not exists public.system_state (
  id integer primary key check (id = 1),
  paused boolean not null default false,
  pause_reason text,
  updated_at timestamptz not null default now()
);
insert into public.system_state (id, paused) values (1, false)
  on conflict (id) do nothing;

create or replace function public.claim_next_job(p_worker_id text)
returns setof public.jobs
language plpgsql
as $$
begin
  return query
  update public.jobs
  set
    status = 'running',
    claimed_at = now(),
    locked_by = p_worker_id,
    attempts = attempts + 1,
    updated_at = now()
  where id = (
    select j.id from public.jobs j
    where j.status = 'pending' and j.run_at <= now()
    order by j.run_at
    for update skip locked
    limit 1
  )
  returning *;
end;
$$;

alter table public.leads enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.campaigns enable row level security;
alter table public.experiments enable row level security;
alter table public.jobs enable row level security;
alter table public.ai_usage enable row level security;
alter table public.do_not_contact enable row level security;
alter table public.system_state enable row level security;

notify pgrst, 'reload schema';
