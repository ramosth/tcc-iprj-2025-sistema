// backend > src > middleware > authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AdminToken {
  id: number;
  nome: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminToken;
    }
  }
}

// Só deixa passar quem enviou "Authorization: Bearer <token>" válido
export function exigirAdmin(req: Request, res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Faça login como administrador.' });
  }

  try {
    req.admin = jwt.verify(token, env.JWT_SECRET) as AdminToken;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Sessão expirada ou inválida. Faça login de novo.' });
  }
}
