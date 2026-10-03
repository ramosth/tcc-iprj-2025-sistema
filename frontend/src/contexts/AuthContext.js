// ============= src/contexts/AuthContext.js =============
// Login do administrador (único perfil com acesso ao painel).
'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, mensagemErro, sessao } from '@/services/api';

const AuthContext = createContext(null);

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return contexto;
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setAdmin(sessao.ler()?.admin ?? null);
    setCarregando(false);

    const expirou = () => setAdmin(null);
    window.addEventListener('sessao-expirada', expirou);
    return () => window.removeEventListener('sessao-expirada', expirou);
  }, []);

  const entrar = useCallback(async (email, senha) => {
    try {
      const { token, administrador } = await authApi.login(email, senha);
      sessao.salvar(token, administrador);
      setAdmin(administrador);
      return { ok: true };
    } catch (erro) {
      return { ok: false, mensagem: mensagemErro(erro, 'Não foi possível entrar.') };
    }
  }, []);

  const sair = useCallback(async () => {
    await authApi.logout();
    sessao.limpar();
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}
