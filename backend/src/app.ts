// backend > src > app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOptions, errorHandler, notFoundHandler, requestLogger } from './middleware';
import routes from './routes';

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

// As rotas respondem na raiz (o firmware posta em API_BASE_URL + "/leituras")
// e também em /api (prefixo usado pelo frontend).
app.use('/', routes);
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    nome: 'API do Sistema de Monitoramento de Barragem (v3-simples)',
    rotas: [
      'POST /leituras',
      'GET /leituras/ultima',
      'GET /leituras?inicio=&fim=',
      'POST /usuarios',
      'POST /auth/login',
      'POST /auth/logout',
      'GET /usuarios [admin]',
      'GET /alertas/modelos [admin]',
      'POST /alertas [admin]',
      'GET /eventos [admin]',
      'GET /health',
    ],
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
