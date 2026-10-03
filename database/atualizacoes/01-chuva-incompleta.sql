-- database > atualizacoes > 01-chuva-incompleta.sql
-- Para um banco que JÁ existia antes destes campos (o 01-schema.sql novo já os cria).
-- Pode rodar mais de uma vez sem erro.
--   docker exec -i bndmet-postgres psql -U admin -d bndmet < database/atualizacoes/01-chuva-incompleta.sql

ALTER TABLE leituras ADD COLUMN IF NOT EXISTS p72_minimo       DECIMAL(7,2);
ALTER TABLE leituras ADD COLUMN IF NOT EXISTS p48_dias_nulos   SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE leituras ADD COLUMN IF NOT EXISTS chuva_incompleta BOOLEAN  NOT NULL DEFAULT false;
