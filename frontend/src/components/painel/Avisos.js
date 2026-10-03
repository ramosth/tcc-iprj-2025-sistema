// ============= src/components/painel/Avisos.js =============
// Avisos de dado indisponível ou incompleto (flags enviadas pelo dispositivo) e de conexão.
'use client';

import { AlertTriangle, WifiOff } from 'lucide-react';
import { LIMIARES } from '@/config/niveis';
import { numero } from '@/utils/formato';

// Flags do JSON do firmware (sketch_v3, P5 Parte B):
// - semDadosChuva   = nenhuma parcela de chuva obtida (nem P48 nem P24);
// - chuvaIncompleta = falta uma parcela ou um dia do BNDMET. P72 vem null e
//   p72Minimo traz o mínimo garantido. Mínimo >= P1: o nível usou o mínimo;
//   mínimo < P1: o nível foi definido como "sem dados de chuva".
// - p48DiasNulos    = dias sem registro na estação (P48 é um valor mínimo).
export function avisosDaLeitura(l) {
  if (!l) return [];
  const lista = [];
  const indisponivel = (texto) => lista.push({ titulo: 'Dado indisponível.', texto });
  const incompleto = (texto) => lista.push({ titulo: 'Dado incompleto.', texto });

  if (l.sensorIndisponivel) {
    indisponivel('Sensor de umidade (higrômetro) indisponível: sem saturação do solo (S) nesta leitura.');
  }
  if (l.p48Indisponivel) indisponivel('Chuva observada nas últimas 48 h (BNDMET) indisponível.');
  if (l.p24Indisponivel) indisponivel('Previsão de chuva para as próximas 24 h (OpenWeatherMap) indisponível.');
  if (l.p48DiasNulos > 0) {
    incompleto(`${l.p48DiasNulos} dia(s) sem registro na estação BNDMET: P48 é um valor mínimo.`);
  }

  // A chuva entrou na regra? (P72 completo, ou mínimo garantido >= P1)
  const minimo = l.chuvaIncompleta ? l.p72Minimo : null;
  const minimoUsado = minimo !== null && minimo !== undefined && minimo >= LIMIARES.P1;

  // "Sem dados de chuva" aparece SÓ com semDadosChuva = true (nenhuma parcela obtida)
  if (l.semDadosChuva) {
    indisponivel(
      l.sensorIndisponivel
        ? 'Sem dados de chuva e sem saturação do solo: o nível não pôde usar nenhuma das duas variáveis.'
        : 'Sem dados de chuva (BNDMET e OpenWeatherMap): o nível foi definido só com a saturação do solo.',
    );
  } else if (l.chuvaIncompleta) {
    const mm = minimo !== null && minimo !== undefined ? `${numero(minimo, 1)} mm` : '? mm (mínimo não informado)';
    if (minimoUsado) {
      incompleto(`Dados de chuva incompletos — P72 ≥ ${mm}. O nível foi definido com esse mínimo.`);
    } else {
      incompleto(
        `Dados de chuva incompletos — P72 ≥ ${mm}, abaixo do limiar de atenção (${LIMIARES.P1} mm): ` +
          (l.sensorIndisponivel
            ? 'a chuva não entrou na regra e, sem saturação do solo, o nível não pôde usar nenhuma das duas variáveis.'
            : 'a chuva não entrou na regra e o nível foi definido só com a saturação do solo.'),
      );
    }
  }

  if (l.sensorIndisponivel && !l.semDadosChuva && (!l.chuvaIncompleta || minimoUsado)) {
    lista.push({
      titulo: 'Dado indisponível.',
      texto: minimoUsado
        ? 'O nível foi definido só com o mínimo garantido da chuva de 72 h (P72).'
        : 'O nível foi definido só com a chuva de 72 h (P72).',
    });
  }
  return lista;
}

export default function Avisos({ leitura, erroConexao }) {
  const lista = avisosDaLeitura(leitura);
  if (!erroConexao && lista.length === 0) return null;

  return (
    <section className="avisos" role="alert">
      {erroConexao && (
        <p>
          <WifiOff size={18} aria-hidden />
          <span>
            <strong>Sem conexão com o servidor.</strong> {erroConexao} Os dados abaixo podem estar desatualizados.
          </span>
        </p>
      )}
      {lista.map((a) => (
        <p key={a.texto}>
          <AlertTriangle size={18} aria-hidden />
          <span>
            <strong>{a.titulo}</strong> {a.texto}
          </span>
        </p>
      ))}
    </section>
  );
}
