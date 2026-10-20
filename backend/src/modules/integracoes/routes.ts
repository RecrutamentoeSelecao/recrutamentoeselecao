import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { EQUIPE, TODOS, atorDe, permitir } from '../../shared/auth/rbac.js';
import { paramId } from '../../shared/http/schemas.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const integracoesRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Integração'];
  app.get('/', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Listar integrações com situação calculada', querystring: s.filtroIntegracoes } },
    async (req) => svc.listar(req.query));
  app.get('/:id', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Detalhe', params: paramId } },
    async (req) => svc.crud.apresentar(await svc.crud.obter(req.params.id)));
  app.post('/', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Nova integração (manual, sem vaga)', body: s.integracaoCriar } },
    async (req, reply) => reply.status(201).send(await svc.crud.criar(atorDe(req), req.body)));
  app.patch('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Editar', params: paramId, body: s.integracaoAtualizar } },
    async (req) => svc.crud.atualizar(atorDe(req), req.params.id, req.body));
  app.post('/:id/realizar', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Marcar como realizada (padrão hoje)', params: paramId, body: s.realizar } },
    async (req) => svc.realizar(atorDe(req), req.params.id, req.body.data));
  app.delete('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Excluir', params: paramId } },
    async (req, reply) => { await svc.crud.excluir(atorDe(req), req.params.id); return reply.status(204).send(); });
};
