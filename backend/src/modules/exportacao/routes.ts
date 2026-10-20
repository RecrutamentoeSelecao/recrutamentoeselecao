import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { SO_ADMIN, atorDe, permitir } from '../../shared/auth/rbac.js';
import { RECURSOS, exportar } from './service.js';

/** Download real de CSV. Somente ADMIN, como no legado; cada exportação vai para o audit log. */
export const exportacaoRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/:recurso.csv', {
    preHandler: permitir(...SO_ADMIN),
    schema: { tags: ['Exportação'], summary: 'Baixar CSV (; e BOM, com colunas calculadas)', params: z.object({ recurso: z.enum(RECURSOS) }) },
  }, async (req, reply) => {
    const { csv, nomeArquivo } = await exportar(atorDe(req), req.params.recurso);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${nomeArquivo}"`)
      .header('Cache-Control', 'no-store')
      .send(csv);
  });
};
