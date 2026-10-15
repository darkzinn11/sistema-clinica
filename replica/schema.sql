-- Schema: núcleo de agendamento (rebuild do Feegow Clinic)
-- Postgres / Supabase. Todas as tabelas têm RLS habilitado e uma policy
-- filtrando por clinic_id = auth_clinic_id() (lookup em staff_users via
-- auth.uid(), sem precisar de custom claim no JWT).
--
-- DESATUALIZADO a partir de /replica-backend: este arquivo é o rascunho da
-- fase de arquitetura. O schema que roda de verdade — com o addendum do
-- painel de chamada, a função auth_clinic_id(), issue_ticket() e todas as
-- policies — é app/supabase/migrations/20261013000000_init.sql. Mantido
-- aqui só como registro histórico da decisão de /replica-architect.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type appointment_status as enum (
  'aguardando',
  'aguardando_pagamento',
  'atendido',
  'cancelado_pelo_profissional',
  'chamando',
  'desmarcado_pelo_paciente',
  'em_atendimento',
  'confirmado',
  'nao_confirmado',
  'nao_compareceu',
  'remarcado'
);

create type payment_mode as enum ('particular', 'convenio');

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Fortaleza',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- liga um usuário de login (Supabase auth.users) a uma clínica e um papel
create table staff_users (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  auth_user_id uuid not null unique, -- references auth.users(id)
  full_name text not null,
  role text not null default 'recepcao' check (role in ('recepcao', 'admin', 'profissional')),
  created_at timestamptz not null default now()
);
create index on staff_users (clinic_id);

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

-- grade semanal recorrente de um profissional, com versionamento por vigência
create table availabilities (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
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

-- impede dois agendamentos do MESMO profissional sobrepostos,
-- exceto quando é encaixe (a válvula de escape intencional do original)
alter table appointments add constraint no_overlap_unless_encaixe
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (not is_encaixe);

-- um agendamento pode ter vários procedimentos, cada um com sua forma de
-- pagamento, valor, sala e equipamento — como visto na tela real do original
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

-- --- painel de chamada: totem, guichês, chamada de TV (addendum 2026-10-13) ---

create type ticket_status as enum ('aguardando', 'chamado', 'atendido', 'removido');

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

-- row level security
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

-- Nota: o painel de TV público (/tv) e o totem (/totem) rodam sem login de
-- staff — leem ticket_types/tickets/tv_board_configs com uma chave anônima
-- restrita por policy a "select" e a um clinic_id fixo por unidade, nunca
-- com acesso de escrita.

-- exemplo de policy (repetir por tabela com clinic_id direto;
-- appointment_procedures filtra via join com appointments)
create policy clinic_isolation on professionals
  using (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);
