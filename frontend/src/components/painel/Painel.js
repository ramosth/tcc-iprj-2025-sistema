// ============= src/components/painel/Painel.js =============
// Painel único do administrador: situação atual, histórico, envio de alerta e registros.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { leiturasApi, usuariosApi, mensagemErro } from '@/services/api';
import NivelAtual from './NivelAtual';
import Avisos from './Avisos';
import Indicadores from './Indicadores';
import Energia from './Energia';
import GraficoHistorico from './GraficoHistorico';
import EnvioAlerta from './EnvioAlerta';
import ListaEventos from './ListaEventos';
import Moradores from './Moradores';

// Frequência com que a TELA consulta a API. Não é parâmetro do modelo de alerta
// (a frequência de leitura do dispositivo é 60/10 min, definida no firmware).
const ATUALIZAR_A_CADA_MS = 30 * 1000;

export default function Painel() {
  const { admin, sair } = useAuth();
  const [leitura, setLeitura] = useState(undefined); // undefined = carregando; null = nenhuma leitura
  const [moradores, setMoradores] = useState([]);
  const [erroConexao, setErroConexao] = useState('');
  const [versao, setVersao] = useState(0); // muda a cada atualização (gráfico e eventos recarregam)
  const [atualizando, setAtualizando] = useState(false);

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      const [ultima, lista] = await Promise.all([leiturasApi.ultima(), usuariosApi.listar()]);
      setLeitura(ultima);
      setMoradores(lista);
      setErroConexao('');
    } catch (erro) {
      setErroConexao(mensagemErro(erro));
      setLeitura((atual) => (atual === undefined ? null : atual));
    } finally {
      setAtualizando(false);
      setVersao((v) => v + 1);
    }
  }, []);

  useEffect(() => {
    atualizar();
    const id = setInterval(atualizar, ATUALIZAR_A_CADA_MS);
    return () => clearInterval(id);
  }, [atualizar]);

  const ativos = moradores.filter((m) => m.ativo).length;

  return (
    <div className="painel">
      <header className="topo">
        <div className="conteudo topo-linha">
          <div className="marca">
            <ShieldAlert size={22} aria-hidden />
            <span>Painel do administrador</span>
          </div>
          <div className="topo-acoes">
            <span className="texto-suave">{admin?.nome}</span>
            <button type="button" className="btn btn-secundario" onClick={atualizar} disabled={atualizando}>
              <RefreshCw size={16} aria-hidden className={atualizando ? 'girando' : ''} />
              Atualizar
            </button>
            <button type="button" className="btn btn-secundario" onClick={sair}>
              <LogOut size={16} aria-hidden />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="conteudo painel-grade">
        <div className="linha-principal">
          <NivelAtual leitura={leitura} />
          <Energia leitura={leitura} />
        </div>

        <Avisos leitura={leitura} erroConexao={erroConexao} />
        <Indicadores leitura={leitura} />
        <GraficoHistorico versao={versao} />

        <div className="linha-dupla">
          <EnvioAlerta nivelAtual={leitura?.nivel} totalAtivos={ativos} onEnviado={atualizar} />
          <Moradores moradores={moradores} />
        </div>

        <ListaEventos versao={versao} />
      </main>
    </div>
  );
}
