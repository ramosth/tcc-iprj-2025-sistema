// backend > src > services > emailService.ts
// Reaproveitado da versão anterior: mesmo transporter (nodemailer + SMTP do .env)
// e mesmo envio em lote. Agora com os níveis VERDE / AMARELO / VERMELHO e o tipo
// ENERGIA. Sem SMTP no .env, o envio é só registrado no console (modo simulação).

import * as nodemailer from 'nodemailer';
import { env } from '../config/env';

export type TipoEmail = 'VERDE' | 'AMARELO' | 'VERMELHO' | 'ENERGIA';

export interface Destinatario {
  email: string;
  nome: string;
}

export interface DadosEmail {
  tipo: TipoEmail;
  assunto: string;
  mensagem: string; // pode conter {nome}, trocado pelo nome de cada destinatário
}

const CORES: Record<TipoEmail, string> = {
  VERDE: '#16a34a',
  AMARELO: '#ca8a04',
  VERMELHO: '#dc2626',
  ENERGIA: '#2563eb',
};

// Rodapé comum (P1_referencias, item d)
export const RODAPE =
  'Sistema acadêmico de monitoramento (TCC – IPRJ/UERJ). As cores deste sistema não ' +
  'correspondem aos níveis oficiais de emergência da Agência Nacional de Mineração.';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  static init() {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      console.warn('⚠️  SMTP não configurado: e-mails serão apenas registrados no console.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      pool: true,
      maxConnections: 5,
      rateLimit: 10, // no máximo 10 e-mails por segundo
    });
  }

  static async verificarConexao(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (erro: any) {
      console.error('❌ Falha ao conectar no SMTP:', erro.message);
      return false;
    }
  }

  static async enviarAlerta(dest: Destinatario, dados: DadosEmail): Promise<boolean> {
    const texto = dados.mensagem.split('{nome}').join(dest.nome) + '\n\n' + RODAPE;

    if (!this.transporter) {
      console.log(`📧 [SIMULADO] ${dados.assunto} -> ${dest.email}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: `"Monitoramento de Barragem" <${env.SMTP_USER}>`,
        to: dest.email,
        subject: dados.assunto,
        text: texto,
        html: this.gerarHtml(dados.tipo, dados.assunto, texto),
        priority: dados.tipo === 'VERMELHO' ? 'high' : 'normal',
      });
      console.log(`📧 ${dados.assunto} -> ${dest.email}`);
      return true;
    } catch (erro: any) {
      console.error(`❌ Falha ao enviar para ${dest.email}:`, erro.message);
      return false;
    }
  }

  // Envia em grupos de 5 para não sobrecarregar o SMTP
  static async enviarLote(destinatarios: Destinatario[], dados: DadosEmail) {
    let enviados = 0;
    let falhas = 0;
    const tamanhoGrupo = 5;

    for (let i = 0; i < destinatarios.length; i += tamanhoGrupo) {
      const grupo = destinatarios.slice(i, i + tamanhoGrupo);
      const resultados = await Promise.all(grupo.map((d) => this.enviarAlerta(d, dados)));
      resultados.forEach((ok) => (ok ? enviados++ : falhas++));
    }

    return { destinatarios: destinatarios.length, enviados, falhas };
  }

  static async fechar() {
    this.transporter?.close();
  }

  private static escapar(texto: string): string {
    return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private static gerarHtml(tipo: TipoEmail, assunto: string, texto: string): string {
    return `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
  <div style="background:${CORES[tipo]};color:#fff;padding:16px 20px;font-size:18px;font-weight:bold">
    ${this.escapar(assunto)}
  </div>
  <div style="padding:20px;color:#111827;line-height:1.5">
    ${this.escapar(texto).replace(/\n/g, '<br>')}
  </div>
</div>`;
  }
}
