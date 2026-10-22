-- Busca sem acento: quem digita "biopsia" ou "consultorio" precisa achar "Biópsia" e "consultório".
-- A extensão fica no schema da aplicação; as consultas chamam clinica.unaccent(...).
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA clinica;
