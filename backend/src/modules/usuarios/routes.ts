import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { SO_ADMIN, atorDe, permitir } from '../../shared/auth/rbac.js';
import { paramId } from '../../shared/http/schemas.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const usuariosRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Usuários'];
  const pre = permitir(...SO_ADMIN);
  app.get('/', { preHandler: pre, schema: { tags, summary: 'Pessoas com acesso' } }, async () => svc.listar());
  app.post('/', { preHandler: pre, schema: { tags, summary: 'Cadastrar pessoa (senha com hash argon2id)', body: s.usuarioCriar } },
    async (req, reply) => reply.status(201).send(await svc.criar(atorDe(req), req.body)));
  app.patch('/:id', { preHandler: pre, schema: { tags, summary: 'Editar papel, nome, senha ou ativo', params: paramId, body: s.usuarioAtualizar } },
    async (req) => svc.atualizar(atorDe(req), req.params.id, req.body));
  app.delete('/:id', { preHandler: pre, schema: { tags, summary: 'Desativar (revoga sessões)', params: paramId } },
    async (req) => svc.desativar(atorDe(req), req.params.id));
};
