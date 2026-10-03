// ============= src/components/painel/EnvioAlerta.js =============
// O administrador escolhe VERDE/AMARELO/VERMELHO; o sistema preenche a mensagem-modelo
// do nível com a última leitura; o texto pode ser editado e vai aos moradores ativos.
'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import { alertasApi, mensagemErro } from '@/services/api';
import { INFO_NIVEL, NIVEIS, RODAPE } from '@/config/niveis';

export default function EnvioAlerta({ nivelAtual, totalAtivos, onEnviado }) {
  const [nivel, setNivel] = useState(null);
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  async function escolher(n) {
    setNivel(n);
    setConfirmando(false);
    setResultado(null);
    setCarregando(true);
    try {
      const { modelos } = await alertasApi.modelos();
      setAssunto(modelos[n].assunto);
      setMensagem(modelos[n].mensagem);
    } catch (erro) {
      toast.error(mensagemErro(erro, 'Não foi possível carregar a mensagem-modelo.'));
    } finally {
      setCarregando(false);
    }
  }

  // Na primeira carga, já sugere o nível atual
  useEffect(() => {
    if (nivel === null && nivelAtual) escolher(nivelAtual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelAtual]);

  async function enviar() {
    setEnviando(true);
    try {
      const r = await alertasApi.enviar({ nivel, assunto, mensagem });
      setResultado(r);
      setConfirmando(false);
      toast.success(`E-mail ${nivel} enviado a ${r.enviados} de ${r.destinatarios} morador(es).`);
      onEnviado?.();
    } catch (erro) {
      toast.error(mensagemErro(erro, 'Não foi possível enviar o alerta.'));
    } finally {
      setEnviando(false);
    }
  }

  const semMoradores = totalAtivos === 0;
  const podeEnviar = nivel && assunto.trim() && mensagem.trim() && !semMoradores && !carregando;

  return (
    <section className="cartao envio">
      <h2>Enviar e-mail de alerta aos moradores</h2>

      <div className="escolha-nivel" role="radiogroup" aria-label="Nível do e-mail">
        {NIVEIS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nivel === n}
            className={`botao-nivel nivel-${n.toLowerCase()} ${nivel === n ? 'escolhido' : ''}`}
            onClick={() => escolher(n)}
          >
            {INFO_NIVEL[n].titulo}
            {nivelAtual === n && <small>nível atual</small>}
          </button>
        ))}
      </div>

      {nivel && (
        <>
          <label>
            Assunto
            <input value={assunto} onChange={(e) => setAssunto(e.target.value)} disabled={carregando} />
          </label>
          <label>
            Mensagem
            <textarea
              rows={10}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              disabled={carregando}
            />
          </label>
          <p className="nota">
            {'{nome}'} é trocado pelo nome de cada morador. Rodapé incluído no envio: “{RODAPE}”
          </p>
          <button type="button" className="btn btn-link" onClick={() => escolher(nivel)} disabled={carregando}>
            Restaurar mensagem-modelo
          </button>
        </>
      )}

      {semMoradores && (
        <p className="texto-suave">Nenhum morador ativo cadastrado. O cadastro é feito na página inicial.</p>
      )}

      {!confirmando ? (
        <button
          type="button"
          className="btn btn-primario"
          disabled={!podeEnviar}
          onClick={() => setConfirmando(true)}
        >
          <Send size={16} aria-hidden />
          Enviar para {totalAtivos} morador(es)
        </button>
      ) : (
        <div className={`confirmacao nivel-borda-${nivel.toLowerCase()}`} role="alertdialog" aria-label="Confirmar envio">
          <p>
            Confirmar o envio do e-mail <strong>{nivel}</strong> para <strong>{totalAtivos}</strong> morador(es)?
          </p>
          <div className="botoes">
            <button type="button" className="btn btn-primario" onClick={enviar} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Confirmar envio'}
            </button>
            <button type="button" className="btn btn-secundario" onClick={() => setConfirmando(false)} disabled={enviando}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {resultado && (
        <p className="resultado-envio" role="status">
          Enviado a {resultado.enviados} de {resultado.destinatarios} morador(es)
          {resultado.falhas > 0 ? ` · ${resultado.falhas} falha(s)` : ''}. Registro nº {resultado.id}.
        </p>
      )}
    </section>
  );
}
