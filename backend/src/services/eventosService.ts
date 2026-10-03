// backend > src > services > eventosService.ts
// Registra eventos na tabela "eventos" e dispara os e-mails:
//  - automáticos (nível subiu / energia) -> administradores ativos;
//  - manuais (o administrador escolhe o nível) -> usuários básicos ativos.

import { Leitura } from '@prisma/client';
import prisma from '../config/database';
import { HttpError } from '../middleware';
import { AdminToken } from '../middleware/authMiddleware';
import { DadosEmail, Destinatario, EmailService } from './emailService';
import { NIVEIS, Nivel } from '../config/niveis';

const TIPOS_EVENTO = ['NIVEL_SUBIU', 'ENERGIA', 'ALERTA_MANUAL'];

// ── Mensagens-modelo (P1_referencias, item d) ───────────────────────────────
// {nome} é trocado no envio; os demais campos vêm da última leitura.

const MODELOS: Record<Nivel, { assunto: string; mensagem: string }> = {
  VERDE: {
    assunto: '[Monitoramento] Nível VERDE – condição normal',
    mensagem: [
      'Olá, {nome}.',
      'Em {data_hora}, o sistema de monitoramento registrou condição normal na área ' +
        'monitorada (saturação do solo {S}; chuva de 72 h {P72}).',
      'Não há necessidade de deslocamento.',
      'Aproveite para conhecer a rota de fuga e o ponto de encontro sinalizados na sua ' +
        'localidade e participe dos simulados promovidos pelo empreendedor e pela Defesa Civil.',
      'Este aviso é informativo e não substitui as sirenes nem as orientações oficiais da Defesa Civil.',
    ].join('\n'),
  },
  AMARELO: {
    assunto: '[Monitoramento] Nível AMARELO – atenção',
    mensagem: [
      'Olá, {nome}.',
      'Em {data_hora}, o sistema de monitoramento registrou solo úmido e chuva acumulada ' +
        'e prevista acima do limite de atenção (saturação do solo {S}; chuva de 72 h {P72}).',
      'Neste momento, não é necessário sair de casa. Prepare-se:',
      '- confirme qual é a rota de fuga e o ponto de encontro sinalizados na sua localidade;',
      '- acompanhe os próximos avisos deste sistema e as orientações da Defesa Civil;',
      '- se a sirene tocar, siga imediatamente as orientações oficiais.',
      'Este aviso não substitui as sirenes nem as orientações oficiais da Defesa Civil.',
      '{aviso_dado_indisponivel}',
    ].join('\n'),
  },
  VERMELHO: {
    assunto: '[Monitoramento] Nível VERMELHO – desloque-se para o ponto de encontro',
    mensagem: [
      'Olá, {nome}.',
      'Em {data_hora}, o sistema de monitoramento registrou solo próximo da saturação e ' +
        'chuva acumulada e prevista acima do limite de alerta (saturação do solo {S}; ' +
        'chuva de 72 h {P72}).',
      'Desloque-se agora para o ponto de encontro, pela rota de fuga sinalizada na sua localidade.',
      'Siga as orientações da Defesa Civil e das equipes de emergência.',
      'Este aviso não substitui as sirenes nem as orientações oficiais da Defesa Civil.',
    ].join('\n'),
  },
};

// ── Ajudantes de texto ──────────────────────────────────────────────────────

const virgula = (n: number, casas: number) => n.toFixed(casas).replace('.', ',');

