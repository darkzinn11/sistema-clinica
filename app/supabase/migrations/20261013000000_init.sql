-- Clínica (clone) — schema inicial.
-- Consolida replica/schema.sql + o addendum do painel de chamada, com RLS
-- de verdade (lookup em staff_users via auth.uid(), sem precisar de custom
-- claim no JWT).

create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create extension if not exists unaccent;

create type appointment_status as enum (
  'aguardando', 'aguardando_pagamento', 'atendido',
  'cancelado_pelo_profissional', 'chamando', 'desmarcado_pelo_paciente',
  'em_atendimento', 'confirmado', 'nao_confirmado', 'nao_compareceu',
  'remarcado'
);
create type payment_mode as enum ('particular', 'convenio');
create type ticket_status as enum ('aguardando', 'chamado', 'atendido', 'removido');

-- --- núcleo -----------------------------------------------------------------

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Fortaleza',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table staff_users (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'recepcao' check (role in ('recepcao', 'admin', 'profissional')),
  created_at timestamptz not null default now()
);
create index on staff_users (clinic_id);

-- Helper: clínica do usuário autenticado. `security definer` + search_path
-- fixo pra poder ser chamada de dentro das policies sem recursão de RLS.
create function auth_clinic_id() returns uuid
language sql security definer set search_path = public stable as $$
  select clinic_id from staff_users where auth_user_id = auth.uid()
$$;

create table professionals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  staff_user_id uuid references staff_users(id) on delete set null,
  full_name text not null,
  specialty text not null,
  min_age integer,
  notes text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on professionals (clinic_id);

create table locations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index on locations (clinic_id);

create table equipment (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index on equipment (clinic_id);

create table procedures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  specialty text,
  default_duration_min integer not null default 30,
  default_price_cents integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on procedures (clinic_id);

create table insurances (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on insurances (clinic_id);

create table availabilities (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_duration_min integer not null default 30,
  max_encaixes_per_day integer not null default 0,
  valid_from date not null default current_date,
  valid_to date,
  created_at timestamptz not null default now(),
  constraint availability_time_valid check (end_time > start_time),
  constraint availability_validity_valid check (valid_to is null or valid_to >= valid_from)
);
create index on availabilities (clinic_id, professional_id, weekday);

create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  full_name text not null,
  social_name text,
  cpf text,
  has_no_cpf boolean not null default false,
  rg text,
  cns text,
  birth_date date,
  sex text check (sex in ('masculino', 'feminino', 'indefinido')),
  phone text,
  mobile_phone text not null,
  email text,
  address jsonb not null default '{}',
  lead_source text,
  lead_detail text,
  observations text,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cpf_required_unless_flagged check (has_no_cpf or cpf is not null)
);
create index on patients (clinic_id);
create index on patients (clinic_id, mobile_phone);
create unique index on patients (clinic_id, cpf) where cpf is not null;
-- busca por nome ignorando acento (bug achado em replica-build: "Joao" tem
-- que encontrar "João") — índice trigram sobre o nome sem acento
create extension if not exists pg_trgm;
create index patients_name_trgm on patients using gin (unaccent(full_name) gin_trgm_ops);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete restrict,
  professional_id uuid not null references professionals(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'nao_confirmado',
  is_encaixe boolean not null default false,
  is_retorno boolean not null default false,
  lead_source text,
  referring_professional_id uuid references professionals(id) on delete set null,
  repeat_group_id uuid,
  notes text,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  confirmed_at timestamptz,
  confirmation_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_time_valid check (ends_at > starts_at)
);
create index on appointments (clinic_id, professional_id, starts_at);
create index on appointments (clinic_id, status);
create index on appointments (patient_id);
create index on appointments (repeat_group_id) where repeat_group_id is not null;

-- impede dois agendamentos do MESMO profissional sobrepostos, exceto
-- encaixe (válvula de escape intencional, igual ao original)
alter table appointments add constraint no_overlap_unless_encaixe
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (not is_encaixe);

create table appointment_procedures (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  procedure_id uuid not null references procedures(id) on delete restrict,
  duration_min integer not null,
  payment_mode payment_mode not null default 'particular',
  insurance_id uuid references insurances(id) on delete set null,
  price_cents integer not null,
  location_id uuid references locations(id) on delete set null,
  equipment_id uuid references equipment(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint insurance_required_for_convenio
    check (payment_mode = 'particular' or insurance_id is not null)
);
create index on appointment_procedures (appointment_id);
create index on appointment_procedures (procedure_id);

create table waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  professional_id uuid references professionals(id) on delete cascade,
  arrived_at timestamptz not null default now(),
  attended_at timestamptz,
  created_at timestamptz not null default now()
);
create index on waitlist_entries (clinic_id, professional_id, arrived_at);

-- --- painel de chamada: totem, guichês, TV ----------------------------------

create table ticket_types (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  color_hex text not null,
  prefix text not null,
  start_number integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint prefix_format check (prefix ~ '^[A-Z0-9 ]{1,8}$')
);
create index on ticket_types (clinic_id);
create unique index on ticket_types (clinic_id, prefix);

create table counters (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  covered_location_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on counters (clinic_id);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id) on delete restrict,
  number integer not null,
  status ticket_status not null default 'aguardando',
  counter_id uuid references counters(id) on delete set null,
  called_at timestamptz,
  created_at timestamptz not null default now()
);
create index on tickets (clinic_id, status, created_at);
create index on tickets (ticket_type_id, number);

