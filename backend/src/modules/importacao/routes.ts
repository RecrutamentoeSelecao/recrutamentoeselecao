import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { SO_ADMIN, atorDe, permitir } from '../../shared/auth/rbac.js';
import { importarLegado } from './service.js';

export const importacaoRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/legado', {
    preHandler: permitir(...SO_ADMIN),
    schema: {
      tags: ['Importação'],
      summary: 'Migrar o dados.json / localStorage / pacote do sistema antigo (idempotente, upsert por código)',
      description: 'Envie em `dados` o JSON do dados.json (ou do localStorage "fagron-rs-html"), em claro ou cifrado (cofre), '
        + 'ou o texto do bloco "PACOTE R&S FAGRON". Se estiver cifrado, informe `senha`. Use `simular=true` para ver o resumo e os avisos sem gravar.',
      body: z.object({ dados: z.union([z.record(z.string(), z.unknown()), z.string()]), senha: z.string().max(200).optional(), simular: z.boolean().default(true) }),
    },
  }, async (req) => importarLegado(atorDe(req), req.body.dados, { senha: req.body.senha, simular: req.body.simular }));
};
