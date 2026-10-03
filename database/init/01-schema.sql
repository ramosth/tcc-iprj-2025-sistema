-- database > init > 01-schema.sql
-- Versão v3-simples: 4 tabelas, PostgreSQL simples.
-- Executado automaticamente pelo container postgres na primeira subida
-- (pasta montada em /docker-entrypoint-initdb.d). Igual ao prisma/schema.prisma.

SET timezone = 'UTC';
ALTER DATABASE bndmet SET timezone = 'UTC';

-- Leituras enviadas pelo dispositivo (POST /leituras)
CREATE TABLE IF NOT EXISTS leituras (
    id                   SERIAL PRIMARY KEY,
    criado_em            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    evento               VARCHAR(10)  NOT NULL DEFAULT 'ciclo',   -- ciclo | energia
    nivel                VARCHAR(10)  NOT NULL,                   -- VERDE | AMARELO | VERMELHO
    s                    DECIMAL(4,2),                            -- saturação relativa 0–1
    p48                  DECIMAL(7,2),                            -- mm (BNDMET)
    p24                  DECIMAL(7,2),                            -- mm (OpenWeatherMap)
    p72                  DECIMAL(7,2),                            -- mm (P48 + P24); nulo se incompleto
    p72_minimo           DECIMAL(7,2),                            -- mm, mínimo garantido (só se incompleto)
    p48_dias_nulos       SMALLINT NOT NULL DEFAULT 0,             -- dias sem registro no BNDMET
    rede                 BOOLEAN,                                 -- nulo no protótipo físico
    vbat                 DECIMAL(4,2),                            -- V
    estado_bateria       VARCHAR(10),                             -- NORMAL | BAIXA | CRITICA | FALHA
    sensor_indisponivel  BOOLEAN NOT NULL DEFAULT false,
    p48_indisponivel     BOOLEAN NOT NULL DEFAULT false,
    p24_indisponivel     BOOLEAN NOT NULL DEFAULT false,
    chuva_incompleta     BOOLEAN NOT NULL DEFAULT false,          -- falta uma parcela ou um dia
    sem_dados_chuva      BOOLEAN NOT NULL DEFAULT false,          -- nenhuma parcela obtida
    p72_injetado         BOOLEAN NOT NULL DEFAULT false,          -- cenário de teste (comando "chuva")
    simulacao            BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS leituras_criado_em_idx ON leituras (criado_em);

-- Moradores cadastrados para receber alertas
CREATE TABLE IF NOT EXISTS usuarios_basicos (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    telefone    VARCHAR(20),
    localidade  VARCHAR(100),
    ativo       BOOLEAN NOT NULL DEFAULT true,
    criado_em   TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Administradores do painel
CREATE TABLE IF NOT EXISTS administradores (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    senha_hash    VARCHAR(255) NOT NULL,
    ativo         BOOLEAN NOT NULL DEFAULT true,
    ultimo_login  TIMESTAMPTZ(6),
    criado_em     TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Eventos: nível subiu, energia e alertas enviados pelo administrador
CREATE TABLE IF NOT EXISTS eventos (
    id                SERIAL PRIMARY KEY,
    criado_em         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    tipo              VARCHAR(20) NOT NULL,                       -- NIVEL_SUBIU | ENERGIA | ALERTA_MANUAL
    nivel             VARCHAR(10),
    descricao         TEXT NOT NULL,
    leitura_id        INTEGER REFERENCES leituras(id) ON DELETE SET NULL,
    administrador_id  INTEGER REFERENCES administradores(id) ON DELETE SET NULL,
    destinatarios     INTEGER NOT NULL DEFAULT 0,
    enviados          INTEGER NOT NULL DEFAULT 0,
    falhas            INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS eventos_criado_em_idx ON eventos (criado_em);

-- Administrador padrão (senha: admin123 — troque depois do primeiro acesso)
INSERT INTO administradores (nome, email, senha_hash) VALUES
('Administrador', 'admin@bndmet.com',
 '$2a$10$ClVatGSU.R9nFJzbHBv1N.MMHuPV04mEslmUJSmQFytyXuZxJTHgC')
ON CONFLICT (email) DO NOTHING;
