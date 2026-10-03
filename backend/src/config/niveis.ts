// backend > src > config > niveis.ts
// Os três níveis de alerta do modelo (Eq. 3) e sua ordem.
export const NIVEIS = ['VERDE', 'AMARELO', 'VERMELHO'] as const;
export type Nivel = (typeof NIVEIS)[number];
export const ORDEM_NIVEL: Record<string, number> = { VERDE: 0, AMARELO: 1, VERMELHO: 2 };
