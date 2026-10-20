import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { EQUIPE, TODOS, atorDe, permitir } from '../../shared/auth/rbac.js';
import { paramId } from '../../shared/http/schemas.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const notasRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Anotações'];
  app.get('/', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Listar anotações', querystring: s.filtroNotas } },
    async (req) => svc.listar(req.query));
  app.post('/', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Nova anotação (até 400 caracteres, lembrete opcional)', body: s.notaCriar } },
    async (req, reply) => reply.status(201).send(await svc.criar(atorDe(req), req.body)));
  app.patch('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Editar', params: paramId, body: s.notaAtualizar } },
    async (req) => svc.crud.atualizar(atorDe(req), req.params.id, req.body));
  app.post('/:id/concluir', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Marcar como feita', params: paramId } },
    async (req) => svc.concluir(atorDe(req), req.params.id));
  app.delete('/concluidas', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Limpar concluídas' } },
    async (req) => svc.limparConcluidas(atorDe(req)));
  app.delete('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Apagar', params: paramId } },
    async (req, reply) => { await svc.crud.excluir(atorDe(req), req.params.id); return reply.status(204).send(); });
};
