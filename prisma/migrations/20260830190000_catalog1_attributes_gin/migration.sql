-- CATALOG.1: one GIN index for JSONB containment (@>) on game-specific attributes.
-- Expression indexes per key are deferred until a filter is hot in production.
CREATE INDEX IF NOT EXISTS cards_attributes_gin_idx ON cards USING gin (attributes jsonb_path_ops);
