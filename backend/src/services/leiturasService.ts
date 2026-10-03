// backend > src > services > leiturasService.ts
// Recebe o JSON do dispositivo, grava a leitura e verifica se houve
// "nível subiu" ou evento de energia (que geram e-mail automático aos administradores).

import { Leitura } from '@prisma/client';
import prisma from '../config/database';
import { HttpError } from '../middleware';
import { EventosService } from './eventosService';
import { NIVEIS, Nivel, ORDEM_NIVEL } from '../config/niveis';


const ESTADOS_BATERIA = ['NORMAL', 'BAIXA', 'CRITICA', 'FALHA'];
const LIMITE_PADRAO = 500;
const LIMITE_MAXIMO = 5000;

// ── Validação do JSON enviado pelo firmware ─────────────────────────────────

function numeroOuNulo(corpo: any, campo: string, min: number, max: number): number | null {
  const valor = corpo[campo] ?? corpo[campo.toLowerCase()];
  if (valor === undefined || valor === null) return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new HttpError(400, `Campo "${campo}" inválido: esperado número entre ${min} e ${max} ou null.`);
  }
  return n;
}

function booleano(corpo: any, campo: string): boolean {
  const valor = corpo[campo];
  if (valor === undefined || valor === null) return false;
  if (typeof valor !== 'boolean') throw new HttpError(400, `Campo "${campo}" deve ser true ou false.`);
  return valor;
}

function inteiro(corpo: any, campo: string, min: number, max: number): number {
  const valor = corpo[campo];
  if (valor === undefined || valor === null) return 0;
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    throw new HttpError(400, `Campo "${campo}" inválido: esperado inteiro entre ${min} e ${max}.`);
  }
  return valor;
}

export function validarLeitura(corpo: any) {
  if (!corpo || typeof corpo !== 'object') throw new HttpError(400, 'Corpo JSON ausente.');

  const nivel = String(corpo.nivel || '').toUpperCase();
  if (!NIVEIS.includes(nivel as Nivel)) {
    throw new HttpError(400, 'Campo "nivel" obrigatório: VERDE, AMARELO ou VERMELHO.');
  }

  const evento = corpo.evento ?? 'ciclo';
  if (evento !== 'ciclo' && evento !== 'energia') {
    throw new HttpError(400, 'Campo "evento" deve ser "ciclo" ou "energia".');
  }

  let estadoBateria: string | null = null;
  if (corpo.estadoBateria !== undefined && corpo.estadoBateria !== null) {
    estadoBateria = String(corpo.estadoBateria).toUpperCase();
    if (!ESTADOS_BATERIA.includes(estadoBateria)) {
      throw new HttpError(400, 'Campo "estadoBateria" deve ser NORMAL, BAIXA, CRITICA ou FALHA.');
    }
  }

  let rede: boolean | null = null;
  if (corpo.rede !== undefined && corpo.rede !== null) {
    if (typeof corpo.rede !== 'boolean') throw new HttpError(400, 'Campo "rede" deve ser true ou false.');
    rede = corpo.rede;
  }

  // Dados de chuva incompletos (falta uma parcela ou um dia do BNDMET): o firmware
  // manda P72 = null e o mínimo garantido em p72Minimo. Fora desse caso, p72Minimo
  // não tem significado e é descartado.
  const chuvaIncompleta = booleano(corpo, 'chuvaIncompleta');
  const p72Minimo = numeroOuNulo(corpo, 'p72Minimo', 0, 10000);

  return {
    evento,
    nivel,
    s: numeroOuNulo(corpo, 'S', 0, 1),
    p48: numeroOuNulo(corpo, 'P48', 0, 10000),
    p24: numeroOuNulo(corpo, 'P24', 0, 10000),
    p72: numeroOuNulo(corpo, 'P72', 0, 10000),
    p72Minimo: chuvaIncompleta ? p72Minimo : null,
    p48DiasNulos: inteiro(corpo, 'p48DiasNulos', 0, 31),
    rede,
    vbat: numeroOuNulo(corpo, 'vbat', 0, 10),
    estadoBateria,
    sensorIndisponivel: booleano(corpo, 'sensorIndisponivel'),
    p48Indisponivel: booleano(corpo, 'p48Indisponivel'),
    p24Indisponivel: booleano(corpo, 'p24Indisponivel'),
    chuvaIncompleta,
    semDadosChuva: booleano(corpo, 'semDadosChuva'),
    p72Injetado: booleano(corpo, 'p72Injetado'),
    simulacao: booleano(corpo, 'simulacao'),
  };
}

// ── Formato de saída (Decimal do Prisma -> número) ──────────────────────────

const num = (d: any) => (d === null || d === undefined ? null : Number(d));

