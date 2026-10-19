-- Quem informa valores ao paciente é a recepção. O médico encaminha o paciente a ela e não vê preços.
UPDATE clinica.papeis
SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['agenda:ver_valores']))
WHERE nome IN ('Administrador', 'Recepção');
