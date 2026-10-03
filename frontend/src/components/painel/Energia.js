// ============= src/components/painel/Energia.js =============
// Rede elétrica e bateria. Só a simulação (Wokwi) envia esses campos;
// o protótipo físico é alimentado por USB-C ou fonte e os deixa nulos.
'use client';

import { BatteryFull, BatteryLow, BatteryWarning, PlugZap, Unplug } from 'lucide-react';
import { ESTADO_BATERIA } from '@/config/niveis';
import { numero } from '@/utils/formato';

const ICONE_BATERIA = { NORMAL: BatteryFull, BAIXA: BatteryLow, CRITICA: BatteryWarning, FALHA: BatteryWarning };
const CLASSE_BATERIA = { NORMAL: 'ok', BAIXA: 'atencao', CRITICA: 'critico', FALHA: 'critico' };

export default function Energia({ leitura }) {
  const semDados =
    !leitura || (leitura.rede === null && leitura.vbat === null && leitura.estadoBateria === null);

  return (
    <section className="cartao energia">
      <h2>Energia</h2>
      {semDados ? (
        <p className="texto-suave">
          {leitura
            ? 'Esta leitura não traz dados de energia. O protótipo físico é alimentado por USB-C ou fonte, sem bateria.'
            : 'Sem leitura.'}
        </p>
      ) : (
        <ul className="lista-energia">
          <li className={leitura.rede === false ? 'atencao' : 'ok'}>
            {leitura.rede === false ? <Unplug aria-hidden /> : <PlugZap aria-hidden />}
            <div>
              <span className="rotulo">Rede elétrica</span>
              <strong>
                {leitura.rede === null ? 'sem informação' : leitura.rede ? 'Presente' : 'Ausente: operando na bateria'}
              </strong>
            </div>
          </li>
          <li className={CLASSE_BATERIA[leitura.estadoBateria] ?? ''}>
            {(() => {
              const Icone = ICONE_BATERIA[leitura.estadoBateria] ?? BatteryFull;
              return <Icone aria-hidden />;
            })()}
            <div>
              <span className="rotulo">Bateria</span>
              <strong>
                {ESTADO_BATERIA[leitura.estadoBateria] ?? 'sem informação'}
                {leitura.vbat !== null && ` · ${numero(leitura.vbat, 2)} V`}
              </strong>
            </div>
          </li>
        </ul>
      )}
      {leitura?.simulacao && !semDados && (
        <p className="nota">Valores da simulação: chave = rede elétrica; potenciômetro = tensão da bateria.</p>
      )}
    </section>
  );
}
