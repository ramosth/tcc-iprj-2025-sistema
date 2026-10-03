// backend > src > services > usuariosService.ts
// Cadastro público do usuário básico ("Quero receber alertas") e lista para o admin.

import prisma from '../config/database';
import { HttpError } from '../middleware';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor: any, max: number): string | null {
  if (valor === undefined || valor === null) return null;
  const t = String(valor).trim();
  if (t.length > max) throw new HttpError(400, `Texto maior que ${max} caracteres.`);
  return t || null;
}

export class UsuariosService {
  static async cadastrar(corpo: any) {
    const nome = texto(corpo?.nome, 100);
    const email = texto(corpo?.email, 255)?.toLowerCase();
    if (!nome) throw new HttpError(400, 'Informe o nome.');
    if (!email || !EMAIL_VALIDO.test(email)) throw new HttpError(400, 'Informe um e-mail válido.');

    const existente = await prisma.usuarioBasico.findUnique({ where: { email } });
    if (existente) throw new HttpError(409, 'Este e-mail já está cadastrado.');

    const u = await prisma.usuarioBasico.create({
      data: {
        nome,
        email,
        telefone: texto(corpo.telefone, 20),
        localidade: texto(corpo.localidade, 100),
      },
    });
    return { id: u.id, nome: u.nome, email: u.email };
  }

  static async listar() {
    const lista = await prisma.usuarioBasico.findMany({ orderBy: { nome: 'asc' } });
    return lista.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      telefone: u.telefone,
      localidade: u.localidade,
      ativo: u.ativo,
      criadoEm: u.criadoEm.toISOString(),
    }));
  }
}
