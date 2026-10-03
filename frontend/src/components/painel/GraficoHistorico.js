// ============= src/components/painel/GraficoHistorico.js =============
// Histórico de S e de P72. Dois gráficos separados (escalas diferentes, sem eixo duplo).
// Linhas tracejadas = limiares de atenção e de alerta. Falha de dado aparece como intervalo na linha.
'use client';

import { useEffect, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { leiturasApi, mensagemErro } from '@/services/api';
import { LIMIARES } from '@/config/niveis';
import { dataHora, horaCurta, numero } from '@/utils/formato';

const PERIODOS = [
  { id: '24h', rotulo: '24 horas', horas: 24 },
  { id: '7d', rotulo: '7 dias', horas: 24 * 7 },
  { id: '30d', rotulo: '30 dias', horas: 24 * 30 },
];

const COR_SERIE = '#2563eb';
const COR_ATENCAO = '#b45309';
const COR_ALERTA = '#b91c1c';

function DicaTooltip({ active, payload, campo, casas, unidade }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const valor = p[campo];
  return (
    <div className="dica-grafico">
      <strong>{dataHora(p.criadoEm)}</strong>
      <span>
        {campo}: {valor === null ? 'indisponível' : `${numero(valor, casas)}${unidade ? ` ${unidade}` : ''}`}
      </span>
      <span>Nível: {p.nivel}</span>
    </div>
  );
}

function Grafico({ titulo, dados, campo, dominio, casas, unidade, atencao, alerta, fonte, comDia }) {
  return (
    <figure className="grafico">
      <figcaption>{titulo}</figcaption>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dados} margin={{ top: 8, right: 84, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ms) => horaCurta(ms, comDia)}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#d1d5db"
            minTickGap={40}
          />
          <YAxis
            domain={dominio}
            ticks={casas === 2 ? [0, 0.2, 0.4, 0.6, 0.8, 1] : undefined}
            tickFormatter={(v) => numero(v, casas === 2 ? 1 : 0)}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#d1d5db"
            width={44}
          />
          <ReferenceLine
            y={atencao}
            stroke={COR_ATENCAO}
            strokeDasharray="5 4"
            label={{ value: `Atenção ${numero(atencao, casas === 2 ? 2 : 0)}`, position: 'right', fontSize: 11, fill: '#374151' }}
          />
          <ReferenceLine
            y={alerta}
            stroke={COR_ALERTA}
            strokeDasharray="5 4"
            label={{ value: `Alerta ${numero(alerta, casas === 2 ? 2 : 0)}`, position: 'right', fontSize: 11, fill: '#374151' }}
          />
          <Tooltip content={<DicaTooltip campo={campo} casas={casas} unidade={unidade} />} />
          <Line
            type="monotone"
            dataKey={campo}
            stroke={COR_SERIE}
            strokeWidth={2}
            dot={dados.length <= 60 ? { r: 3 } : false}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="nota">Limiares: {fonte}.</p>
    </figure>
  );
}

export default function GraficoHistorico({ versao }) {
  const [periodo, setPeriodo] = useState('24h');
  const [dados, setDados] = useState([]);
  const [erro, setErro] = useState('');
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let ativo = true;
    const horas = PERIODOS.find((p) => p.id === periodo).horas;
    const fim = new Date();
    const inicio = new Date(fim.getTime() - horas * 3600 * 1000);

    leiturasApi
      .historico(inicio.toISOString(), fim.toISOString())
      .then((r) => {
        if (!ativo) return;
        setDados(r.leituras.map((l) => ({ ...l, t: new Date(l.criadoEm).getTime() })));
        setErro('');
      })
      .catch((e) => ativo && setErro(mensagemErro(e)))
      .finally(() => ativo && setCarregado(true));

    return () => {
      ativo = false;
    };
  }, [periodo, versao]);

  const comDia = periodo !== '24h';

  return (
    <section className="cartao historico">
      <div className="cabecalho-secao">
        <h2>Histórico</h2>
        <div className="seletor" role="group" aria-label="Período do histórico">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={periodo === p.id ? 'ativo' : ''}
              aria-pressed={periodo === p.id}
              onClick={() => setPeriodo(p.id)}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="erro-form">{erro}</p>}
      {carregado && !erro && dados.length === 0 && <p className="texto-suave">Nenhuma leitura no período.</p>}

      {dados.length > 0 && (
        <div className="graficos">
          <Grafico
            titulo="Saturação do solo (S)"
            dados={dados}
            campo="S"
            dominio={[0, 1]}
            casas={2}
            atencao={LIMIARES.S1}
            alerta={LIMIARES.S2}
            fonte={LIMIARES.fonteS}
            comDia={comDia}
          />
          <Grafico
            titulo="Chuva de 72 h (P72 = P48 + P24), em mm"
            dados={dados}
            campo="P72"
            dominio={[0, (max) => Math.max(LIMIARES.P2 * 1.2, Math.ceil(max / 20) * 20)]}
            casas={1}
            unidade="mm"
            atencao={LIMIARES.P1}
            alerta={LIMIARES.P2}
            fonte={LIMIARES.fonteP}
            comDia={comDia}
          />
        </div>
      )}
      <p className="nota">{dados.length} leitura(s) no período. Intervalos na linha indicam dado indisponível.</p>
    </section>
  );
}
