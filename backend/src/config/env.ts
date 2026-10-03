// backend > src > config > env.ts
import dotenv from 'dotenv';

dotenv.config();
process.env.TZ = 'UTC';

export const env = {
  PORT: Number(process.env.PORT || 3001),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL!,

  // Login do administrador
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Frontend autorizado (CORS)
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // E-mail (sem SMTP configurado, o envio é só registrado no console)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
};

for (const nome of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[nome]) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${nome}`);
  }
}
