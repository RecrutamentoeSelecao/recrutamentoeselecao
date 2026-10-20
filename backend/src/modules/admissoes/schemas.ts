import { z } from 'zod';
import { paginacao, texto } from '../../shared/http/schemas.js';

export const filtroAdmissoes = paginacao.extend({
  filtro: z.enum(['pendentes', 'todas']).default('pendentes'),
  empresa: z.string().optional(), busca: z.string().max(100).optional(),
});
export const paramItem = z.object({ id: z.string().uuid(), ordem: z.coerce.number().int().min(1) });
export const itemDefinir = z.object({ resposta: z.enum(['SIM', 'NAO', 'NA']) });
export const admissaoAtualizar = z.object({ obs: texto(2000) });
