# Frontend (Next.js 14)

Site do sistema de monitoramento, branch `v3-simples`.

- `/` página inicial pública: resumo do projeto, como funciona o alerta de três cores e
  cadastro do morador ("Quero receber alertas").
- `/login` login do administrador.
- `/painel` página única do administrador: nível atual, S, P48, P24, P72, energia,
  avisos de dado indisponível, histórico, envio de e-mail de alerta, moradores e registros.

O nível de alerta é calculado pelo dispositivo. O site só exibe o que recebeu. Os limiares
mostrados nas telas (S 0,64/0,86; P72 60/100 mm) ficam em `src/config/niveis.js`, com a fonte.

```bash
npm install
npm run dev     # http://localhost:3000 (a API deve estar em http://localhost:3001)
```

Variável: `NEXT_PUBLIC_API_URL=http://localhost:3001/api` em `.env.local`.
