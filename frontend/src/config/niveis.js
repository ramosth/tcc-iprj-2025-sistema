// ============= src/config/niveis.js =============
// Níveis de alerta (Eq. 3) e limiares do modelo, só para EXIBIÇÃO.
// Quem calcula o nível é o dispositivo; o painel apenas mostra o que recebeu.

export const NIVEIS = ['VERDE', 'AMARELO', 'VERMELHO'];

export const INFO_NIVEL = {
  VERDE: {
    titulo: 'VERDE',
    resumo: 'Condição normal',
    texto: 'Não há necessidade de deslocamento. Manter-se informado.',
  },
  AMARELO: {
    titulo: 'AMARELO',
    resumo: 'Atenção',
    texto: 'Preparar-se: conhecer a rota de fuga e o ponto de encontro e acompanhar novos avisos.',
  },
  VERMELHO: {
    titulo: 'VERMELHO',
    resumo: 'Alerta',
    texto: 'Deslocar-se para o ponto de encontro pela rota de fuga e seguir as orientações da Defesa Civil.',
  },
};

// Limiares de saturação: Mirus, Morphew e Smith (2018), Tabela 1 (S1 = 0,64; S2 = 0,86)
// Limiares de chuva em 72 h: Mendes et al. (2020) (P1 = 60 mm; P2 = 100 mm)
export const LIMIARES = {
  S1: 0.64,
  S2: 0.86,
  P1: 60,
  P2: 100,
  fonteS: 'Mirus, Morphew e Smith (2018)',
  fonteP: 'Mendes et al. (2020)',
};

export const ESTADO_BATERIA = {
  NORMAL: 'Normal',
  BAIXA: 'Baixa',
  CRITICA: 'Crítica',
  FALHA: 'Falha: substituir',
};

export const TIPO_EVENTO = {
  ALERTA_MANUAL: 'E-mail aos moradores',
  NIVEL_SUBIU: 'Nível subiu',
  ENERGIA: 'Energia',
};

// Rodapé comum (P1_referencias, item d) — igual ao dos e-mails
export const RODAPE =
  'Sistema acadêmico de monitoramento (TCC – IPRJ/UERJ). As cores deste sistema não ' +
  'correspondem aos níveis oficiais de emergência da Agência Nacional de Mineração.';
