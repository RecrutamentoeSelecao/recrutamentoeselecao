import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { EQUIPE, SO_ADMIN, TODOS, atorDe, permitir } from '../../shared/auth/rbac.js';
import { paramId } from '../../shared/http/schemas.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const vagasRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Vagas'];

  app.get('/', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Listar vagas com farol, SLA, TTF/TTH calculados', querystring: s.filtroVagas } },
    async (req) => svc.listar(atorDe(req), req.query));
  app.get('/:id', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Detalhe da vaga', params: paramId } },
    async (req) => svc.obter(atorDe(req), req.params.id));
  app.get('/:id/historico', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Histórico de etapas/status com carimbo de tempo', params: paramId } },
    async (req) => svc.historico(atorDe(req), req.params.id));
  app.post('/', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Nova vaga (código V0001…, abertura = hoje)', body: s.vagaCriar } },
    async (req, reply) => reply.status(201).send(await svc.criar(atorDe(req), req.body)));
  app.patch('/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Editar vaga (propaga para admissão/experiência/integração/contrato/uniforme)', params: paramId, body: s.vagaAtualizar } },
    async (req) => svc.atualizar(atorDe(req), req.params.id, req.body));
  app.put('/:id/etapas/:ordem', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Datar (ou limpar com null) uma etapa da régua', params: s.paramEtapa, body: s.etapaDefinir } },
    async (req) => svc.definirEtapa(atorDe(req), req.params.id, req.params.ordem, req.body.data));
  app.post('/:id/avancar', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Avançar etapa: data a próxima etapa pendente (padrão hoje)', params: paramId, body: s.avancar } },
    async (req) => svc.avancar(atorDe(req), req.params.id, req.body.data));
  app.post('/:id/aprovar', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Aprovar candidato: data a Aprovação e cria a admissão', params: paramId, body: s.aprovar } },
    async (req) => svc.aprovar(atorDe(req), req.params.id, req.body));
  app.put('/:id/status', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Mudar status (FECHADA também gera admissão)', params: paramId, body: s.statusDefinir } },
    async (req) => svc.atualizar(atorDe(req), req.params.id, { status: req.body.status }));
  app.delete('/:id', { preHandler: permitir(...SO_ADMIN), schema: { tags, summary: 'Excluir vaga (admissão vai junto; demais ficam sem vínculo)', params: paramId } },
    async (req, reply) => { await svc.excluir(atorDe(req), req.params.id); return reply.status(204).send(); });
};
