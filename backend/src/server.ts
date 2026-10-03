// backend > src > server.ts
import { env } from './config/env';
import app from './app';
import prisma from './config/database';
import { EmailService } from './services/emailService';

async function iniciar() {
  try {
    await prisma.$connect();
    console.log('✅ Banco de dados conectado');

    EmailService.init();
    const smtpOk = await EmailService.verificarConexao();
    console.log(`📧 E-mail: ${smtpOk ? 'SMTP conectado' : 'modo simulação (só console)'}`);

    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`🚀 API rodando em http://localhost:${env.PORT}`);
    });
  } catch (erro) {
    console.error('❌ Erro ao iniciar o servidor:', erro);
    process.exit(1);
  }
}

async function encerrar() {
  await EmailService.fechar();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

iniciar();
