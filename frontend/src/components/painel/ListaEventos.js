// ============= src/components/painel/ListaEventos.js =============
// Registros da tabela "eventos": e-mails enviados aos moradores, nível subiu e energia.
'use client';

import { useEffect, useState } from 'react';
import { eventosApi, mensagemErro } from '@/services/api';
import { TIPO_EVENTO } from '@/config/niveis';
import { dataHora } from '@/utils/formato';

const FILTROS = [
  { id: 'ALERTA_MANUAL', rotulo: 'E-mails aos moradores' },
  { id: '', rotulo: 'Todos' },
  { id: 'NIVEL_SUBIU', rotulo: 'Nível subiu' },
  { id: 'ENERGIA', rotulo: 'Energia' },
];

export default function ListaEventos({ versao }) {
  const [tipo, setTipo] = useState('ALERTA_MANUAL');
  const [eventos, setEventos] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    eventosApi
      .listar({ limite: 30, tipo })
      .then((lista) => {
        if (!ativo) return;
        setEventos(lista);
        setErro('');
      })
      .catch((e) => ativo && setErro(mensagemErro(e)));
    return () => {
      ativo = false;
    };
  }, [tipo, versao]);

  return (
    <section className="cartao eventos">
      <div className="cabecalho-secao">
        <h2>Envios e eventos registrados</h2>
        <div className="seletor" role="group" aria-label="Filtrar registros">
          {FILTROS.map((f) => (
            <button
              key={f.id || 'todos'}
              type="button"
              className={tipo === f.id ? 'ativo' : ''}
              aria-pressed={tipo === f.id}
              onClick={() => setTipo(f.id)}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="erro-form">{erro}</p>}
      {!erro && eventos.length === 0 && <p className="texto-suave">Nenhum registro.</p>}

      {eventos.length > 0 && (
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Tipo</th>
                <th>Nível</th>
                <th>Descrição</th>
                <th>Enviado por</th>
                <th>E-mails</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id}>
                  <td className="sem-quebra">{dataHora(e.criadoEm)}</td>
                  <td>{TIPO_EVENTO[e.tipo] ?? e.tipo}</td>
                  <td>
                    {e.nivel ? (
                      <span className={`etiqueta-nivel pequena nivel-${e.nivel.toLowerCase()}`}>{e.nivel}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{e.descricao}</td>
                  <td>{e.enviadoPor ?? 'automático'}</td>
                  <td className="sem-quebra">
                    {e.enviados ?? 0}/{e.destinatarios ?? 0}
                    {e.falhas > 0 ? ` (${e.falhas} falha${e.falhas > 1 ? 's' : ''})` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="nota">E-mails automáticos (nível subiu e energia) vão só aos administradores.</p>
    </section>
  );
}
