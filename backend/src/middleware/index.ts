// backend > src > middleware > index.ts
import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const corsOptions = {
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Limita tentativas de login (10 a cada 15 min por IP)
export const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas de login. Tente de novo em 15 minutos.' },
});

export const requestLogger = morgan(':method :url :status - :response-time ms');

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, error: `Rota ${req.method} ${req.path} não encontrada` });
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error('Erro:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ success: false, error: err.message || 'Erro interno do servidor' });
}

// Erro com código HTTP, usado pelos services para responder 400/401/404/409
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Envolve rotas async para que erros cheguem ao errorHandler
export const rota =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);
