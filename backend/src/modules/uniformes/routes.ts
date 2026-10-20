import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { DADOS_PESSOAIS, EQUIPE, atorDe, permitir } from '../../shared/auth/rbac.js';
import { paramId } from '../../shared/http/schemas.js';
import * as s from './schemas.js';
import * as svc from './service.js';

/** Uniformes têm CPF, nascimento e telefone: leitura restrita a ADMIN/RECRUTADOR (LGPD). */
export const uniformesRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Uniformes'];
  app.get('/', { preHandler: permitir(...DADOS_PESSOAIS), schema: { tags, summary: 'Listar uniformes', querystring: s.filtroUniformes } },
    async (req) => svc.listar(req.query));
  app.get('/folha', { preHandler: permitir(...DADOS_PESSOAIS), schema: { tags, summary: 'Folha em texto para impressão/fornecedor', querystring: s.filtroUniformes } },
    async (req, reply) => reply.type('text/plain; charset=utf-8').send(await svc.folhaImpressao(req.query)));
  app.get('/:id', { preHandler: permitir(...DADOS_PESSOAIS), schema: { tags, summary: 'Detalhe', params: paramId } },
    async (req) => svc.crud.apresentar(await svc.crud.obter(req.params.id)));
  app.post('/', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Novo uniforme (manual)', body: s.uniformeCriar } },
    async (req, reply) => reply.status(201).send(await svc.crud.criar(atorDe(req), req.body)));
  app.patch('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Editar (tamanhos, CPF, telefone...)', params: paramId, body: s.uniformeAtualizar } },
    async (req) => svc.crud.atualizar(atorDe(req), req.params.id, req.body));
  app.post('/:id/entregar', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Registrar entrega (padrão hoje)', params: paramId, body: s.entregar } },
    async (req) => svc.entregar(atorDe(req), req.params.id, req.body.data));
  app.delete('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Excluir', params: paramId } },
    async (req, reply) => { await svc.crud.excluir(atorDe(req), req.params.id); return reply.status(204).send(); });
};
