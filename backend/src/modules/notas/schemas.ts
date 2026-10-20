import { z } from 'zod';
import { dataISO, paginacao } from '../../shared/http/schemas.js';

export const notaCriar = z.object({
  texto: z.string().trim().min(1).max(400),
  vagaId: z.string().uuid().nullable().optional(),
  quando: dataISO.nullable().optional(),
});
export const notaAtualizar = notaCriar.partial().extend({ feito: z.boolean().optional() });
export const filtroNotas = paginacao.extend({
  filtro: z.enum(['pendentes', 'todas']).default('pendentes'),
  vagaId: z.string().uuid().optional(),
});
