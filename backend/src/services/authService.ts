// backend > src > services > authService.ts
// Login do administrador. O token JWT vale pelo tempo de JWT_EXPIRES_IN;
// no logout o frontend apenas descarta o token.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { env } from '../config/env';
import { HttpError } from '../middleware';
import { AdminToken } from '../middleware/authMiddleware';

export class AuthService {
  static async login(corpo: any) {
    const email = String(corpo?.email || '').trim().toLowerCase();
    const senha = String(corpo?.senha || '');
    if (!email || !senha) throw new HttpError(400, 'Informe e-mail e senha.');

    const admin = await prisma.administrador.findUnique({ where: { email } });
    const senhaOk = admin && admin.ativo && (await bcrypt.compare(senha, admin.senhaHash));
    if (!senhaOk) throw new HttpError(401, 'E-mail ou senha inválidos.');

    await prisma.administrador.update({ where: { id: admin.id }, data: { ultimoLogin: new Date() } });

    const payload: AdminToken = { id: admin.id, nome: admin.nome, email: admin.email };
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);

    return { token, administrador: payload };
  }
}
