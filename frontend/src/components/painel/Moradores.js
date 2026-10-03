// ============= src/components/painel/Moradores.js =============
// Lista (somente leitura) dos usuários básicos cadastrados pela página inicial.
'use client';

import { dataHora } from '@/utils/formato';

export default function Moradores({ moradores }) {
  const ativos = moradores.filter((m) => m.ativo).length;

  return (
    <section className="cartao moradores">
      <h2>Moradores cadastrados</h2>
      <p className="numero-destaque">
        {ativos} <span>ativo(s) de {moradores.length}</span>
      </p>
      {moradores.length === 0 ? (
        <p className="texto-suave">Ninguém se cadastrou ainda.</p>
      ) : (
        <div className="tabela-rolagem altura-limitada">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Localidade</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {moradores.map((m) => (
                <tr key={m.id} className={m.ativo ? '' : 'inativo'}>
                  <td>
                    {m.nome}
                    {!m.ativo && ' (inativo)'}
                  </td>
                  <td>{m.email}</td>
                  <td>{m.localidade ?? '—'}</td>
                  <td className="sem-quebra">{dataHora(m.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
