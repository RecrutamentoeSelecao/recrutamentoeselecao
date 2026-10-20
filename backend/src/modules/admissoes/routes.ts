import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { EQUIPE, SO_ADMIN, TODOS, atorDe, permitir } from '../../shared/auth/rbac.js';
import { paramId } from '../../shared/http/schemas.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const admissoesRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Admissão'];
  app.get('/', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Listar admissões com % do checklist e situação', querystring: s.filtroAdmissoes } },
    async (req) => svc.listar(req.query));
  app.post('/lancar', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Lançar: varre as vagas aprovadas/fechadas e cria o que faltar' } },
    async (req) => svc.lancar(atorDe(req)));
  app.get('/:id', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Detalhe', params: paramId } },
    async (req) => svc.obter(req.params.id));
  app.patch('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Editar observação', params: paramId, body: s.admissaoAtualizar } },
    async (req) => svc.atualizarObs(atorDe(req), req.params.id, req.body.obs));
  app.put('/:id/itens/:ordem', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Responder item do checklist (SIM/NAO/NA)', params: s.paramItem, body: s.itemDefinir } },
    async (req) => svc.definirItem(atorDe(req), req.params.id, req.params.ordem, req.body.resposta));
  app.post('/:id/itens/:ordem/alternar', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Alternar NÃO → SIM → N/A', params: s.paramItem } },
    async (req) => svc.alternarItem(atorDe(req), req.params.id, req.params.ordem));
  app.post('/:id/concluir', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Concluir checklist → cria a experiência', params: paramId } },
    async (req) => svc.concluir(atorDe(req), req.params.id));
  app.delete('/:id', { preHandler: permitir(...SO_ADMIN), schema: { tags, summary: 'Excluir', params: paramId } },
    async (req, reply) => { await svc.excluir(atorDe(req), req.params.id); return reply.status(204).send(); });
};
