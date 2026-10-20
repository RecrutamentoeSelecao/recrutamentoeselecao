import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { DADOS_PESSOAIS, SO_ADMIN, atorDe, permitir } from '../../shared/auth/rbac.js';
import { paramId } from '../../shared/http/schemas.js';
import * as s from './schemas.js';
import * as svc from './service.js';

export const candidatosRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Candidatos (LGPD)'];
  const pre = permitir(...DADOS_PESSOAIS);
  app.get('/', { preHandler: pre, schema: { tags, summary: 'Listar candidatos (anonimizados ficam de fora por padrão)', querystring: s.filtroCandidatos } },
    async (req) => svc.listar(req.query));
  app.post('/expurgo', { preHandler: permitir(...SO_ADMIN), schema: { tags, summary: 'Rotina de expurgo LGPD (retenção vencida / consentimento revogado)', querystring: z.object({ simular: z.coerce.boolean().default(true) }) } },
    async (req) => svc.expurgar(atorDe(req), req.query.simular));
  app.get('/:id', { preHandler: pre, schema: { tags, summary: 'Detalhe', params: paramId } }, async (req) => svc.obter(req.params.id));
  app.post('/', { preHandler: pre, schema: { tags, summary: 'Cadastrar candidato (com base legal e consentimento; deduplica por CPF/e-mail)', body: s.candidatoCriar } },
    async (req, reply) => reply.status(201).send(await svc.criar(atorDe(req), req.body)));
  app.patch('/:id', { preHandler: pre, schema: { tags, summary: 'Editar', params: paramId, body: s.candidatoAtualizar } },
    async (req) => svc.atualizar(atorDe(req), req.params.id, req.body));
  app.post('/:id/consentimento', { preHandler: pre, schema: { tags, summary: 'Registrar consentimento (versão do termo)', params: paramId, body: s.consentimento } },
    async (req) => svc.registrarConsentimento(atorDe(req), req.params.id, req.body.versao));
  app.post('/:id/consentimento/revogar', { preHandler: pre, schema: { tags, summary: 'Revogar consentimento', params: paramId } },
    async (req) => svc.revogarConsentimento(atorDe(req), req.params.id));
  app.get('/:id/dados-pessoais', { preHandler: pre, schema: { tags, summary: 'Exportar dados do titular (LGPD art. 18)', params: paramId } },
    async (req, reply) => reply.header('Content-Disposition', `attachment; filename="titular-${req.params.id}.json"`).send(await svc.exportarDadosTitular(atorDe(req), req.params.id)));
  app.post('/:id/anonimizar', { preHandler: permitir(...SO_ADMIN), schema: { tags, summary: 'Anonimizar titular (irreversível; expurga o audit log do registro)', params: paramId } },
    async (req) => svc.anonimizar(atorDe(req), req.params.id));
  app.delete('/:id', { preHandler: permitir(...SO_ADMIN), schema: { tags, summary: 'Eliminar titular (exclusão física)', params: paramId } },
    async (req, reply) => { await svc.excluir(atorDe(req), req.params.id); return reply.status(204).send(); });
};
