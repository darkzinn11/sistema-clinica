-- Dados fictícios pra desenvolvimento/demo — nenhum paciente real (ver nota
-- de privacidade em replica/recon.md). Roda com `supabase db reset` (local,
-- precisa de Docker) ou colando no SQL Editor de um projeto hospedado.

insert into clinics (id, name, timezone) values
  ('00000000-0000-0000-0000-000000000001', 'Clínica Popular', 'America/Fortaleza');

-- login de teste só pra ambiente LOCAL (supabase start). Num projeto
-- hospedado, crie o primeiro usuário pelo Dashboard (Authentication > Add
-- user) ou pelo fluxo de convite, e troque o auth_user_id abaixo pelo id
-- real antes de rodar o insert em staff_users.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'recepcao@suaclinica.com.br',
  crypt('troque-esta-senha', gen_salt('bf')), now(), now(), now(), '{}', '{}'
);

insert into staff_users (clinic_id, auth_user_id, full_name, role) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000aa', 'Recepção', 'admin');

insert into professionals (id, clinic_id, full_name, specialty, min_age, phone) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Dra. Camila Esteves', 'Ultrassonografia', 10, '(98) 90000-0001'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Dra. Beatriz Nogueira', 'Ginecologia', null, '(98) 90000-0002'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Dr. Rafael Montenegro', 'Psicologia', null, '(98) 90000-0003');

insert into locations (id, clinic_id, name) values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Sala de Ultrassom'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'Consultório 1'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'Consultório 2');

insert into equipment (id, clinic_id, name) values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Aparelho de Ultrassom');

insert into procedures (id, clinic_id, name, specialty, default_duration_min, default_price_cents) values
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', 'US Obstétrico', 'Ultrassonografia', 20, 19000),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000001', 'US Morfológico 1º Trimestre', 'Ultrassonografia', 30, 30000),
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000001', 'US Abdome Total', 'Ultrassonografia', 20, 11000),
  ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000001', 'Consulta Ginecológica', 'Ginecologia', 30, 17000),
  ('00000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000001', 'Sessão de Psicoterapia', 'Psicologia', 50, 14000);

insert into insurances (id, clinic_id, name) values
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000001', 'Saúde Bem Estar'),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000001', 'Vida Plena Saúde');

insert into availabilities (clinic_id, professional_id, weekday, start_time, end_time, slot_duration_min, max_encaixes_per_day) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 2, '14:00', '18:00', 10, 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 4, '14:00', '17:30', 10, 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 1, '08:00', '12:00', 30, 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 3, '08:00', '12:00', 30, 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 1, '13:00', '18:00', 50, 0),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 5, '13:00', '18:00', 50, 0);

insert into ticket_types (clinic_id, name, color_hex, prefix, start_number) values
  ('00000000-0000-0000-0000-000000000001', 'Consulta', '#1a7a4c', 'CON', 1),
  ('00000000-0000-0000-0000-000000000001', 'Exames', '#1d55d6', 'EXM', 1),
  ('00000000-0000-0000-0000-000000000001', 'Laboratório', '#7a1a8c', 'LAB', 1),
  ('00000000-0000-0000-0000-000000000001', 'Consulta Preferencial', '#9a5b00', 'CON P', 1),
  ('00000000-0000-0000-0000-000000000001', 'Exames Preferencial', '#9a5b00', 'EXM P', 1),
  ('00000000-0000-0000-0000-000000000001', 'Laboratório Preferencial', '#9a5b00', 'LAB P', 1),
  ('00000000-0000-0000-0000-000000000001', 'Retorno', '#161a20', 'RET', 1),
  ('00000000-0000-0000-0000-000000000001', 'Retorno Preferencial', '#9a5b00', 'RET P', 1);

insert into counters (clinic_id, name, covered_location_ids) values
  ('00000000-0000-0000-0000-000000000001', 'Guichê 1', '{}'),
  ('00000000-0000-0000-0000-000000000001', 'Guichê 2', '{}'),
  ('00000000-0000-0000-0000-000000000001', 'Guichê 3', array['00000000-0000-0000-0000-000000000021']::uuid[]),
  ('00000000-0000-0000-0000-000000000001', 'Guichê 4', array['00000000-0000-0000-0000-000000000021']::uuid[]);

insert into tv_board_configs (clinic_id) values
  ('00000000-0000-0000-0000-000000000001'); -- usa os defaults da coluna
