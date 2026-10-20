import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { SO_ADMIN, permitir } from '../../shared/auth/rbac.js';
import { paginacao } from '../../shared/http/schemas.js';
import { prisma } from '../../shared/prisma.js';

const filtro = paginacao.extend({
  entidade: z.string().max(60).optional(),
  entidadeId: z.string().max(80).optional(),
  usuarioId: z.string().uuid().optional(),
  acao: z.string().max(40).optional(),
  de: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
});

/** Consulta do audit log (quem / quando / o quê / antes / depois). Somente ADMIN. */
export const auditoriaRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/', { preHandler: permitir(...SO_ADMIN), schema: { tags: ['Auditoria'], summary: 'Consultar o audit log', querystring: filtro } },
    async (req) => {
      const q = req.query;
      const where = {
        entidade: q.entidade, entidadeId: q.entidadeId, usuarioId: q.usuarioId, acao: q.acao,
        ...(q.de || q.ate ? { em: { ...(q.de ? { gte: q.de } : {}), ...(q.ate ? { lte: q.ate } : {}) } } : {}),
      };
      const [total, itens] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({ where, orderBy: { em: 'desc' }, skip: (q.pagina - 1) * q.porPagina, take: q.porPagina }),
      ]);
      return { total, pagina: q.pagina, porPagina: q.porPagina, itens };
    });
};
