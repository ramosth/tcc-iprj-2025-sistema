// ============= src/components/painel/Indicadores.js =============
// S, P48, P24 e P72 da última leitura, com os limiares de referência.
// Dados de chuva incompletos: P48 com dia sem registro e P72 nulo aparecem como
// valor mínimo ("≥ X mm"), usando p48DiasNulos e p72Minimo enviados pelo firmware.
'use client';

import { LIMIARES } from '@/config/niveis';
import { numero } from '@/utils/formato';

function faixa(valor, atencao, alerta) {
  if (valor === null || valor === undefined) return null;
  if (valor >= alerta) return 'Acima do limiar de alerta';
  if (valor >= atencao) return 'Acima do limiar de atenção';
  return 'Abaixo do limiar de atenção';
}

function Indicador({ sigla, nome, valor, unidade, indisponivel, naoUsado, detalhe, situacao }) {
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
        {indisponivel ? 'indisponível' : valor}
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
  const temMinimoP72 = l.P72 === null && !!l.chuvaIncompleta && l.p72Minimo !== null && l.p72Minimo !== undefined;
  const semP72 = !leitura || (l.P72 === null && !temMinimoP72);
  const valorP72 = temMinimoP72 ? `≥ ${numero(l.p72Minimo, 1)}` : numero(l.P72, 1);
  const detalheP72 = temMinimoP72
    ? `Dados incompletos: soma do que foi obtido (mínimo garantido). Atenção ≥ ${LIMIARES.P1} mm · Alerta ≥ ${LIMIARES.P2} mm (${LIMIARES.fonteP}).`
    : `P48 + P24. Atenção ≥ ${LIMIARES.P1} mm · Alerta ≥ ${LIMIARES.P2} mm (${LIMIARES.fonteP}).`;

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
            ? `Acumulada nas últimas 48 h (BNDMET). ${l.p48DiasNulos} dia(s) sem registro na estação: valor mínimo.`
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
      <Indicador
        sigla="P72"
        nome={
          l.p72Injetado
            ? 'chuva de 72 h (injetada para teste)'
            : temMinimoP72
              ? 'chuva de 72 h (incompleta)'
              : 'chuva de 72 h'
        }
        valor={valorP72}
        unidade="mm"
        indisponivel={semP72}
        situacao={faixa(temMinimoP72 ? l.p72Minimo : l.P72, LIMIARES.P1, LIMIARES.P2)}
        detalhe={detalheP72}
      />
    </section>
  );
}
