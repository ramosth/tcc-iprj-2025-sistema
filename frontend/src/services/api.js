// ============= src/services/api.js =============
// Chamadas ao backend v3-simples (ver backend/src/routes/index.ts).
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Sessão do administrador (token JWT no navegador) ────────────────────────

const CHAVE_TOKEN = 'token';
const CHAVE_ADMIN = 'administrador';

export const sessao = {
  ler() {
    try {
      const token = localStorage.getItem(CHAVE_TOKEN);
      const admin = JSON.parse(localStorage.getItem(CHAVE_ADMIN) || 'null');
      return token && admin ? { token, admin } : null;
    } catch {
      return null;
    }
  },
  salvar(token, admin) {
    try {
      localStorage.setItem(CHAVE_TOKEN, token);
      localStorage.setItem(CHAVE_ADMIN, JSON.stringify(admin));
    } catch {
      /* navegador sem armazenamento: a sessão dura até recarregar a página */
    }
  },
  limpar() {
    try {
      localStorage.removeItem(CHAVE_TOKEN);
      localStorage.removeItem(CHAVE_ADMIN);
    } catch {
      /* nada a limpar */
    }
  },
};

api.interceptors.request.use((config) => {
  const s = sessao.ler();
  if (s) config.headers.Authorization = `Bearer ${s.token}`;
  return config;
});

// Token vencido ou inválido: limpa a sessão e avisa o AuthContext
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const ehLogin = erro.config?.url?.includes('/auth/login');
    if (erro.response?.status === 401 && !ehLogin && typeof window !== 'undefined') {
      sessao.limpar();
      window.dispatchEvent(new Event('sessao-expirada'));
    }
    return Promise.reject(erro);
  },
);

const dados = (resposta) => resposta.data.data;

export function mensagemErro(erro, padrao = 'Não foi possível concluir a operação.') {
  if (erro?.response?.data?.error) return erro.response.data.error;
  if (erro?.code === 'ERR_NETWORK' || erro?.code === 'ECONNABORTED') {
    return 'Servidor indisponível. Verifique se a API está ligada.';
  }
  return padrao;
}

// ── Rotas ───────────────────────────────────────────────────────────────────

export const leiturasApi = {
  // Devolve null quando ainda não há leitura (a API responde 404)
  async ultima() {
    try {
      return dados(await api.get('/leituras/ultima'));
    } catch (erro) {
      if (erro.response?.status === 404) return null;
      throw erro;
    }
  },
  async historico(inicio, fim) {
    return dados(await api.get('/leituras', { params: { inicio, fim, limite: 5000 } }));
  },
};

export const usuariosApi = {
  async cadastrar({ nome, email, telefone, localidade }) {
    return dados(await api.post('/usuarios', { nome, email, telefone, localidade }));
  },
  async listar() {
    return dados(await api.get('/usuarios'));
  },
};

export const authApi = {
  async login(email, senha) {
    return dados(await api.post('/auth/login', { email, senha }));
  },
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* o importante é descartar o token no navegador */
    }
  },
};

export const alertasApi = {
  async modelos() {
    return dados(await api.get('/alertas/modelos'));
  },
  async enviar({ nivel, assunto, mensagem }) {
    return dados(await api.post('/alertas', { nivel, assunto, mensagem }));
  },
};

export const eventosApi = {
  async listar({ limite = 30, tipo } = {}) {
    return dados(await api.get('/eventos', { params: { limite, tipo: tipo || undefined } }));
  },
};

export default api;
