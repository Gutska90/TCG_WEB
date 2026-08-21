-- Search (Fase 3): pg_trgm + unaccent. Prisma no expresa índices GIN sobre expresiones.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent_lower(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent', lower(input))
$$;

CREATE INDEX cards_name_trgm_idx ON cards USING gin (immutable_unaccent_lower(name) gin_trgm_ops);
CREATE INDEX cards_number_trgm_idx ON cards USING gin (immutable_unaccent_lower(number) gin_trgm_ops);
CREATE INDEX sets_name_trgm_idx ON sets USING gin (immutable_unaccent_lower(name) gin_trgm_ops);
CREATE INDEX sets_code_trgm_idx ON sets USING gin (immutable_unaccent_lower(code) gin_trgm_ops);
CREATE INDEX tcg_games_name_trgm_idx ON tcg_games USING gin (immutable_unaccent_lower(name) gin_trgm_ops);
CREATE INDEX tcg_games_slug_trgm_idx ON tcg_games USING gin (immutable_unaccent_lower(slug) gin_trgm_ops);
