// backend > src > routes > index.ts
// Todas as rotas da API em um só lugar.
//
// Dispositivo (público):
//   POST /leituras                 recebe o JSON do ESP32/ESP8266
//   GET  /leituras/ultima          última leitura
//   GET  /leituras?inicio=&fim=    histórico (ISO 8601; padrão: últimas 24 h)
// Site:
//   POST /usuarios                 cadastro do usuário básico (público)
//   POST /auth/login               login do administrador
//   POST /auth/logout              logout (o frontend descarta o token)
//   GET  /usuarios                 lista de usuários básicos       [admin]
//   GET  /alertas/modelos          mensagens-modelo preenchidas    [admin]
//   POST /alertas                  envia e-mail VERDE/AMARELO/VERMELHO aos usuários básicos [admin]
//   GET  /eventos?tipo=&limite=    nível subiu, energia e envios   [admin]
//   GET  /health                   situação do servidor e do banco

import { Router } from 'express';
import prisma from '../config/database';
import { limiteLogin, rota } from '../middleware';
import { exigirAdmin } from '../middleware/authMiddleware';
import { LeiturasService } from '../services/leiturasService';
import { UsuariosService } from '../services/usuariosService';
import { AuthService } from '../services/authService';
import { EventosService } from '../services/eventosService';

const router = Router();

// ── Dispositivo ──────────────────────────────────────────────────────────────

router.post('/leituras', rota(async (req, res) => {
  res.status(201).json({ success: true, data: await LeiturasService.salvar(req.body) });
}));

router.get('/leituras/ultima', rota(async (req, res) => {
  res.json({ success: true, data: await LeiturasService.ultima() });
}));

router.get('/leituras', rota(async (req, res) => {
  const { inicio, fim, limite } = req.query as Record<string, string>;
  res.json({ success: true, data: await LeiturasService.listar(inicio, fim, limite) });
}));

// ── Usuários e login ─────────────────────────────────────────────────────────

router.post('/usuarios', rota(async (req, res) => {
  res.status(201).json({ success: true, data: await UsuariosService.cadastrar(req.body) });
}));

router.post('/auth/login', limiteLogin, rota(async (req, res) => {
  res.json({ success: true, data: await AuthService.login(req.body) });
}));

router.post('/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Sessão encerrada. Descarte o token no navegador.' });
});

router.get('/usuarios', exigirAdmin, rota(async (req, res) => {
  res.json({ success: true, data: await UsuariosService.listar() });
}));

// ── Alertas e eventos ────────────────────────────────────────────────────────

router.get('/alertas/modelos', exigirAdmin, rota(async (req, res) => {
  res.json({ success: true, data: await EventosService.modelos() });
}));

router.post('/alertas', exigirAdmin, rota(async (req, res) => {
  res.status(201).json({ success: true, data: await EventosService.alertaManual(req.admin!, req.body) });
}));

router.get('/eventos', exigirAdmin, rota(async (req, res) => {
  const { limite, tipo } = req.query as Record<string, string>;
  res.json({ success: true, data: await EventosService.listar(limite, tipo) });
}));

// ── Saúde ────────────────────────────────────────────────────────────────────

router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, status: 'ok', banco: 'conectado', hora: new Date().toISOString() });
  } catch {
    res.status(503).json({ success: false, status: 'erro', banco: 'desconectado' });
  }
});

export default router;
