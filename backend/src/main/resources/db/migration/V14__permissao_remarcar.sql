-- Remarcar passa a ter permissão própria: só a recepção remarca (o médico mantém agenda:editar e não remarca).
UPDATE clinica.papeis
SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['agenda:remarcar']))
WHERE nome IN ('Administrador', 'Recepção');
