# Sistema de Monitoramento de Barragem de Rejeito — v3-simples

API (Node.js + TypeScript + Express + Prisma) e banco PostgreSQL do TCC (IPRJ/UERJ).
O dispositivo (ESP32 na simulação Wokwi ou ESP8266 no protótipo físico) calcula o
nível de alerta (VERDE, AMARELO ou VERMELHO) e envia um JSON para a API. A API guarda
as leituras, avisa os administradores por e-mail quando o nível sobe ou quando muda a
situação de energia, e permite ao administrador enviar o alerta aos moradores cadastrados.

```
Dispositivo ──POST /leituras──► API ──► PostgreSQL (leituras, eventos)
                                 │
                                 ├─► e-mail automático aos administradores
                                 │     (nível subiu / evento de energia)
Painel (admin) ──POST /alertas──►└─► e-mail VERDE/AMARELO/VERMELHO aos usuários básicos
Landing page ──POST /usuarios──► cadastro do usuário básico
```

---

## 1. Rotas

As rotas respondem na raiz (`http://localhost:3001/leituras`) e também com o prefixo
`/api` (`http://localhost:3001/api/leituras`), usado pelo frontend.

| Método | Rota | Acesso | Para quê |
|---|---|---|---|
| POST | `/leituras` | dispositivo | Grava a leitura e gera os eventos |
| GET | `/leituras/ultima` | público | Última leitura |
| GET | `/leituras?inicio=&fim=&limite=` | público | Histórico (datas ISO 8601; sem datas = últimas 24 h; padrão 500, máx. 5000 leituras) |
| POST | `/usuarios` | público | Cadastro do usuário básico (nome, e-mail, telefone, localidade) |
| POST | `/auth/login` | público | Login do administrador (devolve o token) |
| POST | `/auth/logout` | público | Logout (o frontend descarta o token) |
| GET | `/usuarios` | admin | Lista dos usuários básicos |
| GET | `/alertas/modelos` | admin | Mensagens-modelo dos 3 níveis já preenchidas com a última leitura |
| POST | `/alertas` | admin | Envia o e-mail do nível escolhido aos usuários básicos ativos |
| GET | `/eventos?tipo=&limite=` | admin | Histórico: `NIVEL_SUBIU`, `ENERGIA`, `ALERTA_MANUAL` |
| GET | `/health` | público | Situação da API e do banco |

Rotas "admin" exigem o cabeçalho `Authorization: Bearer <token>`.

### JSON enviado pelo dispositivo (`POST /leituras`)

```json
{"evento":"ciclo","nivel":"AMARELO","S":0.75,"P48":30,"P24":50,"P72":80,
 "rede":true,"vbat":4.20,"estadoBateria":"NORMAL","sensorIndisponivel":false,
 "p48Indisponivel":false,"p24Indisponivel":false,"semDadosChuva":false,
 "p72Injetado":false,"simulacao":true}
```

- Obrigatório: `nivel`. Os demais podem faltar ou vir `null`.
- `evento`: `"ciclo"` (leitura periódica) ou `"energia"` (mudou a rede ou a bateria).
- O protótipo físico não envia `rede`, `vbat` nem `estadoBateria` (ficam nulos).

---

## 2. Banco de dados (4 tabelas)

| Tabela | Conteúdo |
|---|---|
| `leituras` | Uma linha por JSON recebido: nível, S, P48, P24, P72, energia e avisos de dado indisponível |
| `eventos` | Nível subiu, evento de energia e alerta enviado pelo administrador (com quem enviou e quantos receberam) |
| `usuarios_basicos` | Moradores que pediram para receber alertas |
| `administradores` | Quem faz login no painel |

O script `database/init/01-schema.sql` cria as tabelas. O `backend/prisma/schema.prisma`
descreve as mesmas tabelas para o Prisma (os dois arquivos devem andar juntos).

---

## 3. E-mails

| Quando | Para quem | Conteúdo |
|---|---|---|
| O nível sobe (VERDE→AMARELO, AMARELO→VERMELHO ou VERDE→VERMELHO) | administradores ativos | Nível anterior e atual, S, P48, P24, P72, avisos |
| Muda a rede (falta / volta) ou o estado da bateria (BAIXA, CRITICA, FALHA, volta ao NORMAL) | administradores ativos | O que mudou, tensão da bateria, nível atual |
| O administrador clica em enviar no painel | usuários básicos ativos | Mensagem-modelo do nível escolhido (pode ser editada) |

- Cada envio fica registrado na tabela `eventos` (destinatários, enviados, falhas).
- Leituras da simulação ou com chuva injetada pelo comando `chuva` saem marcadas no e-mail.
- Sem `SMTP_*` no `.env`, nada é enviado de verdade: o e-mail aparece no console como `[SIMULADO]`.

---

## 4. Passo a passo para rodar

### 4.1 Pré-requisitos

- Docker Desktop (com Docker Compose)
- Node.js 20 ou superior (só para rodar o backend fora do Docker)
- Git

### 4.2 Baixar e trocar para a branch