function dataHora(d: Date): string {
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function textoS(l: Leitura | null) {
  return l && l.s !== null ? virgula(Number(l.s), 2) : 'indisponível';
}

function textoMm(valor: any) {
  return valor !== null && valor !== undefined ? `${virgula(Number(valor), 1)} mm` : 'sem dados';
}

// P48 com dia sem registro na estação é um valor mínimo
function textoP48(l: Leitura) {
  if (l.p48 === null) return 'sem dados';
  if (l.p48DiasNulos > 0) return `≥ ${textoMm(l.p48)} (${l.p48DiasNulos} dia(s) sem registro na estação)`;
  return textoMm(l.p48);
}

// P72 completo; ou, com dados incompletos, o mínimo garantido enviado pelo firmware
function textoP72(l: Leitura | null) {
  if (!l) return 'sem dados';
  if (l.p72 !== null) return textoMm(l.p72);
  if (l.chuvaIncompleta && l.p72Minimo !== null) {
    return `no mínimo ${textoMm(l.p72Minimo)}, com dados de chuva incompletos`;
  }
  return 'sem dados';
}

function avisos(l: Leitura | null): string[] {
  if (!l) return ['Nenhuma leitura recebida do dispositivo até o momento.'];
  const lista: string[] = [];
  if (l.sensorIndisponivel) lista.push('Sensor de umidade indisponível no momento.');
  if (l.semDadosChuva) lista.push('Sem dados de chuva no momento.');
  else {
    if (l.chuvaIncompleta && l.p72Minimo !== null) {
      lista.push(`Dados de chuva incompletos: P72 de no mínimo ${textoMm(l.p72Minimo)}.`);
    }
    if (l.p48Indisponivel) lista.push('Chuva observada (BNDMET) indisponível no momento.');
    if (l.p24Indisponivel) lista.push('Previsão de chuva (OpenWeatherMap) indisponível no momento.');
  }
  return lista;
}

function preencher(mensagem: string, l: Leitura | null): string {
  return mensagem
    .split('{data_hora}').join(dataHora(l ? l.criadoEm : new Date()))
    .split('{S}').join(textoS(l))
    .split('{P72}').join(textoP72(l))
    .split('{aviso_dado_indisponivel}').join(avisos(l).join(' '))
    .trim();
}

// Linhas de rodapé para e-mails automáticos: deixa claro quando é teste (R9)
function marcasTeste(l: Leitura): string[] {
  const m: string[] = [];
  if (l.simulacao) m.push('Leitura vinda da simulação (Wokwi).');
  if (l.p72Injetado) m.push('Chuva de 72 h injetada para teste (comando "chuva").');
  return m;
}

// ── Envio + registro ────────────────────────────────────────────────────────

async function administradoresAtivos(): Promise<Destinatario[]> {
  return prisma.administrador.findMany({ where: { ativo: true }, select: { nome: true, email: true } });
}

async function moradoresAtivos(): Promise<Destinatario[]> {
  return prisma.usuarioBasico.findMany({ where: { ativo: true }, select: { nome: true, email: true } });
}

async function enviarEAtualizar(eventoId: number, destinatarios: Destinatario[], dados: DadosEmail) {
  const r = await EmailService.enviarLote(destinatarios, dados);
  return prisma.evento.update({
    where: { id: eventoId },
    data: { enviados: r.enviados, falhas: r.falhas },
  });
}

// E-mail automático: não segura a resposta ao dispositivo
function enviarEmSegundoPlano(eventoId: number, destinatarios: Destinatario[], dados: DadosEmail) {
  enviarEAtualizar(eventoId, destinatarios, dados).catch((erro) =>
    console.error(`❌ Erro no envio do evento ${eventoId}:`, erro),
  );
}

export class EventosService {
  static async nivelSubiu(de: string, l: Leitura) {
    const admins = await administradoresAtivos();
    const descricao = `Nível subiu de ${de} para ${l.nivel}.`;

    const evento = await prisma.evento.create({
      data: { tipo: 'NIVEL_SUBIU', nivel: l.nivel, descricao, leituraId: l.id, destinatarios: admins.length },
    });

    const mensagem = [
      'Olá, {nome}.',
      `Em ${dataHora(l.criadoEm)}, o nível do monitoramento subiu de ${de} para ${l.nivel}.`,
      `Saturação do solo (S): ${textoS(l)}`,
      `Chuva observada 48 h (P48): ${textoP48(l)}`,
      `Chuva prevista 24 h (P24): ${textoMm(l.p24)}`,
      `Chuva 72 h (P72): ${textoP72(l)}`,
      ...avisos(l),
      ...marcasTeste(l),
      'Acesse o painel para decidir o envio do alerta aos moradores cadastrados.',
    ].join('\n');

    enviarEmSegundoPlano(evento.id, admins, {
      tipo: l.nivel as Nivel,
      assunto: `[Monitoramento] Nível subiu: ${de} → ${l.nivel}`,
      mensagem,
    });
    return evento;
  }

  static async energia(mudancas: string[], l: Leitura) {
    const admins = await administradoresAtivos();
    const descricao = mudancas.join(' ');

    const evento = await prisma.evento.create({
      data: { tipo: 'ENERGIA', nivel: l.nivel, descricao, leituraId: l.id, destinatarios: admins.length },
    });

    const mensagem = [
      'Olá, {nome}.',
      `Em ${dataHora(l.criadoEm)}, o dispositivo informou:`,
      ...mudancas.map((m) => `- ${m}`),
      `Rede elétrica: ${l.rede === null ? 'sem informação' : l.rede ? 'presente' : 'ausente'}`,
      `Bateria: ${l.estadoBateria ?? 'sem informação'}${l.vbat !== null ? ` (${virgula(Number(l.vbat), 2)} V)` : ''}`,
      `Nível atual: ${l.nivel}`,
      ...marcasTeste(l),
    ].join('\n');

    enviarEmSegundoPlano(evento.id, admins, {
      tipo: 'ENERGIA',
      assunto: `[Monitoramento] Energia: ${mudancas[0]}`,
      mensagem,
    });
    return evento;
  }

  // Modelos já preenchidos com a última leitura ({nome} fica para o envio)
  static async modelos() {
    const ultima = await prisma.leitura.findFirst({ orderBy: { id: 'desc' } });
    const resultado: Record<string, { assunto: string; mensagem: string }> = {};
    for (const nivel of NIVEIS) {
      resultado[nivel] = { assunto: MODELOS[nivel].assunto, mensagem: preencher(MODELOS[nivel].mensagem, ultima) };
    }
    return { nivelAtual: ultima?.nivel ?? null, modelos: resultado };
  }

  // Envio manual do administrador para os moradores cadastrados
  static async alertaManual(admin: AdminToken, corpo: any) {
    const nivel = String(corpo?.nivel || '').toUpperCase() as Nivel;
    if (!NIVEIS.includes(nivel)) throw new HttpError(400, 'Campo "nivel" obrigatório: VERDE, AMARELO ou VERMELHO.');

    const ultima = await prisma.leitura.findFirst({ orderBy: { id: 'desc' } });
    const assunto = String(corpo.assunto || MODELOS[nivel].assunto).trim();
    const mensagem = String(corpo.mensagem || preencher(MODELOS[nivel].mensagem, ultima)).trim();
    if (!assunto || !mensagem) throw new HttpError(400, 'Assunto e mensagem não podem ficar vazios.');

    const moradores = await moradoresAtivos();
    if (moradores.length === 0) throw new HttpError(409, 'Nenhum usuário básico ativo cadastrado.');

    const evento = await prisma.evento.create({
      data: {
        tipo: 'ALERTA_MANUAL',
        nivel,
        descricao: `Alerta ${nivel} enviado por ${admin.nome} a ${moradores.length} usuário(s).`,
        leituraId: ultima?.id ?? null,
        administradorId: admin.id,
        destinatarios: moradores.length,
      },
    });

    const atualizado = await enviarEAtualizar(evento.id, moradores, { tipo: nivel, assunto, mensagem });
    return formatarEvento(atualizado, admin.nome);
  }

  static async listar(limite?: string, tipo?: string) {
    const where: any = {};
    if (tipo) {
      const t = tipo.toUpperCase();
      if (!TIPOS_EVENTO.includes(t)) throw new HttpError(400, `"tipo" deve ser ${TIPOS_EVENTO.join(', ')}.`);
      where.tipo = t;
    }
    const lista = await prisma.evento.findMany({
      where,
      orderBy: { id: 'desc' },
      take: Math.min(Number(limite) || 50, 500),
      include: { administrador: { select: { nome: true } } },
    });
    return lista.map((e) => formatarEvento(e, e.administrador?.nome ?? null));
  }
}

function formatarEvento(e: any, nomeAdmin: string | null) {
  return {
    id: e.id,
    criadoEm: e.criadoEm.toISOString(),
    tipo: e.tipo,
    nivel: e.nivel,
    descricao: e.descricao,
    leituraId: e.leituraId,
    enviadoPor: nomeAdmin,
    destinatarios: e.destinatarios,
    enviados: e.enviados,
    falhas: e.falhas,
  };
}
