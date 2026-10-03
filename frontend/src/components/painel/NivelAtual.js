// ============= src/components/painel/NivelAtual.js =============
// Cartão grande com a cor do nível atual (calculado pelo dispositivo).
'use client';

import { AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { INFO_NIVEL } from '@/config/niveis';
import { dataHora, haQuanto } from '@/utils/formato';

const ICONE = { VERDE: CheckCircle2, AMARELO: AlertTriangle, VERMELHO: AlertOctagon };

export default function NivelAtual({ leitura }) {
  if (leitura === undefined) {
    return <section className="cartao-nivel-atual nivel-vazio">Carregando…</section>;
  }
  if (leitura === null) {
    return (
      <section className="cartao-nivel-atual nivel-vazio">
        <HelpCircle size={40} aria-hidden />
        <div>
          <p className="rotulo">Nível atual</p>
          <h1>Sem leitura</h1>
          <p>Nenhuma leitura recebida do dispositivo até o momento.</p>
        </div>
      </section>
    );
  }

  const info = INFO_NIVEL[leitura.nivel];
  const Icone = ICONE[leitura.nivel] ?? HelpCircle;

  return (
    <section className={`cartao-nivel-atual nivel-${leitura.nivel.toLowerCase()}`} aria-live="polite">
      <Icone size={48} aria-hidden />
      <div>
        <p className="rotulo">Nível atual</p>
        <h1>
          {info.titulo} <span className="nivel-resumo">· {info.resumo}</span>
        </h1>
        <p>{info.texto}</p>
        <p className="nivel-hora">
          Última leitura: {dataHora(leitura.criadoEm)} ({haQuanto(leitura.criadoEm)})
        </p>
        <div className="selos">
          {leitura.simulacao && <span className="selo">Simulação (Wokwi)</span>}
          {leitura.p72Injetado && <span className="selo">Chuva de 72 h injetada para teste</span>}
          {leitura.evento === 'energia' && <span className="selo">Leitura enviada por evento de energia</span>}
        </div>
      </div>
    </section>
  );
}
