-- Colunas que o front usa e o schema.sql original nao tinha.
-- Cada statement e executado separadamente (scripts/migrate.js ignora "coluna ja existe").
ALTER TABLE ambientes ADD COLUMN tipo VARCHAR(60) NULL;
ALTER TABLE ambientes ADD COLUMN localizacao VARCHAR(150) NULL;
ALTER TABLE ambientes ADD COLUMN acessivel TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE ambientes ADD COLUMN eventos_externos TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN coordenacao VARCHAR(150) NULL;
ALTER TABLE solicitacoes ADD COLUMN publico_estimado INT NULL;
ALTER TABLE solicitacoes ADD COLUMN acessibilidade TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE solicitacoes ADD COLUMN evento_publico TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE solicitacoes ADD COLUMN permite_reajuste TINYINT(1) NOT NULL DEFAULT 0;
