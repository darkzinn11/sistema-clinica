UPDATE clinica.papeis SET permissoes=ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['profissionais:ler','profissionais:criar'])) WHERE nome='Administrador';
INSERT INTO clinica.especialidades(nome) VALUES ('Clínica geral'),('Cardiologia'),('Dermatologia'),('Pediatria') ON CONFLICT(nome) DO NOTHING;
