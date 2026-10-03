// ============= src/components/LandingPage.js =============
// Página pública: resumo do projeto, como funciona o alerta e cadastro do morador.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CloudRain, Droplets, Gauge, ShieldAlert } from 'lucide-react';
import { usuariosApi, mensagemErro } from '@/services/api';
import { INFO_NIVEL, NIVEIS, RODAPE } from '@/config/niveis';

const VAZIO = { nome: '', email: '', telefone: '', localidade: '' };

function mascaraTelefone(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function FormularioCadastro() {
  const [form, setForm] = useState(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [cadastrado, setCadastrado] = useState(null);

  const mudar = (campo) => (e) => {
    const valor = campo === 'telefone' ? mascaraTelefone(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
  };

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim()) return setErro('Informe o nome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setErro('Informe um e-mail válido.');

    setEnviando(true);
    try {
      const u = await usuariosApi.cadastrar({
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim() || null,
        localidade: form.localidade.trim() || null,
      });
      setCadastrado(u);
      setForm(VAZIO);
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível fazer o cadastro.'));
    } finally {
      setEnviando(false);
    }
  }

  if (cadastrado) {
    return (
      <div className="cadastro-ok" role="status">
        <CheckCircle2 size={28} aria-hidden />
        <div>
          <strong>Cadastro feito, {cadastrado.nome}.</strong>
          <p>Os avisos serão enviados para {cadastrado.email}.</p>
          <button type="button" className="btn btn-link" onClick={() => setCadastrado(null)}>
            Cadastrar outra pessoa
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <label>
        Nome *
        <input value={form.nome} onChange={mudar('nome')} maxLength={100} autoComplete="name" />
      </label>
      <label>
        E-mail *
        <input type="email" value={form.email} onChange={mudar('email')} maxLength={255} autoComplete="email" />
      </label>
      <label>
        Telefone (opcional)
        <input value={form.telefone} onChange={mudar('telefone')} placeholder="(31) 99999-9999" autoComplete="tel" />
      </label>
      <label>
        Bairro / localidade
        <input value={form.localidade} onChange={mudar('localidade')} maxLength={100} />
      </label>
      {erro && <p className="erro-form" role="alert">{erro}</p>}
      <button type="submit" className="btn btn-primario" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Quero receber alertas'}
      </button>
    </form>
  );
}

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="topo">
        <div className="conteudo topo-linha">
          <div className="marca">
            <ShieldAlert size={22} aria-hidden />
            <span>Monitoramento de Barragem</span>
          </div>
          <Link href="/login" className="btn btn-secundario">Entrar</Link>
        </div>
      </header>

      <section className="hero">
        <div className="conteudo">
          <p className="sobretitulo">Trabalho de Conclusão de Curso — IPRJ/UERJ</p>
          <h1>O papel da engenharia da computação na prevenção de acidentes em barragens de rejeitos</h1>
          <p>
            Um dispositivo no local mede a umidade do solo e consulta a chuva das últimas 48 horas e a
            previsão para as próximas 24 horas. Com esses dados, o sistema indica um nível de alerta em
            três cores e avisa os moradores cadastrados por e-mail.
          </p>
          <a href="#cadastro" className="btn btn-primario">Quero receber alertas</a>
        </div>
      </section>

      <section className="conteudo secao">
        <h2>O que o sistema acompanha</h2>
        <div className="grade-3">
          <article className="cartao">
            <Droplets aria-hidden />
            <h3>Saturação do solo</h3>
            <p>Higrômetro instalado no local. Indica se o solo já está úmido.</p>
          </article>
          <article className="cartao">
            <CloudRain aria-hidden />
            <h3>Chuva das últimas 48 h</h3>
            <p>Dados observados das estações meteorológicas (BNDMET).</p>
          </article>
          <article className="cartao">
            <Gauge aria-hidden />
            <h3>Previsão para 24 h</h3>
            <p>Chuva prevista para as próximas 24 horas (OpenWeatherMap).</p>
          </article>
        </div>
      </section>

      <section className="conteudo secao">
        <h2>Como funciona o alerta</h2>
        <p className="texto-apoio">
          O nível sobe quando o solo está úmido <strong>e</strong> a chuva das últimas 48 h somada à
          prevista para as próximas 24 h passa dos limites de atenção ou de alerta.
        </p>
        <div className="grade-3">
          {NIVEIS.map((n) => (
            <article key={n} className={`cartao-nivel nivel-${n.toLowerCase()}`}>
              <span className="etiqueta-nivel">{INFO_NIVEL[n].titulo}</span>
              <h3>{INFO_NIVEL[n].resumo}</h3>
              <p>{INFO_NIVEL[n].texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="cadastro" className="conteudo secao secao-cadastro">
        <div>
          <h2>Quero receber alertas</h2>
          <p className="texto-apoio">
            Cadastre-se para receber por e-mail os avisos enviados pelo administrador do sistema.
            O aviso não substitui as sirenes nem as orientações oficiais da Defesa Civil.
          </p>
        </div>
        <FormularioCadastro />
      </section>

      <footer className="rodape">
        <div className="conteudo">{RODAPE}</div>
      </footer>
    </div>
  );
}
