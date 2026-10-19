UPDATE clinica.papeis
SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['pacientes:ler', 'pacientes:criar']))
WHERE nome = 'Administrador';