create table tv_board_configs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null unique references clinics(id) on delete cascade,
  template text not null default 'padrao',
  logo_url text,
  color_1 text not null default '#1d55d6',
  color_2 text not null default '#161a20',
  color_3 text not null default '#5b6472',
  background_color text not null default '#f5f6f8',
  interval_seconds integer not null default 6,
  youtube_video_id text,
  show_professional_name boolean not null default false,
  show_location_name boolean not null default true,
  voice_call boolean not null default true,
  call_more_than_once boolean not null default true,
  pre_consulta boolean not null default false,
  pos_consulta boolean not null default false,
  show_last_called boolean not null default true,
  show_patient_birthdate boolean not null default false,
  beep_twice_only boolean not null default true,
  muted_video boolean not null default false,
  updated_at timestamptz not null default now()
);

-- emite a próxima senha de um tipo de forma atômica (trava a linha do tipo
-- pra evitar duas senhas com o mesmo número se dois totens baterem junto)
create function issue_ticket(p_ticket_type_id uuid) returns tickets
language plpgsql security definer set search_path = public as $$
declare
  v_type ticket_types;
  v_next integer;
  v_ticket tickets;
begin
  select * into v_type from ticket_types where id = p_ticket_type_id and active for update;
  if not found then
    raise exception 'Tipo de senha inválido ou inativo.';
  end if;

  select coalesce(max(number), v_type.start_number - 1) + 1 into v_next
    from tickets where ticket_type_id = p_ticket_type_id;

  insert into tickets (clinic_id, ticket_type_id, number, status)
    values (v_type.clinic_id, p_ticket_type_id, v_next, 'aguardando')
    returning * into v_ticket;

  return v_ticket;
end;
$$;

-- busca de paciente ignorando acento ("Joao" tem que achar "João" — bug
-- real achado em replica-build com a versão em memória). `invoker` (não
-- `definer`): continua passando pela RLS de patients normalmente.
create function search_patients(q text) returns setof patients
language sql stable as $$
  select * from patients
  where unaccent(full_name) ilike '%' || unaccent(q) || '%'
     or cpf ilike '%' || q || '%'
     or mobile_phone ilike '%' || q || '%'
     or birth_date::text ilike '%' || q || '%'
  order by full_name
  limit 8
$$;

-- --- row level security ------------------------------------------------------

alter table clinics enable row level security;
alter table staff_users enable row level security;
alter table professionals enable row level security;
alter table locations enable row level security;
alter table equipment enable row level security;
alter table procedures enable row level security;
alter table insurances enable row level security;
alter table availabilities enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table appointment_procedures enable row level security;
alter table waitlist_entries enable row level security;
alter table ticket_types enable row level security;
alter table counters enable row level security;
alter table tickets enable row level security;
alter table tv_board_configs enable row level security;

create policy staff_sees_own_row on staff_users
  for select using (auth_user_id = auth.uid());

create policy clinic_isolation on clinics
  for select using (id = auth_clinic_id());

create policy clinic_isolation on professionals
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on locations
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on equipment
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on procedures
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on insurances
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on availabilities
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on patients
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on appointments
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on waitlist_entries
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on ticket_types
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on counters
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on tickets
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
create policy clinic_isolation on tv_board_configs
  for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());

-- appointment_procedures não tem clinic_id direto — filtra via join
create policy clinic_isolation on appointment_procedures
  for all using (
    exists (select 1 from appointments a where a.id = appointment_id and a.clinic_id = auth_clinic_id())
  ) with check (
    exists (select 1 from appointments a where a.id = appointment_id and a.clinic_id = auth_clinic_id())
  );

-- Nota de segurança (ver replica/backend.md): /totem e /tv são públicos de
-- propósito (igual ao original) e não têm sessão de staff. As Server Actions
-- que eles chamam (issueTicketAction, getCurrentCallAction) usam a
-- SERVICE ROLE key no servidor — nunca a anon key direto do navegador — e
-- por isso ignoram essas policies. Antes de um deploy com mais de uma
-- clínica, trocar isso por um slug/token público por unidade + policy anon
-- restrita a esse clinic_id específico, em vez de bypass total.
