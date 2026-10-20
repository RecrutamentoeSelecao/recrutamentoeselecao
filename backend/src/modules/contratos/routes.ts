import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { EQUIPE, TODOS, atorDe, permitir } from '../../shared/auth/rbac.js';
import { paramId } from '../../shared/http/schemas.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const contratosRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Contratos de estágio (CIEE)'];
  app.get('/', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Listar contratos com prazo CIEE em dias úteis e indicadores', querystring: s.filtroContratos } },
    async (req) => svc.listar(req.query));
  app.get('/:id', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Detalhe', params: paramId } },
    async (req) => svc.crud.apresentar(await svc.crud.obter(req.params.id)));
  app.post('/', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Novo contrato (manual)', body: s.contratoCriar } },
    async (req, reply) => reply.status(201).send(await svc.crud.criar(atorDe(req), req.body)));
  app.patch('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Editar', params: paramId, body: s.contratoAtualizar } },
    async (req) => svc.crud.atualizar(atorDe(req), req.params.id, req.body));
  app.post('/:id/retorno', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Registrar retorno do CIEE (padrão hoje)', params: paramId, body: s.dataAcao } },
    async (req) => svc.registrarRetorno(atorDe(req), req.params.id, req.body.data));
  app.post('/:id/assinatura', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Registrar assinatura (padrão hoje)', params: paramId, body: s.dataAcao } },
    async (req) => svc.registrarAssinatura(atorDe(req), req.params.id, req.body.data));
  app.delete('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Excluir', params: paramId } },
    async (req, reply) => { await svc.crud.excluir(atorDe(req), req.params.id); return reply.status(204).send(); });
};
