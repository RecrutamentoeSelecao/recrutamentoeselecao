import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { env } from '../../config/env.js';
import { TODOS, atorDe, permitir } from '../../shared/auth/rbac.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Autenticação'];
  const assinar: svc.AssinarAccess = (p) => app.jwt.sign(p, { expiresIn: env.JWT_ACCESS_TTL });
  const limite = { rateLimit: { max: 10, timeWindow: '1 minute' } };

  app.post('/login', { config: limite, schema: { tags, summary: 'Entrar (access + refresh token)', security: [], body: s.login, response: { 200: s.respostaTokens } } },
    async (req) => svc.login(req.body.email, req.body.senha, { ip: req.ip, userAgent: req.headers['user-agent'] }, assinar));
  app.post('/refresh', { config: limite, schema: { tags, summary: 'Renovar tokens (rotação do refresh)', security: [], body: s.refresh, response: { 200: s.respostaTokens } } },
    async (req) => svc.renovar(req.body.refreshToken, assinar));
  app.post('/logout', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Sair (revoga o refresh)', body: s.refresh, security: [{ bearerAuth: [] }] } },
    async (req, reply) => { await svc.logout(req.body.refreshToken, atorDe(req)); return reply.status(204).send(); });
  app.get('/me', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Usuário atual', security: [{ bearerAuth: [] }] } },
    async (req) => svc.eu(req.user.sub));
};