```bash
git clone https://github.com/ramosth/tcc-iprj-2025-sistema.git sistema-bndmet
cd sistema-bndmet
git checkout v3-simples
```

### 4.3 Configurar o `.env`

Copie o modelo e preencha `JWT_SECRET` e, se quiser e-mail de verdade, `SMTP_USER` e `SMTP_PASS`
(no Gmail, use uma "senha de app"):

```bash
cp backend/.env.example .env           # usado pelo docker-compose
cp backend/.env.example backend/.env   # usado pelo backend fora do Docker
```

### 4.4 Subir tudo com Docker

Na **primeira vez nesta branch**, apague o volume antigo do banco. Sem isso o PostgreSQL
não roda o `01-schema.sql` e as tabelas novas não são criadas:

```bash
docker compose down -v
docker compose up -d --build
```

No dia a dia (mantendo os dados):

```bash
docker compose up -d      # liga
docker compose down       # desliga
docker compose logs -f backend   # acompanha o log (e-mails aparecem aqui)
```

Conferir:

- API: http://localhost:3001/health → `"status":"ok"`
- Adminer: http://localhost:8081 (sistema PostgreSQL, servidor `postgres`, usuário `admin`, senha `senha123`, base `bndmet`)

### 4.5 (Opcional) Rodar o backend fora do Docker

Útil para desenvolver. Deixe só o banco no Docker:

```bash
docker compose up -d postgres
cd backend
npm install
npx prisma generate
npm run dev
```

### 4.6 Ligar a simulação Wokwi

No projeto `projeto_tcc_wokwi`, arquivo `sketch_v3/secrets.h`, `API_BASE_URL` deve
apontar para o computador onde a API está rodando, na porta 3001 (sem `/api` no final):

```c
#define API_BASE_URL "http://172.29.224.1:3001"
```

A cada ciclo o serial mostra `[BACKEND] POST /leituras -> 201` quando a API recebeu.

---

## 5. Testar a API

Os exemplos usam `curl` no Git Bash. No PowerShell, troque `curl` por `curl.exe`.

```bash
# 1) Enviar uma leitura (como o dispositivo)
curl -X POST http://localhost:3001/leituras -H "Content-Type: application/json" \
  -d '{"evento":"ciclo","nivel":"VERDE","S":0.40,"P48":10,"P24":5,"P72":15,"rede":true,"vbat":4.2,"estadoBateria":"NORMAL","simulacao":true}'

# 2) Fazer o nível subir (gera e-mail aos administradores)
curl -X POST http://localhost:3001/leituras -H "Content-Type: application/json" \
  -d '{"evento":"ciclo","nivel":"AMARELO","S":0.75,"P72":80,"rede":true,"vbat":4.2,"estadoBateria":"NORMAL","p72Injetado":true,"simulacao":true}'

# 3) Evento de energia: falta de rede
curl -X POST http://localhost:3001/leituras -H "Content-Type: application/json" \
  -d '{"evento":"energia","nivel":"AMARELO","S":0.75,"P72":80,"rede":false,"vbat":4.1,"estadoBateria":"NORMAL","simulacao":true}'

# 4) Consultar
curl http://localhost:3001/leituras/ultima
curl "http://localhost:3001/leituras?inicio=2026-10-01T00:00:00Z"

# 5) Cadastrar um morador
curl -X POST http://localhost:3001/usuarios -H "Content-Type: application/json" \
  -d '{"nome":"Maria","email":"maria@exemplo.com","localidade":"Brumadinho"}'

# 6) Login do administrador e envio de alerta
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@bndmet.com","senha":"admin123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl http://localhost:3001/alertas/modelos -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:3001/alertas -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" -d '{"nivel":"AMARELO"}'
curl http://localhost:3001/eventos -H "Authorization: Bearer $TOKEN"
```

Administrador padrão criado pelo `01-schema.sql`: `admin@bndmet.com` / `admin123`.

---

## 6. Estrutura

```
sistema-bndmet/
├── docker-compose.yml          PostgreSQL + Adminer + backend
├── database/init/01-schema.sql cria as 4 tabelas e o administrador padrão
├── backend/
│   ├── .env.example
│   ├── prisma/schema.prisma    mesmas 4 tabelas, para o Prisma
│   └── src/
│       ├── server.ts           liga a API
│       ├── app.ts              middlewares e montagem das rotas
│       ├── routes/index.ts     todas as rotas (lista no topo do arquivo)
│       ├── middleware/         CORS, erros, log, limite de login, token do admin
│       ├── config/             .env, banco, níveis de alerta
│       └── services/
│           ├── leiturasService.ts  valida e grava o JSON; detecta nível subiu e energia
│           ├── eventosService.ts   registra eventos, mensagens-modelo e envios
│           ├── emailService.ts     envio por SMTP (nodemailer)
│           ├── usuariosService.ts  cadastro e lista de usuários básicos
│           └── authService.ts      login do administrador
└── frontend/                   Next.js (adaptado na etapa do frontend)
```

---

Contato: thamires.santos@grad.iprj.uerj.br
