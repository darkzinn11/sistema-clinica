UPDATE clinica.papeis
SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['pacientes:editar','pacientes:inativar']))
WHERE nome = 'Administrador';
