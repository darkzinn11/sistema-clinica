-- Médico só enxerga e opera a PRÓPRIA agenda: ler_proprios no lugar de ler, atender no lugar de editar.
-- (editar também confirma, faz check-in e marca falta, que são da recepção.)
UPDATE clinica.papeis
SET permissoes = ARRAY['agenda:ler_proprios', 'agenda:atender', 'pacientes:ler_vinculados']
WHERE nome = 'Médico' AND permissoes = ARRAY['agenda:ler', 'agenda:editar', 'pacientes:ler_vinculados'];
