// ============= src/components/painel/Avisos.js =============
// Avisos de dado indisponível (flags enviadas pelo dispositivo) e de conexão.
'use client';

import { AlertTriangle, WifiOff } from 'lucide-react';

// Flags do JSON do firmware (sketch_v3): semDadosChuva = P48 OU P24 indisponível,
// pois P72 = P48 + P24 só existe com as duas parcelas.
export function avisosDaLeitura(l) {
  if (!l) return [];
  const lista = [];
  if (l.sensorIndisponivel) {
    lista.push('Sensor de umidade (higrômetro) indisponível: sem saturação do solo (S) nesta leitura.');
  }
  if (l.p48Indisponivel) lista.push('Chuva observada nas últimas 48 h (BNDMET) indisponível.');
  if (l.p24Indisponivel) lista.push('Previsão de chuva para as próximas 24 h (OpenWeatherMap) indisponível.');
  if (l.semDadosChuva) {
    lista.push(
      l.sensorIndisponivel
        ? 'Sem chuva de 72 h (P72) e sem saturação do solo: o nível não pôde usar nenhuma das duas variáveis.'
        : 'Sem chuva de 72 h (P72): o nível foi definido só com a saturação do solo.',
    );
  } else if (l.sensorIndisponivel) {
    lista.push('O nível foi definido só com a chuva de 72 h (P72).');
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
      {lista.map((texto) => (
        <p key={texto}>
          <AlertTriangle size={18} aria-hidden />
          <span>
            <strong>Dado indisponível.</strong> {texto}
          </span>
        </p>
      ))}
    </section>
  );
}
