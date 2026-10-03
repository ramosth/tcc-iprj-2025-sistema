// ============= src/app/login/page.js =============
// Login do administrador.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { admin, carregando, entrar } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregando && admin) router.replace('/painel');
  }, [admin, carregando, router]);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!email.trim() || !senha) return setErro('Informe e-mail e senha.');
    setEnviando(true);
    const r = await entrar(email.trim(), senha);
    setEnviando(false);
    if (r.ok) router.replace('/painel');
    else setErro(r.mensagem);
  }

  return (
    <main className="pagina-login">
      <form className="cartao cartao-login" onSubmit={enviar} noValidate>
        <div className="marca">
          <ShieldAlert size={22} aria-hidden />
          <span>Monitoramento de Barragem</span>
        </div>
        <h1>Entrar como administrador</h1>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label>
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
        </label>
        {erro && <p className="erro-form" role="alert">{erro}</p>}
        <button type="submit" className="btn btn-primario" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <Link href="/" className="btn btn-link">Voltar ao início</Link>
      </form>
    </main>
  );
}
