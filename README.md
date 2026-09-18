# Sistema Integrado de Monitoramento de Barragens de Rejeito
## ESP8266 NodeMCU + BNDMET API + OWM + Equação de Risco (Eq.5 TCC)

[![API Status](https://img.shields.io/badge/API-Online-green)](http://localhost:3001/api/health)
[![Version](https://img.shields.io/badge/Version-3.0.0-blue)](http://localhost:3001/api)
[![Swagger](https://img.shields.io/badge/Docs-Swagger-orange)](http://localhost:3001/api/docs)
[![Docker](https://img.shields.io/badge/Docker-Containerizado-blue)](https://www.docker.com/)

---

## Resumo Executivo

Sistema integrado de monitoramento baseado no microcontrolador ESP8266 NodeMCU, com integração à Base Nacional de Dados Meteorológicos (BNDMET/DECEA, estação D6594) e ao OpenWeatherMap (OWM). Implementa arquitetura distribuída para coleta, processamento e armazenamento de dados em tempo real, com cálculo de risco pela Equação de 7 variáveis ponderadas (Eq.5 TCC). Backend Node.js totalmente dockerizado junto ao banco de dados.

---

## Objetivos do Sistema

### Objetivo Geral
Desenvolver uma plataforma robusta de monitoramento de barragens de rejeito que integre dispositivos IoT com sistemas de análise de risco, banco de dados temporal e API REST para visualização e alertas.

### Objetivos Específicos
- Coletar dados de umidade do solo via ESP8266 NodeMCU (sensor capacitivo)
- Integrar dados meteorológicos históricos e de previsão via BNDMET e OWM
- Calcular índice de risco integrado por equação de 7 variáveis (Eq.5 TCC)
- Armazenar séries temporais em PostgreSQL + TimescaleDB
- Prover API RESTful com autenticação JWT e sistema de alertas por e-mail

---

## Arquitetura do Sistema

```
[ESP8266 + Sensor] → [API REST Node.js] → [PostgreSQL + TimescaleDB]
        ↑                    ↑
  [BNDMET D6594]      [OWM /weather + /forecast]
```

| Camada | Componente |
|--------|-----------|
| **Dispositivo** | ESP8266 NodeMCU + sensor capacitivo de umidade |
| **Meteorologia** | BNDMET/DECEA (estação D6594) + OpenWeatherMap |
| **Backend** | Node.js + TypeScript + Prisma ORM (Dockerizado) |
| **Banco** | PostgreSQL 15 + TimescaleDB (hypertable) |
| **Documentação** | Swagger UI + OpenAPI 3.0 |

---

## Tecnologias Utilizadas

### Backend
- **Node.js + TypeScript** — Runtime e tipagem estática
- **Prisma ORM** — Mapeamento objeto-relacional
- **PostgreSQL 15 + TimescaleDB** — Banco de dados temporal
- **JWT** — Autenticação e autorização
- **Docker + Docker Compose** — Containerização completa (banco + backend)

### Hardware
- **ESP8266 NodeMCU** — Microcontrolador principal
- **Sensor capacitivo de umidade** — Leitura via ADC (0–1023)

### APIs Externas
- **BNDMET/DECEA** — Estação D6594 (Alberto Flores, rede ANA), chave estática
- **OpenWeatherMap** — Dados atuais (`/weather`) e previsão (`/forecast`)

---

## Pré-requisitos

- Docker Desktop instalado e em execução
- NPM
- Portas **3001**, **8081** e **5432** disponíveis

---

## Guia de Implementação

### 1. Clonar o repositório

```bash
git clone https://github.com/ramosth/sistema-bndmet
cd sistema-bndmet
```

### 2. Configurar variáveis de ambiente

Crie o arquivo `.env` na **raiz** do projeto (mesmo nível do `docker-compose.yml`):

```env
# Timezone
TZ=UTC
NODE_TZ=UTC

# Database
DATABASE_URL="postgresql://admin:senha123@postgres:5432/bndmet?schema=public&timezone=UTC"

# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=seu-segredo-jwt-aqui
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:3000   # URL do frontend (ajustar conforme ambiente)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# APIs Externas
BNDMET_API_KEY=sua-chave-bndmet
OPENWEATHER_API_KEY=sua-chave-owm

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
```

> ⚠️ **Importante:** O `DATABASE_URL` usa `@postgres` (nome do serviço Docker) e não `@localhost` quando o backend roda dentro do Docker.

---

### 3. Subir os serviços com Docker

#### 3.1 — Primeira inicialização (ou reset completo do banco)

> ⚠️ O PostgreSQL só executa os scripts de inicialização quando o volume está vazio. O `-v` apaga todos os dados. Use apenas na primeira vez ou quando precisar resetar o banco.

```bash
# Derruba containers e apaga o volume
docker-compose down -v

# Sobe tudo — executa os scripts SQL automaticamente
docker-compose up -d
```

#### 3.2 — Uso diário (mantém os dados)

```bash
# Subir tudo
docker-compose up -d

# Desligar (mantém os dados no banco)
docker-compose down
```

#### 3.3 — Comandos individuais

```bash
# Subir só o backend
docker-compose up -d backend

# Ver logs do backend em tempo real
docker logs bndmet-backend -f

# Ver logs do banco
docker-compose logs postgres

# Reiniciar só o backend (sem recriar o banco)
docker-compose restart backend

# Parar só o backend
docker-compose stop backend
```

#### 3.4 — Verificar status

```bash
docker-compose ps
# ou
docker ps
```

**Saída esperada:**
```
CONTAINER ID   IMAGE                          STATUS          PORTS                    NAMES
xxxxxxxxxxxx   sistema-bndmet-backend         Up (healthy)    0.0.0.0:3001->3001/tcp   bndmet-backend
xxxxxxxxxxxx   timescale/timescaledb:pg15      Up (healthy)    0.0.0.0:5432->5432/tcp   bndmet-postgres
xxxxxxxxxxxx   adminer:latest                 Up              0.0.0.0:8081->8080/tcp   bndmet-adminer
```

**Saída esperada nos logs do backend:**
```
✅ Conectado ao banco de dados
📧 EmailService inicializado com sucesso
✅ Conexão SMTP verificada com sucesso
🚀 Servidor rodando na porta 3001
📊 Ambiente: production
```

---

### 4. Aplicar migrations incrementais

Após a inicialização, se houver novas colunas a adicionar (ex: migration 03):

```bash
# Copiar o arquivo para dentro do container e executar
docker cp database/init/03-add-owm-equacao-campos.sql bndmet-postgres:/tmp/
docker exec -i bndmet-postgres psql -U admin -d bndmet -f /tmp/03-add-owm-equacao-campos.sql

# Regenerar o cliente Prisma dentro do container do backend
docker-compose restart backend
```

---

## Validação do Banco de Dados

### Acesso via terminal

```bash
docker exec -it bndmet-postgres psql -U admin -d bndmet
```

**Comandos de verificação:**
```sql
-- Listar tabelas (esperado: 7+)
\dt

-- Verificar colunas da tabela principal
\d leituras_sensor

-- Contar registros
SELECT COUNT(*) FROM leituras_sensor;

-- Verificar últimas leituras
SELECT timestamp, nivel_alerta, indice_risco, amplificado, estacao, status_api_owm
FROM leituras_sensor
ORDER BY timestamp DESC
LIMIT 5;

-- Verificar componentes da Eq.5 TCC
SELECT timestamp, nivel_alerta, v_lencol, v_chuva_futura, amplificado
FROM leituras_sensor
ORDER BY timestamp DESC
LIMIT 5;

-- Sair
\q
```

### Acesso via Adminer (interface web)

> A porta mapeada é **8081** (não 8080)

- **URL**: `http://localhost:8081`
- **Credenciais**:
  - Sistema: `PostgreSQL`
  - Servidor: `postgres`
  - Usuário: `admin`
  - Senha: `senha123`
  - Base de dados: `bndmet`

---

## Testes de Validação da API

### 1. Health Check

```bash
curl http://localhost:3001/api/health
```

### 2. Status do Sistema

```bash
curl http://localhost:3001/api/sensor/status
```

### 3. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@bndmet.com","senha":"Admin123"}'
```

### 4. Enviar dados de sensor (payload completo)

```bash
# Simula inserção manual (modo_manual = true automaticamente quando omitido).
# O Arduino envia modoManual=false explicitamente.
curl -X POST http://localhost:3001/api/sensor/dados \
  -H 'Content-Type: application/json' \
  -d '{
    "umidadeSolo": 22.0,
    "valorAdc": 560,
    "sensorOk": true,
    "fatorLocal": 0.880,
    "estacao": "D6594",
    "precipitacaoAtual": 2.5,
    "precipitacao24h": 22.5,
    "precipitacao7d": 65.0,
    "precipitacao30d": 185.0,
    "statusApiBndmet": "OK",
    "qualidadeDadosBndmet": 91,
    "statusApiOwm": "OK",
    "temperatura": 20.3,
    "umidadeExterna": 78.0,
    "pressaoAtmosferica": 1009.0,
    "velocidadeVento": 6.2,
    "descricaoTempo": "Chuva fraca",
    "chuvaAtualOWM": 0.8,
    "chuvaFutura24h": 18.0,
    "intensidadePrevisao": "Moderada",
    "fatorIntensidade": 0.25,
    "riscoIntegrado": 0.54,
    "indiceRisco": 54,
    "nivelAlerta": "AMARELO",
    "recomendacao": "🟡 ATENÇÃO — Chuva prevista, aumentar frequência de monitoramento",
    "confiabilidade": 89,
    "amplificado": false,
    "taxaVariacaoUmidade": 0.180,
    "vLencol": 0.3520,
    "vChuvaAtual": 0.0360,
    "vChuvaHistorica": 0.0520,
    "vChuvaMensal": 0.0617,
    "vChuvaFutura": 0.0375,
    "vTaxaVariacao": 0.0180,
    "vPressao": 0.0000,
    "statusSistema": 1,
    "buzzerAtivo": false,
    "modoManual": true,
    "wifiConectado": true
  }'
```

### 5. Documentação Swagger

```
http://localhost:3001/api/docs
```

---

## Estrutura do Projeto

```
sistema-bndmet/
├── docker-compose.yml              ← Orquestra postgres + adminer + backend
├── .env                            ← Variáveis de ambiente (raiz — lido pelo docker-compose)
├── database/
│   └── init/
│       ├── 01-init.sql             ← Schema v3: leituras_sensor, logs_sistema, views
│       ├── 02-auth-tables.sql      ← Auth: usuarios_admin, usuarios_basicos, sessoes
│       └── 03-add-owm-equacao-campos.sql  ← Migration: status_api_owm + 12 campos Eq.5
├── backend/
│   ├── Dockerfile                  ← Build multi-stage Node.js 20 Alpine
│   ├── .dockerignore
│   ├── .env                        ← Variáveis locais (desenvolvimento sem Docker)
│   ├── prisma/
│   │   └── schema.prisma           ← Schema sincronizado com 13 campos novos
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/                 ← env.ts, database.ts, swagger.ts
│   │   ├── controllers/            ← sensorController.ts, authController.ts
│   │   ├── middleware/             ← authMiddleware.ts
│   │   ├── routes/                 ← index.ts, sensorRoutes.ts, authRoutes.ts
│   │   ├── services/               ← sensorService.ts (v4), authService.ts, emailService.ts
│   │   ├── types/
│   │   │   └── index.ts            ← Interface DadosESP8266 v3
│   │   ├── utils/
│   │   │   └── response.ts
│   │   └── validators/
│   │       └── authValidators.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/                       ← Dashboard web (README próprio em frontend/)
├── firmware/
│   └── tcc_versao_15.ino           ← Firmware ESP8266 versão atual
└── README.md
```

---

## Arduino

**Versão atual:** `tcc_versao_15.ino`

Para modo de produção, comentar no firmware:
```cpp
// return INTERVALO_ENVIO_TESTE;  ← comentar esta linha em produção
```

---

## Equação de Risco (Eq.5 TCC)

| Variável | Peso | Fonte |
|----------|------|-------|
| Nível do lençol freático (V_lençol) | 0,40 | ESP8266 (ADC) |
| Chuva atual 24h (V_ch.atual) | 0,08 | BNDMET D6594 |
| Chuva histórica 7d (V_ch.histórica) | 0,12 | BNDMET D6594 |
| Chuva mensal 30d (V_ch.mensal) | 0,10 | BNDMET D6594 |
| Chuva futura 24h (V_ch.futura) | 0,15 | OWM /forecast |
| Taxa de variação (V_taxa) | 0,10 | Buffer circular |
| Pressão atmosférica (V_pressão) | 0,05 | OWM /weather |

**Amplificação ×1,20** quando `fator_lençol ≥ 0,70` E `chuvaFutura24h ≥ 5 mm`

**Ruptura imediata:** umidade ≥ 30% → `fatorRisco = 1,0` (independente da equação)

| Nível | Índice | Ação |
|-------|--------|------|
| 🟢 VERDE | 0–45% | Normal |
| 🟡 AMARELO | 46–75% | Monitoramento intensivo |
| 🔴 VERMELHO | > 75% | Evacuação recomendada |

### Confiabilidade do sistema

| Condição | Desconto |
|----------|----------|
| Sensor com falha (ADC=1024) | -40% |
| BNDMET indisponível | -25% |
| Qualidade BNDMET < 80% | -10% |
| OWM indisponível | -15% |
| WiFi desconectado | -10% |
| Buffer insuficiente (< 5 leituras) | -10% |
| RUPTURA ativa | 100% fixo |

**Confiabilidade máxima operacional normal:** 90% (com BNDMET qualidade 76% e OWM OK)

---

## Configurações de IP e Rede

O ESP8266 envia dados para o IP fixo do servidor backend na rede local:

- **IP do servidor:** `192.168.1.108` (reserva DHCP configurada no roteador)
- **Porta:** `3001`
- **Endpoint:** `http://192.168.1.108:3001/api/sensor/dados`

Para verificar conectividade entre o Arduino e o backend:
```
http://192.168.1.108:3001/api/sensor/status
```

---

## Suporte

- **Email**: thamires.santos@grad.iprj.uerj.br
- **Documentação API**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/health
- **GitHub**: https://github.com/ramosth/sistema-bndmet