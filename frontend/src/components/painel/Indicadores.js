// ============= src/components/painel/Indicadores.js =============
// S, P48, P24 e P72 da última leitura, com os limiares de referência.
// Dados de chuva incompletos (chuvaIncompleta = true): o cartão P72 mostra
// "Dados de chuva incompletos — P72 ≥ <p72Minimo> mm". P48 com p48DiasNulos > 0
// aparece como mínimo ("≥ X mm"). "Sem dados de chuva" só com semDadosChuva = true.
'use client';

import { LIMIARES } from '@/config/niveis';
import { numero } from '@/utils/formato';

function faixa(valor, atencao, alerta) {
  if (valor === null || valor === undefined) return null;
  if (valor >= alerta) return 'Acima do limiar de alerta';
  if (valor >= atencao) return 'Acima do limiar de atenção';
  return 'Abaixo do limiar de atenção';
}

// Com valor mínimo, "abaixo" não é certeza: o valor real pode ser maior.
function faixaMinimo(minimo, atencao, alerta) {
  if (minimo === null || minimo === undefined) return null;
  if (minimo >= alerta) return 'Mínimo acima do limiar de alerta';
  if (minimo >= atencao) return 'Mínimo acima do limiar de atenção';
  return 'Mínimo abaixo do limiar de atenção (o valor real pode ser maior)';
}

// Cartão do P72 quando chuvaIncompleta = true: a frase substitui o valor de P72.
function IndicadorP72Incompleto({ minimo }) {
  const temMinimo = minimo !== null && minimo !== undefined;
  return (
    <article className="indicador indicador-incompleto">
      <p className="indicador-sigla">
        P72 <span>chuva de 72 h</span>
      </p>
      <p className="indicador-valor indicador-valor-texto">
        Dados de chuva incompletos — P72 ≥ {temMinimo ? numero(minimo, 1) : '?'} mm
      </p>
      {temMinimo && <p className="indicador-situacao">{faixaMinimo(minimo, LIMIARES.P1, LIMIARES.P2)}</p>}
      <p className="indicador-detalhe">
        Soma do que foi obtido (mínimo garantido). Atenção ≥ {LIMIARES.P1} mm · Alerta ≥ {LIMIARES.P2} mm (
        {LIMIARES.fonteP}).
      </p>
    </article>
  );
}

function Indicador({ sigla, nome, valor, unidade, indisponivel, textoIndisponivel, naoUsado, detalhe, situacao }) {
  if (naoUsado) {
    return (
      <article className="indicador">
        <p className="indicador-sigla">
          {sigla} <span>{nome}</span>
        </p>
        <p className="indicador-valor">—</p>
        <p className="indicador-detalhe">Não usada nesta leitura: P72 injetado para teste.</p>
      </article>
    );
  }

  return (
    <article className={`indicador ${indisponivel ? 'indicador-indisponivel' : ''}`}>
      <p className="indicador-sigla">
        {sigla} <span>{nome}</span>
      </p>
      <p className="indicador-valor">
        {indisponivel ? textoIndisponivel || 'indisponível' : valor}
        {!indisponivel && unidade && <small> {unidade}</small>}
      </p>
      {situacao && !indisponivel && <p className="indicador-situacao">{situacao}</p>}
      <p className="indicador-detalhe">{detalhe}</p>
    </article>
  );
}

export default function Indicadores({ leitura }) {
  const l = leitura || {};
  const semS = !leitura || l.sensorIndisponivel || l.S === null;
  const injetado = !!l.p72Injetado; // teste: o firmware envia P48 e P24 nulos
  const semP48 = !leitura || l.p48Indisponivel || l.P48 === null;
  const semP24 = !leitura || l.p24Indisponivel || l.P24 === null;
  const p48Minimo = !semP48 && l.p48DiasNulos > 0; // dia sem registro: P48 é um mínimo
  const incompleta = !!leitura && !!l.chuvaIncompleta && !l.semDadosChuva && !l.p72Injetado;
  const semP72 = !leitura || l.P72 === null;

  return (
    <section className="indicadores" aria-label="Variáveis da última leitura">
      <Indicador
        sigla="S"
        nome="saturação do solo"
        valor={numero(l.S, 2)}
        indisponivel={semS}
        situacao={faixa(l.S, LIMIARES.S1, LIMIARES.S2)}
        detalhe={`Escala 0 a 1. Atenção ≥ ${numero(LIMIARES.S1, 2)} · Alerta ≥ ${numero(LIMIARES.S2, 2)} (${LIMIARES.fonteS}).`}
      />
      <Indicador
        sigla="P48"
        nome="chuva observada"
        valor={p48Minimo ? `≥ ${numero(l.P48, 1)}` : numero(l.P48, 1)}
        unidade="mm"
        indisponivel={semP48}
        naoUsado={injetado && l.P48 === null}
        detalhe={
          p48Minimo
            ? `Acumulada nas últimas 48 h (BNDMET). ${l.p48DiasNulos} dia(s) sem registro na estação BNDMET: valor mínimo.`
            : 'Acumulada nas últimas 48 h (BNDMET).'
        }
      />
      <Indicador
        sigla="P24"
        nome="chuva prevista"
        valor={numero(l.P24, 1)}
        unidade="mm"
        indisponivel={semP24}
        naoUsado={injetado && l.P24 === null}
        detalhe="Prevista para as próximas 24 h (OpenWeatherMap)."
      />
      {incompleta ? (
        <IndicadorP72Incompleto minimo={l.p72Minimo} />
      ) : (
        <Indicador
          sigla="P72"
          nome={l.p72Injetado ? 'chuva de 72 h (injetada para teste)' : 'chuva de 72 h'}
          valor={numero(l.P72, 1)}
          unidade="mm"
          indisponivel={semP72}
          textoIndisponivel={l.semDadosChuva ? 'Sem dados de chuva' : undefined}
          situacao={faixa(l.P72, LIMIARES.P1, LIMIARES.P2)}
          detalhe={`P48 + P24. Atenção ≥ ${LIMIARES.P1} mm · Alerta ≥ ${LIMIARES.P2} mm (${LIMIARES.fonteP}).`}
        />
      )}
    </section>
  );
}
