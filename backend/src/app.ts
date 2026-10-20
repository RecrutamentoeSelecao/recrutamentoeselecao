import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  type ZodTypeProvider, jsonSchemaTransform, serializerCompiler, validatorCompiler,
} from 'fastify-type-provider-zod';
import { env } from './config/env.js';
import { registrarTratamentoDeErros } from './shared/http/erros.js';
import { admissoesRoutes } from './modules/admissoes/routes.js';
import { auditoriaRoutes } from './modules/auditoria/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { candidatosRoutes } from './modules/candidatos/routes.js';
import { candidaturasRoutes } from './modules/candidaturas/routes.js';
import { configuracaoRoutes } from './modules/configuracao/routes.js';
import { contratosRoutes } from './modules/contratos/routes.js';
import { experienciasRoutes } from './modules/experiencias/routes.js';
import { exportacaoRoutes } from './modules/exportacao/routes.js';
import { importacaoRoutes } from './modules/importacao/routes.js';
import { integracoesRoutes } from './modules/integracoes/routes.js';
import { notasRoutes } from './modules/notas/routes.js';
import { painelRoutes } from './modules/painel/routes.js';
import { uniformesRoutes } from './modules/uniformes/routes.js';
import { usuariosRoutes } from './modules/usuarios/routes.js';
import { vagasRoutes } from './modules/vagas/routes.js';

export async function construirApp(opcoes: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opcoes.logger ?? env.NODE_ENV !== 'test' ? { level: env.LOG_LEVEL, redact: ['req.headers.authorization', 'req.body.senha'] } : false,
    bodyLimit: 20 * 1024 * 1024, // importação do dados.json legado
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registrarTratamentoDeErros(app);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map((o) => o.trim()) : false, credentials: true });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET, sign: { expiresIn: env.JWT_ACCESS_TTL } });

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'API — Controle de Vagas, SLA e Experiência',
        description: 'Backend do sistema de Recrutamento & Seleção (vagas, admissão, experiência, integração, CIEE, uniformes).',
        version: '0.1.0',
      },
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
      security: [{ bearerAuth: [] }],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', { schema: { tags: ['Sistema'], summary: 'Saúde do serviço', security: [] } }, async () => ({ ok: true }));

  await app.register(async (api) => {
    await api.register(authRoutes, { prefix: '/auth' });
    await api.register(usuariosRoutes, { prefix: '/usuarios' });
    await api.register(configuracaoRoutes, { prefix: '/configuracao' });
    await api.register(vagasRoutes, { prefix: '/vagas' });
    await api.register(candidatosRoutes, { prefix: '/candidatos' });
    await api.register(candidaturasRoutes, { prefix: '/candidaturas' });
    await api.register(admissoesRoutes, { prefix: '/admissoes' });
    await api.register(experienciasRoutes, { prefix: '/experiencias' });
    await api.register(integracoesRoutes, { prefix: '/integracoes' });
    await api.register(contratosRoutes, { prefix: '/contratos' });
    await api.register(uniformesRoutes, { prefix: '/uniformes' });
    await api.register(notasRoutes, { prefix: '/notas' });
    await api.register(painelRoutes, { prefix: '/painel' });
    await api.register(exportacaoRoutes, { prefix: '/exportacao' });
    await api.register(importacaoRoutes, { prefix: '/importacao' });
    await api.register(auditoriaRoutes, { prefix: '/auditoria' });
  }, { prefix: '/api/v1' });

  return app;
}
