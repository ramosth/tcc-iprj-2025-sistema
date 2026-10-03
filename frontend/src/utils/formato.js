// ============= src/utils/formato.js =============
// Formatação em pt-BR (vírgula decimal, horário de Brasília).

const FUSO = 'America/Sao_Paulo';

export function numero(valor, casas = 1) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return null;
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function dataHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function horaCurta(ms, comDia = false) {
  return new Date(ms).toLocaleString('pt-BR', {
    timeZone: FUSO,
    ...(comDia ? { day: '2-digit', month: '2-digit' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function haQuanto(iso, agora = Date.now()) {
  if (!iso) return '';
  const min = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h ${min % 60} min`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}
