UPDATE clinica.papeis SET permissoes=ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['agenda:ler','agenda:criar'])) WHERE nome='Administrador';