export function formatarLeitura(l: Leitura) {
  return {
    id: l.id,
    criadoEm: l.criadoEm.toISOString(),
    evento: l.evento,
    nivel: l.nivel,
    S: num(l.s),
    P48: num(l.p48),
    P24: num(l.p24),
    P72: num(l.p72),
    p72Minimo: num(l.p72Minimo),
    p48DiasNulos: l.p48DiasNulos,
    rede: l.rede,
    vbat: num(l.vbat),
    estadoBateria: l.estadoBateria,
    sensorIndisponivel: l.sensorIndisponivel,
    p48Indisponivel: l.p48Indisponivel,
    p24Indisponivel: l.p24Indisponivel,
    chuvaIncompleta: l.chuvaIncompleta,
    semDadosChuva: l.semDadosChuva,
    p72Injetado: l.p72Injetado,
    simulacao: l.simulacao,
  };
}

// ── Regras de evento ────────────────────────────────────────────────────────

export function nivelSubiu(anterior: Leitura | null, nova: Leitura): boolean {
  const antes = anterior ? ORDEM_NIVEL[anterior.nivel] : ORDEM_NIVEL.VERDE;
  return ORDEM_NIVEL[nova.nivel] > antes;
}

// Lista as mudanças de energia entre a leitura anterior e a nova.
// Se o firmware marcou evento "energia" mas não há leitura anterior para
// comparar, descreve o estado atual.
export function mudancasEnergia(anterior: Leitura | null, nova: Leitura): string[] {
  const mudancas: string[] = [];
  const v = nova.vbat !== null ? ` (${Number(nova.vbat).toFixed(2).replace('.', ',')} V)` : '';
  const comparar = anterior !== null;

  if (nova.rede !== null && (!comparar || anterior.rede !== nova.rede)) {
    if (nova.rede === false) mudancas.push('Falta de rede elétrica: dispositivo operando na bateria.');
    else if (comparar && anterior.rede === false) mudancas.push('Rede elétrica restabelecida.');
  }

  if (nova.estadoBateria !== null && (!comparar || anterior.estadoBateria !== nova.estadoBateria)) {
    const textos: Record<string, string> = {
      BAIXA: `Bateria baixa${v}.`,
      CRITICA: `Bateria crítica${v}: próxima da tensão de corte.`,
      FALHA: 'Falha na bateria: não completou a recarga no tempo previsto. Substituir.',
      // "voltou ao normal" só quando a anterior tinha estado conhecido e diferente
      NORMAL: comparar && anterior.estadoBateria !== null ? `Bateria voltou ao estado normal${v}.` : '',
    };
    if (textos[nova.estadoBateria]) mudancas.push(textos[nova.estadoBateria]);
  }

  return mudancas;
}

// ── Operações ───────────────────────────────────────────────────────────────

export class LeiturasService {
  static async salvar(corpo: any) {
    const dados = validarLeitura(corpo);
    const anterior = await prisma.leitura.findFirst({ orderBy: { id: 'desc' } });
    const nova = await prisma.leitura.create({ data: dados });

    const eventos: { tipo: string; descricao: string }[] = [];

    if (nivelSubiu(anterior, nova)) {
      const de = anterior ? anterior.nivel : 'VERDE';
      const ev = await EventosService.nivelSubiu(de, nova);
      eventos.push({ tipo: ev.tipo, descricao: ev.descricao });
    }

    const energia = mudancasEnergia(anterior, nova);
    if (energia.length > 0) {
      const ev = await EventosService.energia(energia, nova);
      eventos.push({ tipo: ev.tipo, descricao: ev.descricao });
    }

    return { leitura: formatarLeitura(nova), eventos };
  }

  static async ultima() {
    const l = await prisma.leitura.findFirst({ orderBy: { id: 'desc' } });
    if (!l) throw new HttpError(404, 'Nenhuma leitura recebida ainda.');
    return formatarLeitura(l);
  }

  // inicio/fim em ISO 8601 (ex.: 2026-10-03T00:00:00Z). Sem datas: últimas 24 h.
  static async listar(inicio?: string, fim?: string, limite?: string) {
    const dataFim = fim ? new Date(fim) : new Date();
    const dataInicio = inicio ? new Date(inicio) : new Date(dataFim.getTime() - 24 * 3600 * 1000);
    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
      throw new HttpError(400, 'Datas inválidas. Use ISO 8601, ex.: 2026-10-03T00:00:00Z');
    }
    if (dataInicio > dataFim) throw new HttpError(400, '"inicio" deve ser anterior a "fim".');

    const take = Math.min(Number(limite) || LIMITE_PADRAO, LIMITE_MAXIMO);
    // Pega as mais recentes do período e devolve em ordem cronológica (para o gráfico)
    const lista = (
      await prisma.leitura.findMany({
        where: { criadoEm: { gte: dataInicio, lte: dataFim } },
        orderBy: { criadoEm: 'desc' },
        take,
      })
    ).reverse();

    return {
      inicio: dataInicio.toISOString(),
      fim: dataFim.toISOString(),
      total: lista.length,
      leituras: lista.map(formatarLeitura),
    };
  }
}
