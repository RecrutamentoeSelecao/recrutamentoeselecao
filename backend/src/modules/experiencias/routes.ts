import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { EQUIPE, TODOS, atorDe, permitir } from '../../shared/auth/rbac.js';
import { paramId } from '../../shared/http/schemas.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const experienciasRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Experiência'];
  const decide = permitir('ADMIN', 'RECRUTADOR', 'GESTOR');
  app.get('/', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Listar com prazos 45/90, marcos e indicadores', querystring: s.filtroExperiencias } },
    async (req) => svc.listar(atorDe(req), req.query));
  app.get('/:id', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Detalhe com cálculo', params: paramId } },
    async (req) => svc.obter(atorDe(req), req.params.id));
  app.post('/', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Novo colaborador (manual, sem vaga)', body: s.experienciaCriar } },
    async (req, reply) => reply.status(201).send(await svc.criar(atorDe(req), req.body)));
  app.patch('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Editar (mudar admissão recalcula os limites)', params: paramId, body: s.experienciaAtualizar } },
    async (req) => svc.atualizar(atorDe(req), req.params.id, req.body));
  app.post('/:id/decisao', { preHandler: decide, schema: { tags, summary: 'Registrar decisão de prorrogação (45) ou efetivação (90)', params: paramId, body: s.decisao } },
    async (req) => svc.decidir(atorDe(req), req.params.id, req.body));
  app.get('/:id/avaliacoes', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Avaliações registradas', params: paramId } },
    async (req) => svc.listarAvaliacoes(atorDe(req), req.params.id));
  app.post('/:id/avaliacoes', { preHandler: decide, schema: { tags, summary: 'Registrar avaliação de experiência (formulário 45/90)', params: paramId, body: s.avaliacaoCriar } },
    async (req, reply) => reply.status(201).send(await svc.avaliar(atorDe(req), req.params.id, req.body)));
  app.delete('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Excluir', params: paramId } },
    async (req, reply) => { await svc.crud.excluir(atorDe(req), req.params.id); return reply.status(204).send(); });
};
