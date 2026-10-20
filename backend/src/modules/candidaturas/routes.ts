import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { DADOS_PESSOAIS, atorDe, permitir } from '../../shared/auth/rbac.js';
import { paramId } from '../../shared/http/schemas.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const candidaturasRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Candidaturas (funil)'];
  const pre = permitir(...DADOS_PESSOAIS);
  app.get('/', { preHandler: pre, schema: { tags, summary: 'Listar candidaturas + contagem do funil', querystring: s.filtroCandidaturas } },
    async (req) => svc.listar(req.query));
  app.post('/', { preHandler: pre, schema: { tags, summary: 'Inscrever candidato numa vaga', body: s.candidaturaCriar } },
    async (req, reply) => reply.status(201).send(await svc.criar(atorDe(req), req.body)));
  app.patch('/:id', { preHandler: pre, schema: { tags, summary: 'Editar (fonte, motivo, scorecard)', params: paramId, body: s.candidaturaAtualizar } },
    async (req) => svc.atualizar(atorDe(req), req.params.id, req.body));
  app.post('/:id/mover', { preHandler: pre, schema: { tags, summary: 'Mover de etapa no funil', params: paramId, body: s.mover } },
    async (req) => svc.mover(atorDe(req), req.params.id, req.body));
  app.get('/:id/eventos', { preHandler: pre, schema: { tags, summary: 'Linha do tempo da candidatura', params: paramId } },
    async (req) => svc.eventos(req.params.id));
  app.delete('/:id', { preHandler: pre, schema: { tags, summary: 'Excluir', params: paramId } },
    async (req, reply) => { await svc.excluir(atorDe(req), req.params.id); return reply.status(204).send(); });
};
