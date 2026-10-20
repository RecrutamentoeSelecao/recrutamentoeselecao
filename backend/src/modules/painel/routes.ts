import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { TODOS, atorDe, permitir } from '../../shared/auth/rbac.js';
import * as svc from './service.js';

const tipo = z.enum(['vaga', 'experiencia', 'contrato', 'integracao', 'uniforme', 'nota']);
const balde = z.enum(['atrasado', 'hoje', 'amanha', 'semana', 'quinze', 'depois']);
/** Aceita ?tipo=vaga&tipo=nota ou ?tipo=vaga */
const umOuVarios = <T extends z.ZodTypeAny>(e: T) =>
  z.union([e, z.array(e)]).optional().transform((v): z.infer<T>[] | undefined => (v == null ? undefined : Array.isArray(v) ? v : [v]));

export const painelRoutes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Painel e Calendário'];
  app.get('/', { preHandler: permitir(...TODOS), schema: { tags, summary: 'Indicadores: aging, TTF, % no SLA, SLA por etapa, por empresa, experiência' } },
    async (req) => svc.indicadores(atorDe(req)));
  app.get('/compromissos', {
    preHandler: permitir(...TODOS),
    schema: { tags, summary: 'Calendário: tudo que está pendente, com prazo e balde (atrasado/hoje/amanhã/semana/15 dias/depois)',
      querystring: z.object({
        tipo: umOuVarios(tipo),
        balde: umOuVarios(balde),
      }) },
  }, async (req) => svc.compromissos(atorDe(req), { tipos: req.query.tipo, baldes: req.query.balde }));
};
