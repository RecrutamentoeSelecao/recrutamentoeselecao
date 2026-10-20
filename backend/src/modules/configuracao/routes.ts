import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { EQUIPE, SO_ADMIN, TODOS, atorDe, permitir } from '../../shared/auth/rbac.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const configuracaoRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Configuração'];

  app.get('/parametros', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Parâmetros e régua de SLA' } },
    async () => svc.obterParametros());
  app.put('/parametros', { preHandler: permitir(...SO_ADMIN), schema: { tags, summary: 'Atualizar parâmetros (parcial)', body: s.parametrosAtualizar } },
    async (req) => svc.atualizarParametros(atorDe(req), req.body));
  app.put('/regua', { preHandler: permitir(...SO_ADMIN), schema: { tags, summary: 'Substituir a régua de etapas/SLA', body: s.reguaAtualizar } },
    async (req) => svc.atualizarRegua(atorDe(req), req.body.etapas));

  app.get('/feriados', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Feriados (dias úteis)' } },
    async () => svc.listarFeriados());
  app.post('/feriados', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Cadastrar feriado', body: s.feriadoCriar } },
    async (req, reply) => reply.status(201).send(await svc.criarFeriado(atorDe(req), req.body.data, req.body.descricao)));
  app.delete('/feriados/:data', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Remover feriado', params: s.paramData } },
    async (req, reply) => { await svc.excluirFeriado(atorDe(req), req.params.data); return reply.status(204).send(); });

  app.get('/listas', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Todas as listas da Base' } },
    async () => svc.listarListas());
  app.get('/listas/:lista', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Uma lista da Base', params: s.paramLista } },
    async (req) => (await svc.listarListas(req.params.lista))[req.params.lista] ?? []);
  app.post('/listas/:lista', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Incluir item na lista', params: s.paramLista, body: s.itemListaCriar } },
    async (req, reply) => reply.status(201).send(await svc.criarItemLista(atorDe(req), req.params.lista, req.body)));
  app.patch('/listas/:lista/:id', { preHandler: permitir(...EQUIPE), schema: { tags, summary: 'Renomear/reordenar item (renomear propaga aos registros)', params: s.paramItemLista, body: s.itemListaAtualizar } },
    async (req) => svc.atualizarItemLista(atorDe(req), req.params.lista, req.params.id, req.body));
  app.delete('/listas/:lista/:id', { preHandler: permitir(...SO_ADMIN), schema: { tags, summary: 'Remover item da lista', params: s.paramItemLista } },
    async (req, reply) => { await svc.excluirItemLista(atorDe(req), req.params.lista, req.params.id); return reply.status(204).send(); });
};
